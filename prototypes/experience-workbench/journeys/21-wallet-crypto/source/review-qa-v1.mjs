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

const states = [
  'handoff',
  'chooser',
  'wallet-unavailable',
  'connect-pending',
  'connect-timeout',
  'connect-reconciling',
  'connected',
  'wrong-network',
  'connect-rejected',
  'cancelled',
  'action-review',
  'stale-review',
  'signature-pending',
  'signature-rejected',
  'signature-unknown',
  'signed',
  'submission-pending',
  'submission-unknown',
  'submission-reconciling',
  'settlement-unknown-handoff',
  'finalized',
  'result-handoff',
  'reverted',
];
const viewports = [
  {width: 393, height: 852, name: '393x852'},
  {width: 430, height: 890, name: '430x890'},
];

const expectedSemantics = {
  'handoff': ['Connect a wallet to continue', 'No payment has been sent', '12.50 DOT', 'Polkadot'],
  'wallet-unavailable': ['No supported wallet is available', 'settlement is still unchanged', 'No connection, signature, or payment was created'],
  'connect-timeout': ['connection result is not known yet', 'Do not start a second connection prompt yet', 'Check the existing wallet/session result first'],
  'connect-reconciling': ['Checking the existing wallet session', 'cannot sign, submit, or move money', 'trusted provider/session result'],
  'connected': ['Wallet connected', 'not added to Payment Methods', 'not authorized or sent'],
  'action-review': ['Check exactly what you will sign', '12.50 DOT', 'Maya', '5F3sa2…Demo9', 'Polkadot', 'revalidated'],
  'stale-review': ['Review expired', 'will not request a signature', 'settlement itself is unchanged'],
  'signature-pending': ['Approve this exact action in your wallet', 'Nothing has been submitted'],
  'signature-rejected': ['Nothing was signed or sent', 'no transaction'],
  'signature-unknown': ['Do not approve it again yet', 'Check the original wallet result first'],
  'signed': ['Signature received', 'not network confirmation', 'Signed ≠ submitted ≠ final'],
  'submission-pending': ['Submitted — waiting for the network', 'waiting for finality', 'Do not start another payment'],
  'submission-unknown': ['network result is not known yet', 'original transaction', 'same transaction', 'Retry stays blocked', '0xdemo…21'],
  'submission-reconciling': ['Checking the original transaction', '0xdemo…21', 'cannot create, replace, or retry', 'trusted result'],
  'settlement-unknown-handoff': ['Complete Settlement', 'Still checking the payment', '12.50 DOT', 'Maya', '0xdemo…21', 'Still checking', 'Starting another payment remains blocked'],
  'finalized': ['Network finality verified', 'hands this verified fact back', 'not a new ChopDot balance calculation', 'Hand result to Complete Settlement'],
  'result-handoff': ['Complete Settlement', 'Network result received', '12.50 DOT', 'Maya', '0xdemo…21', 'verified network fact only', 'does not itself recalculate'],
  'reverted': ['transaction did not complete', 'verified failure', 'settlement stays open'],
};

const errors = [];
const pages = [];
const browserErrors = [];
const consoleErrors = [];
const externalRequests = [];
const interactionResults = [];
const browser = await chromium.launch({headless: true});

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}});
    const page = await context.newPage();
    page.on('pageerror', error => browserErrors.push({viewport: viewport.name, message: String(error)}));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push({viewport: viewport.name, message: message.text()});
    });
    page.on('request', request => {
      const url = request.url();
      if (/^https?:/iu.test(url)) externalRequests.push({viewport: viewport.name, url});
    });

    for (const state of states) {
      const url = `${pathToFileURL(candidatePath).href}#${state}`;
      await page.goto(url, {waitUntil: 'load'});
      const active = page.locator(`#${state}`);
      if (!(await active.isVisible())) errors.push(`${viewport.name}/${state}: target screen is not visible`);

      const visibleScreens = await page.locator('.screen:visible').count();
      if (visibleScreens !== 1) errors.push(`${viewport.name}/${state}: expected exactly one visible screen, got ${visibleScreens}`);

      const metrics = await page.evaluate(stateId => {
        const screen = document.getElementById(stateId);
        const content = screen?.querySelector('.content');
        const primary = screen?.querySelector('.btn.primary');
        const actionable = [...(screen?.querySelectorAll('a.btn, a.row, button') ?? [])];
        const minTarget = actionable.length ? Math.min(...actionable.map(node => node.getBoundingClientRect().height)) : null;
        const anchors = [...(screen?.querySelectorAll('a[href^="#"]') ?? [])].map(node => node.getAttribute('href'));
        return {
          bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          screenOverflow: screen ? screen.scrollWidth - screen.clientWidth : null,
          contentOverflow: content ? content.scrollWidth - content.clientWidth : null,
          contentScrollable: content ? content.scrollHeight > content.clientHeight : false,
          primaryCount: screen?.querySelectorAll('.btn.primary').length ?? 0,
          chooserRowCount: screen?.querySelectorAll('a.row').length ?? 0,
          primaryHeight: primary?.getBoundingClientRect().height ?? null,
          minTarget,
          anchors,
          text: screen?.textContent?.replace(/\s+/gu, ' ').trim() ?? '',
          secretInputs: [...(screen?.querySelectorAll('input,textarea') ?? [])].filter(node => /seed|private\s*key|password|secret|credential/iu.test(`${node.getAttribute('name') ?? ''} ${node.getAttribute('aria-label') ?? ''} ${node.getAttribute('placeholder') ?? ''}`)).length,
        };
      }, state);

      if ((metrics.bodyOverflow ?? 0) > 1 || (metrics.screenOverflow ?? 0) > 1 || (metrics.contentOverflow ?? 0) > 1) {
        errors.push(`${viewport.name}/${state}: horizontal overflow body=${metrics.bodyOverflow}, screen=${metrics.screenOverflow}, content=${metrics.contentOverflow}`);
      }
      if (state === 'chooser') {
        if (metrics.primaryCount !== 0 || metrics.chooserRowCount !== 2) errors.push(`${viewport.name}/${state}: expected two peer wallet choices and no artificial primary, got ${metrics.chooserRowCount} choices / ${metrics.primaryCount} primary`);
      } else if (metrics.primaryCount !== 1) {
        errors.push(`${viewport.name}/${state}: expected one primary action, got ${metrics.primaryCount}`);
      }
      if (metrics.primaryHeight !== null && metrics.primaryHeight < 44) errors.push(`${viewport.name}/${state}: primary touch target ${metrics.primaryHeight}px < 44px`);
      if (metrics.minTarget !== null && metrics.minTarget < 40) errors.push(`${viewport.name}/${state}: actionable target ${metrics.minTarget}px < 40px`);
      if (metrics.secretInputs !== 0) errors.push(`${viewport.name}/${state}: found secret-like input field`);
      for (const phrase of expectedSemantics[state] ?? []) {
        if (!metrics.text.toLowerCase().includes(phrase.toLowerCase())) errors.push(`${viewport.name}/${state}: missing semantic phrase “${phrase}”`);
      }
      for (const href of metrics.anchors) {
        if (!href) continue;
        const target = href.slice(1);
        if (!states.includes(target)) errors.push(`${viewport.name}/${state}: broken in-candidate route ${href}`);
      }

      if (state === 'wallet-unavailable') {
        if (!metrics.anchors.includes('#chooser') || !metrics.anchors.includes('#cancelled')) errors.push(`${viewport.name}/${state}: unavailable provider must allow redetection or safe return`);
        if (metrics.anchors.includes('#connect-pending') || metrics.anchors.includes('#connected')) errors.push(`${viewport.name}/${state}: unavailable provider must not fabricate a connection attempt/result`);
      }
      if (state === 'connect-timeout') {
        if (!metrics.anchors.includes('#connect-reconciling')) errors.push(`${viewport.name}/${state}: unknown connection must route through reconciliation before retry`);
        for (const forbidden of ['#chooser', '#connect-pending', '#connected']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: unknown connection must not route directly to ${forbidden}`);
        }
      }
      if (state === 'connect-reconciling') {
        for (const outcome of ['#connected', '#chooser', '#connect-timeout']) {
          if (!metrics.anchors.includes(outcome)) errors.push(`${viewport.name}/${state}: missing explicit connection recovery outcome ${outcome}`);
        }
      }
      if (state === 'submission-unknown') {
        for (const required of ['#submission-reconciling', '#settlement-unknown-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: missing required recovery route ${required}`);
        }
        for (const forbidden of ['#submission-pending', '#reverted', '#cancelled']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: unresolved result must not route directly to ${forbidden}`);
        }
      }
      if (state === 'submission-reconciling') {
        for (const outcome of ['#submission-pending', '#finalized', '#reverted', '#submission-unknown']) {
          if (!metrics.anchors.includes(outcome)) errors.push(`${viewport.name}/${state}: missing explicit same-transaction outcome ${outcome}`);
        }
      }
      if (state === 'settlement-unknown-handoff') {
        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: settlement handoff must not expose a new execution route`);
        if (/Status\s+Not sent/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: unresolved settlement was incorrectly converted to Not sent`);
      }

      await page.screenshot({path: path.join(screenshotRoot, `${state}-${viewport.name}.png`), fullPage: false});
      pages.push({state, viewport: viewport.name, ...metrics});
    }

    // Click the core paths so route validity is proven by interaction, not only direct hashes.
    const connectionPath = ['#handoff', '#chooser', '#connect-pending', '#connected', '#action-review'];
    await page.goto(`${pathToFileURL(candidatePath).href}${connectionPath[0]}`, {waitUntil: 'load'});
    for (const next of connectionPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: connection path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    interactionResults.push({viewport: viewport.name, path: 'connection-to-review', finalHash: await page.evaluate(() => location.hash)});

    const connectionRecoveryPath = ['#connect-timeout', '#connect-reconciling', '#connect-timeout'];
    await page.goto(`${pathToFileURL(candidatePath).href}${connectionRecoveryPath[0]}`, {waitUntil: 'load'});
    for (const next of connectionRecoveryPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: connection recovery path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    interactionResults.push({viewport: viewport.name, path: 'connect-unknown-reconcile-still-unknown', finalHash: await page.evaluate(() => location.hash)});

    const executionPath = ['#action-review', '#signature-pending', '#signed', '#submission-pending', '#finalized', '#result-handoff'];
    await page.goto(`${pathToFileURL(candidatePath).href}${executionPath[0]}`, {waitUntil: 'load'});
    for (const next of executionPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: execution path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    interactionResults.push({viewport: viewport.name, path: 'review-to-result-handoff', finalHash: await page.evaluate(() => location.hash)});

    const unknownRecoveryPath = ['#submission-unknown', '#submission-reconciling', '#submission-unknown', '#settlement-unknown-handoff'];
    await page.goto(`${pathToFileURL(candidatePath).href}${unknownRecoveryPath[0]}`, {waitUntil: 'load'});
    for (const next of unknownRecoveryPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: unknown recovery path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    interactionResults.push({viewport: viewport.name, path: 'unknown-reconcile-still-unknown-to-settlement', finalHash: await page.evaluate(() => location.hash)});

    await context.close();
  }
} finally {
  await browser.close();
}

errors.push(...browserErrors.map(entry => `${entry.viewport}: page error: ${entry.message}`));
errors.push(...consoleErrors.map(entry => `${entry.viewport}: console error: ${entry.message}`));
if (externalRequests.length) errors.push(`Unexpected external runtime requests: ${externalRequests.map(entry => entry.url).join(', ')}`);

const summary = {
  schema: 'chopdot.j21-v1-review.v1',
  generated_at: new Date().toISOString(),
  candidate: {
    branch,
    head,
    tree,
    path: path.relative(repoRoot, candidatePath),
    sha256: candidateSha256,
  },
  scope: 'J21 bounded provider-availability and connection-timeout recovery slice; unknown connection state is reconciled before a fresh attempt',
  counts: {
    states: states.length,
    viewports: viewports.length,
    screenshots: pages.length,
    interaction_paths: interactionResults.length,
    browser_errors: browserErrors.length,
    console_errors: consoleErrors.length,
    external_requests: externalRequests.length,
    failures: errors.length,
  },
  viewports,
  states,
  interactions: interactionResults,
  pages,
  errors,
  review_status: errors.length ? 'MECHANICAL_QA_FAILED' : 'BOUNDED_SLICE_QA_PASSED',
  limitations: [
    'This evidence verifies the provider-unavailable and unknown connection recovery increment plus the previously built J21 states; it is not yet a complete Journey 21 review bundle.',
    'The remaining required account-network-switch/balance/disconnect/offline/loading/provider-error clusters are intentionally still open.',
    'It does not provide independent UX judgment or human approval.',
    'No real wallet, signature, chain submission, funds, or network finality is exercised; all product states are synthetic prototype states.',
  ],
};

await writeFile(path.join(evidenceRoot, 'QA_SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(evidenceRoot, 'VISUAL_QA.md'), `# Journey 21 V1 provider/connection recovery slice — mechanical evidence\n\n- Exact head: \`${head}\`\n- Candidate SHA-256: \`${candidateSha256}\`\n- States: ${states.length}\n- Viewports: ${viewports.map(v => v.name).join(', ')}\n- Screenshots: ${pages.length}\n- Interaction paths: ${interactionResults.length}\n- Browser errors: ${browserErrors.length}\n- Console errors: ${consoleErrors.length}\n- External runtime requests: ${externalRequests.length}\n- Failures: ${errors.length}\n\nThis is Builder mechanical evidence only. It does not grant visual clearance, REVIEWABLE, GOLDEN-READY, or approval.\n`);

console.log(JSON.stringify({head, candidateSha256, states: states.length, screenshots: pages.length, failures: errors.length}, null, 2));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
