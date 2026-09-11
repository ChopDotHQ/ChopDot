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
const screenshots = [];
const browserErrors = [];
const consoleErrors = [];
const externalRequests = [];
const browser = await chromium.launch({headless: true});

function observePage(page, viewportName, suffix = '') {
  const label = suffix ? `${viewportName}/${suffix}` : viewportName;
  page.on('pageerror', error => browserErrors.push({viewport: label, message: String(error)}));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({viewport: label, message: message.text()});
  });
  page.on('request', request => {
    if (/^https?:/iu.test(request.url())) externalRequests.push({viewport: label, url: request.url()});
  });
}

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

async function waitForNetworkRejected(page) {
  await page.waitForFunction(() => {
    const screen = document.querySelector('#switch-rejected');
    const title = screen?.querySelector('.hero')?.textContent ?? '';
    const accountReview = screen?.querySelector('a[href="#switch-account-review"]');
    const networkReview = screen?.querySelector('a[href="#switch-network-review"]');
    const returnLink = screen?.querySelector('a[href="#network-mismatch-handoff"]');
    return new URLSearchParams(location.search).get('switch') === 'network'
      && title.includes('Network switch was not approved')
      && accountReview?.getClientRects().length === 0
      && networkReview?.classList.contains('primary')
      && !!returnLink;
  });
}

async function waitForAccountRejected(page) {
  await page.waitForFunction(() => {
    const screen = document.querySelector('#switch-rejected');
    const title = screen?.querySelector('.hero')?.textContent ?? '';
    const accountReview = screen?.querySelector('a[href="#switch-account-review"]');
    const returnLink = screen?.querySelector('a[href="#switch-rejected-handoff"]');
    return new URLSearchParams(location.search).get('switch') === 'account'
      && title.includes('Wallet switch was not approved')
      && accountReview?.getClientRects().length > 0
      && !!returnLink;
  });
}

async function assertNetworkRejected(page, label, screenshotName = null) {
  await waitForNetworkRejected(page);
  const rejected = page.locator('#switch-rejected');
  const text = (await rejected.innerText()).replace(/\s+/gu, ' ');
  const origin = await page.evaluate(() => new URLSearchParams(location.search).get('switch'));
  if (origin !== 'network') errors.push(`${label}: deterministic URL state lost network origin`);
  if (!text.includes('Network switch was not approved')) errors.push(`${label}: network rejection did not identify the rejected network switch`);
  if (!text.includes('Other network') || !text.includes('Polkadot')) errors.push(`${label}: network rejection lost current/required network truth`);
  if (await rejected.locator('a[href="#switch-account-review"]:visible').count()) errors.push(`${label}: network rejection exposes an account-switch route that assumes compatible network state`);
  if (!(await rejected.locator('a[href="#switch-network-review"].primary').isVisible())) errors.push(`${label}: network rejection does not keep network recovery as the primary retry`);
  const returnLink = rejected.locator('a[href="#network-mismatch-handoff"]');
  if (!(await returnLink.isVisible())) errors.push(`${label}: network rejection does not return to the explicit network-mismatch handoff`);
  const bypass = await rejected.locator('a[href="#connected"], a[href="#action-review"], a[href="#action-review-switched"], a[href="#signature-pending"], a[href="#signature-pending-switched"], a[href="#signed"], a[href="#submission-pending"]').count();
  if (bypass !== 0) errors.push(`${label}: rejected network state exposes ${bypass} execution bypass route(s)`);
  if (screenshotName) {
    const relative = `screenshots/${screenshotName}`;
    await page.screenshot({path: path.join(evidenceRoot, relative), fullPage: false});
    screenshots.push(relative);
  }
  return returnLink;
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}});
    const page = await context.newPage();
    observePage(page, viewport.name);

    // Reviewer regression: rejected network switch must preserve the mismatched origin in explicit URL state.
    await page.goto(`${fileUrl}#wrong-network`, {waitUntil: 'load'});
    const pathOk = await clickHash(page, '#switch-network-review', `${viewport.name}/network reject`)
      && await clickHash(page, '#switch-pending', `${viewport.name}/network reject`)
      && await clickHash(page, '#switch-rejected', `${viewport.name}/network reject`);
    if (pathOk) {
      const returnLink = await assertNetworkRejected(page, `${viewport.name}/same-runtime`, `switch-rejected-network-origin-${viewport.name}.png`);
      const rejectedUrl = page.url();
      if (!rejectedUrl.includes('?switch=network') || !rejectedUrl.endsWith('#switch-rejected')) errors.push(`${viewport.name}: rejected network state is not encoded in reload-stable URL state`);
      results.push({viewport: viewport.name, path: 'network-switch-rejected-origin-in-url', finalUrl: rejectedUrl});

      // Persistence boundary 1: reload the exact rejected-network state in-place.
      await page.reload({waitUntil: 'load'});
      await assertNetworkRejected(page, `${viewport.name}/reload`, `switch-rejected-network-reload-${viewport.name}.png`);
      results.push({viewport: viewport.name, path: 'network-switch-rejected-reload-preserves-mismatch', finalUrl: page.url()});

      // Persistence boundary 2: restore/direct-load the exact URL in a fresh browser context.
      const freshContext = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}});
      const freshPage = await freshContext.newPage();
      observePage(freshPage, viewport.name, 'fresh-context');
      await freshPage.goto(rejectedUrl, {waitUntil: 'load'});
      await assertNetworkRejected(freshPage, `${viewport.name}/fresh-context`, `switch-rejected-network-fresh-context-${viewport.name}.png`);
      const freshVisible = await freshPage.locator('.screen:visible').count();
      if (freshVisible !== 1) errors.push(`${viewport.name}/fresh-context: expected one visible restored state, got ${freshVisible}`);
      results.push({viewport: viewport.name, path: 'network-switch-rejected-fresh-context-direct-load-preserves-mismatch', finalUrl: freshPage.url()});
      await freshContext.close();

      // Same exact state must return to the mismatch boundary without any execution bypass.
      if (await returnLink.isVisible()) {
        await returnLink.click();
        await page.waitForFunction(() => location.hash === '#network-mismatch-handoff');
      }
      const handoffText = (await page.locator('.screen:visible').innerText()).replace(/\s+/gu, ' ');
      if (!handoffText.includes('Other network') || !handoffText.includes('Required network Polkadot')) errors.push(`${viewport.name}: rejected network return rewrote the unchanged mismatched network`);
      const handoffBypass = await page.locator('.screen:visible a[href="#connected"], .screen:visible a[href="#action-review"], .screen:visible a[href="#action-review-switched"], .screen:visible a[href="#signature-pending"], .screen:visible a[href="#signature-pending-switched"], .screen:visible a[href="#signed"], .screen:visible a[href="#submission-pending"]').count();
      if (handoffBypass !== 0) errors.push(`${viewport.name}: rejected network return exposes ${handoffBypass} execution bypass route(s)`);
      results.push({viewport: viewport.name, path: 'network-switch-rejected-return-preserves-mismatch', finalHash: await page.evaluate(() => location.hash)});
    }

    // The persisted network origin must survive an unknown result that later reconciles to rejected.
    await page.goto(`${fileUrl}#wrong-network`, {waitUntil: 'load'});
    const unknownOk = await clickHash(page, '#switch-network-review', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-pending', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-unknown', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-reconciling', `${viewport.name}/network reconcile reject`)
      && await clickHash(page, '#switch-rejected', `${viewport.name}/network reconcile reject`);
    if (unknownOk) {
      await assertNetworkRejected(page, `${viewport.name}/reconciled-network-reject`);
      const origin = await page.evaluate(() => new URLSearchParams(location.search).get('switch'));
      if (origin !== 'network') errors.push(`${viewport.name}: reconciled rejected network switch lost its persisted origin`);
      results.push({viewport: viewport.name, path: 'network-switch-unknown-reconciled-rejected-keeps-origin', finalUrl: page.url()});
    }

    // Account rejection must keep the already-valid prior Polkadot session and must overwrite any stale network-origin URL state.
    await page.goto(`${fileUrl}#connected`, {waitUntil: 'load'});
    const accountOk = await clickHash(page, '#switch-account-review', `${viewport.name}/account reject`)
      && await clickHash(page, '#switch-pending', `${viewport.name}/account reject`)
      && await clickHash(page, '#switch-rejected', `${viewport.name}/account reject`);
    if (accountOk) {
      await waitForAccountRejected(page);
      const origin = await page.evaluate(() => new URLSearchParams(location.search).get('switch'));
      if (origin !== 'account') errors.push(`${viewport.name}: account switch did not establish its own deterministic origin state`);
      const handoffOk = await clickHash(page, '#switch-rejected-handoff', `${viewport.name}/account reject`);
      if (handoffOk) {
        const text = (await page.locator('.screen:visible').innerText()).replace(/\s+/gu, ' ');
        if (!text.includes('5F3sa2…Demo9') || !text.includes('Polkadot') || !text.includes('Connected · unchanged')) errors.push(`${viewport.name}: account rejection no longer preserves the prior trusted Polkadot session`);
        results.push({viewport: viewport.name, path: 'account-switch-rejected-preserves-valid-session', finalUrl: page.url()});
      }
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
  schema: 'chopdot.j21-network-rejection-origin.v2',
  generated_at: new Date().toISOString(),
  candidate: {branch, head, tree, path: path.relative(repoRoot, candidatePath), sha256: candidateSha256},
  scope: 'Reviewer-directed bounded repair only: persist account-vs-network switch origin in deterministic URL state so rejected-network truth survives same-runtime navigation, unknown-result reconciliation, reload, and fresh-context direct restoration.',
  viewports,
  paths: results,
  screenshots,
  browser_errors: browserErrors,
  console_errors: consoleErrors,
  external_requests: externalRequests,
  errors,
  review_status: errors.length ? 'MECHANICAL_QA_FAILED' : 'BOUNDED_REVIEWER_REPAIR_QA_PASSED',
  limitations: [
    'This is Builder mechanical evidence for the exact rejected-network-origin defect only; it does not provide independent UX review or human approval.',
    'Disconnect, offline, loading, and load/provider-error coverage remain outside this repair.',
    'The switch-origin query value is synthetic prototype continuity state only; it carries no wallet credential, address, secret, payment authority, or finality claim.',
    'No real wallet/provider, signature, transaction, funds, or chain is used; all states are synthetic prototype evidence.',
  ],
};
await writeFile(path.join(evidenceRoot, 'NETWORK_REJECTION_ORIGIN_QA.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({head, candidateSha256, paths: results.length, screenshots: screenshots.length, failures: errors.length}, null, 2));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
