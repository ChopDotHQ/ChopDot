#!/usr/bin/env node

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const journeyRoot = path.resolve(here, '..');
const repoRoot = path.resolve(journeyRoot, '../../../..');
const candidatePath = path.join(journeyRoot, 'v1-candidate.html');
const evidenceRoot = path.resolve(repoRoot, 'artifacts/j21-v1-review');
const screenshotRoot = path.join(evidenceRoot, 'screenshots');
await mkdir(screenshotRoot, {recursive: true});

const html = await readFile(candidatePath, 'utf8');
const candidateSha256 = createHash('sha256').update(html).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: repoRoot, encoding: 'utf8'}).trim();
const head = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const branch = process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD');
const fileUrl = pathToFileURL(candidatePath).href;
const viewports = [
  {width: 393, height: 852, name: '393x852'},
  {width: 430, height: 890, name: '430x890'},
];
const errors = [];
const results = [];
const browserErrors = [];
const consoleErrors = [];
const externalRequests = [];
const browser = await chromium.launch({headless: true});

async function clickHash(page, target, label) {
  const link = page.locator(`.screen:visible a[href="${target}"]`).first();
  if (!(await link.isVisible())) {
    errors.push(`${label}: cannot reach ${target}`);
    return false;
  }
  await link.click();
  await page.waitForFunction(expected => location.hash === expected, target);
  return true;
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}});
    const page = await context.newPage();
    page.on('pageerror', error => browserErrors.push({viewport: viewport.name, message: String(error)}));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push({viewport: viewport.name, message: message.text()});
    });
    page.on('request', request => {
      if (/^https?:/iu.test(request.url())) externalRequests.push({viewport: viewport.name, url: request.url()});
    });

    // Reviewer regression: rejected network switch must preserve the mismatched origin.
    await page.goto(`${fileUrl}#wrong-network`, {waitUntil: 'load'});
    const pathOk = await clickHash(page, '#switch-network-review', `${viewport.name}/network reject`)
      && await clickHash(page, '#switch-pending', `${viewport.name}/network reject`)
      && await clickHash(page, '#switch-rejected', `${viewport.name}/network reject`);
    if (pathOk) {
      const rejected = page.locator('#switch-rejected');
      const text = (await rejected.innerText()).replace(/\s+/gu, ' ');
      if (!text.includes('Network switch was not approved')) errors.push(`${viewport.name}: network rejection did not identify the rejected network switch`);
      if (!text.includes('Other network') || !text.includes('Polkadot')) errors.push(`${viewport.name}: network rejection lost current/required network truth`);
      if (await rejected.locator('a[href="#switch-account-review"]:visible').count()) errors.push(`${viewport.name}: network rejection exposes an account-switch route that assumes compatible network state`);
      if (!(await rejected.locator('a[href="#switch-network-review"].primary').isVisible())) errors.push(`${viewport.name}: network rejection does not keep network recovery as the primary retry`);
      const returnLink = rejected.locator('a[href="#network-mismatch-handoff"]');
      if (!(await returnLink.isVisible())) errors.push(`${viewport.name}: network rejection does not return to the explicit network-mismatch handoff`);
      await page.screenshot({path: path.join(screenshotRoot, `switch-rejected-network-origin-${viewport.name}.png`), fullPage: false});
      if (await returnLink.isVisible()) {
        await returnLink.click();
        await page.waitForFunction(() => location.hash === '#network-mismatch-handoff');
      }
      const handoffText = (await page.locator('.screen:visible').innerText()).replace(/\s+/gu, ' ');
      if (!handoffText.includes('Other network') || !handoffText.includes('Required network Polkadot')) errors.push(`${viewport.name}: rejected network return rewrote the unchanged mismatched network`);
      const bypass = await page.locator('.screen:visible a[href="#connected"], .screen:visible a[href="#action-review"], .screen:visible a[href="#action-review-switched"], .screen:visible a[href="#signature-pending"], .screen:visible a[href="#signature-pending-switched"], .screen:visible a[href="#signed"], .screen:visible a[href="#submission-pending"]').count();
      if (bypass !== 0) errors.push(`${viewport.name}: rejected network return exposes ${bypass} execution bypass route(s)`);
      results.push({viewport: viewport.name, path: 'network-switch-rejected-return-preserves-mismatch', finalHash: await page.evaluate(() => location.hash)});
    }

    // The same origin must survive an unknown result that later reconciles to rejected.
    await page.goto(`${fileUrl}#wrong-network`, {waitUntil: 'load'});
    const unknownOk = await clickHash(page, '#switch-network-review', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-pending', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-unknown', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-reconciling', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-rejected', `${viewport.name}/network reconcile reject`);
    if (unknownOk) {
      const returnLink = page.locator('.screen:visible a[href="#network-mismatch-handoff"]');
      if (!(await returnLink.isVisible())) errors.push(`${viewport.name}: reconciled rejected network switch lost its origin-specific mismatch return`);
      results.push({viewport: viewport.name, path: 'network-switch-unknown-reconciled-rejected-keeps-origin', finalHash: await page.evaluate(() => location.hash)});
    }

    // Account rejection must keep the already-valid prior Polkadot session.
    await page.goto(`${fileUrl}#connected`, {waitUntil: 'load'});
    const accountOk = await clickHash(page, '#switch-account-review', `${viewport.name}/account reject`)
      && await clickHash(page, '#switch-pending', `${viewport.name}/account reject`)
      && await clickHash(page, '#switch-rejected', `${viewport.name}/account reject`)
      && await clickHash(page, '#switch-rejected-handoff', `${viewport.name}/account reject`);
    if (accountOk) {
      const text = (await page.locator('.screen:visible').innerText()).replace(/\s+/gu, ' ');
      if (!text.includes('5F3sa2…Demo9') || !text.includes('Polkadot') || !text.includes('Connected · unchanged')) errors.push(`${viewport.name}: account rejection no longer preserves the prior trusted Polkadot session`);
      results.push({viewport: viewport.name, path: 'account-switch-rejected-preserves-valid-session', finalHash: await page.evaluate(() => location.hash)});
    }

    await context.close();
  }
} finally {
  await browser.close();
}

errors.push(...browserErrors.map(entry => `${entry.viewport}: page error: ${entry.message}`));
errors.push(...consoleErrors.map(entry => `${entry.viewport}: console error: ${entry.message}`));
if (externalRequests.length) errors.push(`Unexpected external runtime requests: ${externalRequests.map(entry => entry.url).join(', ')}`);

const summary = {
  schema: 'chopdot.j21-network-rejection-origin.v1',
  generated_at: new Date().toISOString(),
  candidate: {branch, head, tree, path: path.relative(repoRoot, candidatePath), sha256: candidateSha256},
  scope: 'Reviewer-directed bounded repair only: preserve account-vs-network switch origin when a provider rejection is returned, including rejection discovered after unknown-result reconciliation.',
  viewports,
  paths: results,
  screenshots: viewports.map(viewport => `screenshots/switch-rejected-network-origin-${viewport.name}.png`),
  browser_errors: browserErrors,
  console_errors: consoleErrors,
  external_requests: externalRequests,
  errors,
  review_status: errors.length ? 'MECHANICAL_QA_FAILED' : 'BOUNDED_REVIEWER_REPAIR_QA_PASSED',
  limitations: [
    'This is Builder mechanical evidence for the exact rejected-network-origin defect only; it does not provide independent UX review or human approval.',
    'Disconnect, offline, loading, and load/provider-error coverage remain outside this repair.',
    'No real wallet/provider, signature, transaction, funds, or chain is used; all states are synthetic prototype evidence.',
  ],
};
await writeFile(path.join(evidenceRoot, 'NETWORK_REJECTION_ORIGIN_QA.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({head, candidateSha256, paths: results.length, failures: errors.length}, null, 2));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
