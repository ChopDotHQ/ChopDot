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
  'connection-unknown-handoff',
  'connect-reconciling',
  'connected',
  'disconnect',
  'disconnect-handoff',
  'loading',
  'offline',
  'load-error',
  'wallet-state-unavailable-handoff',
  'wrong-network',
  'network-mismatch-handoff',
  'switch-account-review',
  'switch-network-review',
  'switch-pending',
  'switch-accepted',
  'switch-accepted-handoff',
  'action-review-switched',
  'signature-pending-switched',
  'switch-rejected',
  'switch-rejected-handoff',
  'switch-failed',
  'switch-failed-handoff',
  'switch-unknown',
  'switch-unknown-handoff',
  'switch-reconciling',
  'connect-rejected',
  'cancelled',
  'action-review',
  'insufficient-fee',
  'insufficient-asset',
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
  'connection-unknown-handoff': ['Settle Up', 'Still checking the wallet connection', '12.50 DOT', 'Maya', 'Polkadot', 'Connection unknown', 'fresh Connect remains blocked'],
  'connect-reconciling': ['Checking the existing wallet session', 'cannot sign, submit, or move money', 'trusted provider/session result'],
  'connected': ['Wallet connected', '5F3sa2…Demo9', 'Polkadot', 'not added to Payment Methods', 'not authorized or sent'],
  'disconnect': ['Wallet disconnected', '12.50 DOT', 'Maya', 'Polkadot', 'Saved Payment Methods', 'settlement history', 'source expenses', 'balances', 'No payment was signed or sent'],
  'disconnect-handoff': ['Settle Up', 'Wallet is disconnected', '12.50 DOT', 'Maya', 'Polkadot', 'Not signed or sent', 'did not remove a saved receiving destination'],
  'loading': ['Checking wallet state', '12.50 DOT', 'Maya', 'Polkadot', 'does not assume an account, network, signature, submission, or finality result'],
  'offline': ['You’re offline', '12.50 DOT', 'Maya', 'Polkadot', 'cannot connect, sign, or submit', 'No wallet state or network finality is inferred'],
  'load-error': ['Wallet state could not be loaded', '12.50 DOT', 'Maya', 'Polkadot', 'No connected, disconnected, submitted, or finalized state is being inferred'],
  'wallet-state-unavailable-handoff': ['Settle Up', 'Wallet status is unavailable', '12.50 DOT', 'Maya', 'Polkadot', 'No connected, disconnected, submitted, or finalized state is assumed'],
  'wrong-network': ['This network does not match', 'settlement expects Polkadot', 'will not continue with the old review'],
  'network-mismatch-handoff': ['Settle Up', 'Wallet stays on a different network', '12.50 DOT', 'Maya', 'Required network', 'Polkadot', 'Wallet network', 'Other network', 'No action review, signature, or payment route'],
  'switch-account-review': ['Switch the signing account?', '5F3sa2…Demo9', 'Polkadot', 'Maya', '12.50 DOT', 'review the exact payment again'],
  'switch-network-review': ['Switch to the required network?', 'Polkadot', 'Other network', '12.50 DOT', 'will not silently substitute a network'],
  'switch-pending': ['Approve the wallet change', 'Nothing is being signed or submitted', 'settlement amount, recipient, asset, source scope, or payment authority'],
  'switch-accepted': ['Wallet context revalidated', '1Demo…A7', 'Polkadot', 'previous action review is stale', '12.50 DOT', 'Maya'],
  'switch-accepted-handoff': ['Settle Up', 'Wallet changed — review still required', '12.50 DOT', 'Maya', '1Demo…A7', 'Polkadot', 'Fresh review required'],
  'action-review-switched': ['Check the payment after the wallet change', '12.50 DOT', 'Maya', '1Demo…A7', 'Polkadot', 'Fresh exact review'],
  'signature-pending-switched': ['Approve this exact action in your wallet', '1Demo…A7', 'Nothing has been submitted'],
  'switch-rejected': ['Wallet switch was not approved', 'No new wallet context was accepted', 'prior connected wallet session remains known and unchanged'],
  'switch-rejected-handoff': ['Settle Up', 'Current wallet is still connected', '12.50 DOT', 'Maya', '5F3sa2…Demo9', 'Polkadot', 'Connected · unchanged'],
  'switch-failed': ['Wallet could not complete the switch', 'No current wallet context is trusted', 'No payment was sent'],
  'switch-failed-handoff': ['Settle Up', 'Wallet context needs a recheck', '12.50 DOT', 'Maya', 'Polkadot', 'Context not trusted', 'Do not connect again, switch again, or request a signature'],
  'switch-unknown': ['switch result is not known yet', 'Do not start another switch or request a signature yet', 'Reconcile the original wallet change first'],
  'switch-unknown-handoff': ['Settle Up', 'Still checking the wallet switch', '12.50 DOT', 'Maya', 'Polkadot', 'Switch unknown', 'No fresh switch, signature, or payment route'],
  'switch-reconciling': ['Checking the original wallet switch', 'cannot sign, submit, or start another switch', 'trusted provider result'],
  'action-review': ['Check exactly what you will sign', '12.50 DOT', 'Maya', '5F3sa2…Demo9', 'Polkadot', 'revalidated'],
  'insufficient-fee': ['Not enough DOT for the network fee', '12.50 DOT', 'Maya', '5F3sa2…Demo9', 'Polkadot', '12.51 DOT', '0.02 DOT', 'will not reduce the payment', 'balance must be rechecked'],
  'insufficient-asset': ['Not enough DOT for this payment', '12.50 DOT', 'Maya', '5F3sa2…Demo9', 'Polkadot', '10.80 DOT', 'will not silently lower the amount', 'No payment was signed or submitted'],
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
        for (const required of ['#connect-reconciling', '#connection-unknown-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: unknown connection must preserve ${required} recovery/return route`);
        }
        for (const forbidden of ['#cancelled', '#chooser', '#connect-pending', '#connected', '#handoff']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: unknown connection must not route directly to ${forbidden}`);
        }
      }
      if (state === 'connection-unknown-handoff') {
        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: unresolved connection handoff must expose no fresh connection/execution route`);
        if (/Status\s+Not sent/iu.test(metrics.text) || /Wallet setup was cancelled/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: unresolved connection was incorrectly converted to cancelled/not-sent`);
      }
      if (state === 'connect-reconciling') {
        for (const outcome of ['#connected', '#chooser', '#connect-timeout']) {
          if (!metrics.anchors.includes(outcome)) errors.push(`${viewport.name}/${state}: missing explicit connection recovery outcome ${outcome}`);
        }
      }
      if (state === 'connected') {
        if (!metrics.anchors.includes('#switch-account-review')) errors.push(`${viewport.name}/${state}: connected wallet must enter explicit account-switch review before a switch prompt`);
        if (!metrics.anchors.includes('#disconnect')) errors.push(`${viewport.name}/${state}: connected wallet must expose an explicit session disconnect`);
      }
      if (state === 'disconnect') {
        if (metrics.anchors.length !== 1 || !metrics.anchors.includes('#disconnect-handoff')) errors.push(`${viewport.name}/${state}: disconnect must return only through the explicit disconnected handoff`);
        for (const forbidden of ['#action-review', '#action-review-switched', '#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending', '#finalized']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: disconnect must not expose execution route ${forbidden}`);
        }
      }
      if (state === 'disconnect-handoff') {
        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: disconnected caller return must expose no wallet execution route`);
        if (/Wallet setup was cancelled/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: disconnect must not be rewritten as cancellation`);
      }
      if (state === 'loading') {
        if (metrics.anchors.length !== 1 || !metrics.anchors.includes('#wallet-state-unavailable-handoff')) errors.push(`${viewport.name}/${state}: loading must preserve only a safe caller return while state is unknown`);
        for (const forbidden of ['#chooser', '#connect-pending', '#connected', '#action-review', '#signature-pending', '#signed', '#submission-pending', '#finalized']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: loading must not invent/bypass wallet state through ${forbidden}`);
        }
      }
      if (state === 'offline' || state === 'load-error') {
        for (const required of ['#loading', '#wallet-state-unavailable-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: unavailable wallet state must preserve ${required}`);
        }
        for (const forbidden of ['#chooser', '#connect-pending', '#connected', '#action-review', '#action-review-switched', '#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending', '#finalized']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: unavailable wallet state must not expose execution route ${forbidden}`);
        }
      }
      if (state === 'wallet-state-unavailable-handoff') {
        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: unavailable caller return must expose no wallet execution route`);
        if (/Wallet connected|Network finality verified|Settlement complete/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: unavailable caller return fabricated wallet/finality success`);
      }
      if (state === 'wrong-network') {
        for (const required of ['#switch-network-review', '#network-mismatch-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: network mismatch must preserve ${required}`);
        }
        for (const forbidden of ['#connect-pending', '#connected', '#action-review', '#action-review-switched', '#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: network mismatch must not bypass exact-network revalidation into ${forbidden}`);
        }
      }
      if (state === 'network-mismatch-handoff') {
        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: returned network mismatch must expose no connection/action/signature/payment route`);
        if (/Wallet connected/iu.test(metrics.text) || /Account and network revalidated/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: returned mismatch must not claim compatible/revalidated wallet state`);
      }
      if (state === 'switch-account-review' || state === 'switch-network-review') {
        if (!metrics.anchors.includes('#switch-pending')) errors.push(`${viewport.name}/${state}: reviewed switch must proceed through switch-pending`);
        for (const forbidden of ['#action-review', '#action-review-switched', '#signature-pending', '#signature-pending-switched', '#signed']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: switch review must not bypass provider switching into ${forbidden}`);
        }
      }
      if (state === 'switch-pending') {
        for (const outcome of ['#switch-accepted', '#switch-rejected', '#switch-failed', '#switch-unknown']) {
          if (!metrics.anchors.includes(outcome)) errors.push(`${viewport.name}/${state}: missing explicit switch outcome ${outcome}`);
        }
      }
      if (state === 'switch-accepted') {
        for (const required of ['#action-review-switched', '#switch-accepted-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: accepted switch must preserve ${required}`);
        }
        for (const forbidden of ['#cancelled', '#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: accepted switch must not erase/bypass session truth through ${forbidden}`);
        }
      }
      if (state === 'switch-accepted-handoff') {
        if (!metrics.anchors.includes('#action-review-switched')) errors.push(`${viewport.name}/${state}: accepted-return session must continue only through fresh exact review`);
        if (metrics.text.includes('5F3sa2…Demo9')) errors.push(`${viewport.name}/${state}: accepted-return handoff leaked the stale pre-switch account`);
        if (/Wallet setup was cancelled|Status\s+Not sent/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: accepted switch was incorrectly converted to generic cancellation`);
        for (const forbidden of ['#handoff', '#chooser', '#switch-pending', '#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: accepted-return handoff exposes bypass route ${forbidden}`);
        }
      }
      if (state === 'action-review-switched' || state === 'signature-pending-switched') {
        if (metrics.text.includes('5F3sa2…Demo9')) errors.push(`${viewport.name}/${state}: switched exact review/signature leaked the stale pre-switch account`);
        if (!metrics.text.includes('1Demo…A7')) errors.push(`${viewport.name}/${state}: switched exact review/signature must bind the revalidated switched account`);
      }
      if (state === 'switch-rejected') {
        for (const required of ['#switch-account-review', '#switch-network-review', '#switch-rejected-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: known rejection must preserve ${required}`);
        }
        for (const forbidden of ['#cancelled', '#action-review', '#action-review-switched', '#signature-pending', '#signed']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: rejected switch must not erase/continue session truth through ${forbidden}`);
        }
      }
      if (state === 'switch-rejected-handoff') {
        if (!metrics.anchors.includes('#connected')) errors.push(`${viewport.name}/${state}: rejected-return handoff must preserve the prior known connected session`);
        if (!metrics.text.includes('5F3sa2…Demo9') || !metrics.text.includes('Polkadot')) errors.push(`${viewport.name}/${state}: rejected-return handoff must show the prior trusted account/network`);
        if (/Wallet setup was cancelled/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: rejected switch was incorrectly converted to generic cancellation`);
        for (const forbidden of ['#handoff', '#chooser', '#switch-pending', '#action-review', '#action-review-switched', '#signature-pending', '#signed']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: rejected-return handoff exposes bypass route ${forbidden}`);
        }
      }
      if (state === 'switch-failed') {
        for (const required of ['#switch-reconciling', '#switch-failed-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: provider failure must preserve ${required}`);
        }
        for (const forbidden of ['#cancelled', '#action-review', '#action-review-switched', '#signature-pending', '#switch-pending']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: failed switch must not bypass recheck into ${forbidden}`);
        }
      }
      if (state === 'switch-failed-handoff') {
        if (metrics.anchors.length !== 1 || !metrics.anchors.includes('#switch-reconciling')) errors.push(`${viewport.name}/${state}: failed-return handoff must expose only trusted wallet-context recheck`);
        if (metrics.text.includes('5F3sa2…Demo9') || metrics.text.includes('1Demo…A7')) errors.push(`${viewport.name}/${state}: failed-return handoff must not fabricate a trusted account`);
        if (/Wallet setup was cancelled|Status\s+Not sent/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: failed switch was incorrectly converted to generic cancellation/not-sent`);
      }
      if (state === 'switch-unknown') {
        for (const required of ['#switch-reconciling', '#switch-unknown-handoff']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: unknown switch must preserve ${required}`);
        }
        for (const forbidden of ['#switch-pending', '#switch-accepted', '#switch-rejected', '#switch-failed', '#action-review', '#action-review-switched', '#signature-pending', '#signature-pending-switched', '#connected', '#cancelled']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: unknown switch must not route directly to ${forbidden}`);
        }
      }
      if (state === 'switch-unknown-handoff') {
        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: unresolved switch handoff must expose no fresh switch/sign/payment route`);
        if (/Wallet setup was cancelled/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: unresolved switch was incorrectly converted to cancellation`);
      }
      if (state === 'switch-reconciling') {
        for (const outcome of ['#switch-accepted', '#switch-rejected', '#switch-failed', '#switch-unknown']) {
          if (!metrics.anchors.includes(outcome)) errors.push(`${viewport.name}/${state}: missing explicit same-switch recovery outcome ${outcome}`);
        }
        if (metrics.anchors.includes('#switch-pending')) errors.push(`${viewport.name}/${state}: reconciliation must not create a new switch prompt`);
      }
      if (state === 'action-review') {
        for (const required of ['#insufficient-fee', '#insufficient-asset']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: exact review must expose bounded balance-block demo ${required}`);
        }
      }
      if (state === 'insufficient-fee' || state === 'insufficient-asset') {
        for (const required of ['#action-review', '#connected']) {
          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: balance blocker must preserve ${required} recheck/return route`);
        }
        for (const forbidden of ['#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending', '#finalized']) {
          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: insufficient balance must not bypass recheck into ${forbidden}`);
        }
        if (!metrics.text.includes('12.50 DOT') || !metrics.text.includes('Maya') || !metrics.text.includes('Polkadot')) errors.push(`${viewport.name}/${state}: balance blocker lost exact settlement scope`);
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

    // Regression for the prior reviewer blocker: returning from an unknown connection may not expose a fresh Connect path.
    await page.goto(`${pathToFileURL(candidatePath).href}#connect-timeout`, {waitUntil: 'load'});
    const returnUnknown = page.locator('.screen:visible a[href="#connection-unknown-handoff"]').first();
    if (!(await returnUnknown.isVisible())) {
      errors.push(`${viewport.name}: timeout return handoff is not reachable`);
    } else {
      await returnUnknown.click();
      await page.waitForFunction(() => location.hash === '#connection-unknown-handoff');
      const bypassCount = await page.locator('.screen:visible a[href="#handoff"], .screen:visible a[href="#chooser"], .screen:visible a[href="#connect-pending"], .screen:visible a[href="#connected"], .screen:visible a[href="#cancelled"]').count();
      if (bypassCount !== 0) errors.push(`${viewport.name}: timeout return exposes ${bypassCount} fresh connection/cancel bypass route(s)`);
    }
    interactionResults.push({viewport: viewport.name, path: 'timeout-return-keeps-connect-blocked', finalHash: await page.evaluate(() => location.hash)});

    const disconnectPath = ['#connected', '#disconnect', '#disconnect-handoff'];
    await page.goto(`${pathToFileURL(candidatePath).href}${disconnectPath[0]}`, {waitUntil: 'load'});
    for (const next of disconnectPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: disconnect path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    const disconnectedBypass = await page.locator('.screen:visible a[href="#connected"], .screen:visible a[href="#action-review"], .screen:visible a[href="#signature-pending"], .screen:visible a[href="#signed"], .screen:visible a[href="#submission-pending"]').count();
    if (disconnectedBypass !== 0) errors.push(`${viewport.name}: disconnected caller return exposes ${disconnectedBypass} execution bypass route(s)`);
    interactionResults.push({viewport: viewport.name, path: 'disconnect-preserves-settlement-without-execution', finalHash: await page.evaluate(() => location.hash)});

    for (const unavailableState of ['#offline', '#load-error']) {
      await page.goto(`${pathToFileURL(candidatePath).href}${unavailableState}`, {waitUntil: 'load'});
      const retry = page.locator('.screen:visible a[href="#loading"]').first();
      if (!(await retry.isVisible())) {
        errors.push(`${viewport.name}: ${unavailableState} cannot reach read-only loading recovery`);
      } else {
        await retry.click();
        await page.waitForFunction(() => location.hash === '#loading');
      }
      const loadingBypass = await page.locator('.screen:visible a[href="#chooser"], .screen:visible a[href="#connected"], .screen:visible a[href="#action-review"], .screen:visible a[href="#signature-pending"], .screen:visible a[href="#signed"], .screen:visible a[href="#submission-pending"], .screen:visible a[href="#finalized"]').count();
      if (loadingBypass !== 0) errors.push(`${viewport.name}: loading recovery exposes ${loadingBypass} execution/finality bypass route(s)`);
      const safeReturn = page.locator('.screen:visible a[href="#wallet-state-unavailable-handoff"]').first();
      if (!(await safeReturn.isVisible())) {
        errors.push(`${viewport.name}: loading recovery has no safe caller return`);
      } else {
        await safeReturn.click();
        await page.waitForFunction(() => location.hash === '#wallet-state-unavailable-handoff');
      }
      interactionResults.push({viewport: viewport.name, path: `${unavailableState.slice(1)}-read-only-recovery`, finalHash: await page.evaluate(() => location.hash)});
    }

    const accountSwitchPath = ['#connected', '#switch-account-review', '#switch-pending', '#switch-accepted', '#action-review-switched', '#signature-pending-switched', '#signed'];
    await page.goto(`${pathToFileURL(candidatePath).href}${accountSwitchPath[0]}`, {waitUntil: 'load'});
    for (const next of accountSwitchPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: account-switch path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    interactionResults.push({viewport: viewport.name, path: 'account-switch-to-fresh-signature', finalHash: await page.evaluate(() => location.hash)});

    const networkSwitchPath = ['#wrong-network', '#switch-network-review', '#switch-pending', '#switch-rejected', '#switch-network-review'];
    await page.goto(`${pathToFileURL(candidatePath).href}${networkSwitchPath[0]}`, {waitUntil: 'load'});
    for (const next of networkSwitchPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: network-switch rejection path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    interactionResults.push({viewport: viewport.name, path: 'network-switch-rejected-to-new-review', finalHash: await page.evaluate(() => location.hash)});

    // Reviewer regression: keeping a mismatched network must return the mismatch truthfully and expose no execution path.
    await page.goto(`${pathToFileURL(candidatePath).href}#wrong-network`, {waitUntil: 'load'});
    const keepMismatched = page.locator('.screen:visible a[href="#network-mismatch-handoff"]').first();
    if (!(await keepMismatched.isVisible())) {
      errors.push(`${viewport.name}: wrong-network Keep current connection cannot reach the explicit mismatch handoff`);
    } else {
      await keepMismatched.click();
      await page.waitForFunction(() => location.hash === '#network-mismatch-handoff');
      const executionBypass = await page.locator('.screen:visible a[href="#connected"], .screen:visible a[href="#action-review"], .screen:visible a[href="#action-review-switched"], .screen:visible a[href="#signature-pending"], .screen:visible a[href="#signature-pending-switched"], .screen:visible a[href="#signed"], .screen:visible a[href="#submission-pending"], .screen:visible a[href="#switch-pending"]').count();
      if (executionBypass !== 0) errors.push(`${viewport.name}: network mismatch handoff exposes ${executionBypass} execution/revalidation bypass route(s)`);
    }
    interactionResults.push({viewport: viewport.name, path: 'wrong-network-keep-current-preserves-mismatch', finalHash: await page.evaluate(() => location.hash)});

    // Reviewer regression: an accepted switch must remain the newly revalidated session across return.
    await page.goto(`${pathToFileURL(candidatePath).href}#switch-accepted`, {waitUntil: 'load'});
    const acceptedReturn = page.locator('.screen:visible a[href="#switch-accepted-handoff"]').first();
    if (!(await acceptedReturn.isVisible())) {
      errors.push(`${viewport.name}: accepted switch cannot reach its session-preserving return handoff`);
    } else {
      await acceptedReturn.click();
      await page.waitForFunction(() => location.hash === '#switch-accepted-handoff');
      const text = await page.locator('.screen:visible').innerText();
      if (!text.includes('1Demo…A7') || !text.includes('Polkadot')) errors.push(`${viewport.name}: accepted-return handoff lost the newly revalidated account/network`);
      if (/Wallet setup was cancelled|Not sent/iu.test(text)) errors.push(`${viewport.name}: accepted-return handoff collapsed into generic cancellation`);
    }
    interactionResults.push({viewport: viewport.name, path: 'switch-accepted-return-preserves-new-session', finalHash: await page.evaluate(() => location.hash)});

    // Reviewer regression: an account-switch rejection must keep the previously known connected wallet session.
    // The dedicated network-origin regression separately proves that a rejected network switch returns to the mismatch boundary.
    const rejectedAccountPath = ['#connected', '#switch-account-review', '#switch-pending', '#switch-rejected'];
    await page.goto(`${pathToFileURL(candidatePath).href}${rejectedAccountPath[0]}`, {waitUntil: 'load'});
    for (const next of rejectedAccountPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: account-switch rejection path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    const rejectedReturn = page.locator('.screen:visible a[href="#switch-rejected-handoff"]').first();
    if (!(await rejectedReturn.isVisible())) {
      errors.push(`${viewport.name}: rejected account switch cannot reach its prior-session return handoff`);
    } else {
      await rejectedReturn.click();
      await page.waitForFunction(() => location.hash === '#switch-rejected-handoff');
      const text = await page.locator('.screen:visible').innerText();
      if (!text.includes('5F3sa2…Demo9') || !text.includes('Polkadot')) errors.push(`${viewport.name}: rejected-return handoff lost the prior known account/network`);
      if (/Wallet setup was cancelled/iu.test(text)) errors.push(`${viewport.name}: rejected-return handoff collapsed into generic cancellation`);
    }
    interactionResults.push({viewport: viewport.name, path: 'switch-rejected-return-preserves-prior-session', finalHash: await page.evaluate(() => location.hash)});

    // Reviewer regression: a provider failure cannot expose fresh connect/switch/sign until the wallet context is re-read.
    await page.goto(`${pathToFileURL(candidatePath).href}#switch-failed`, {waitUntil: 'load'});
    const failedReturn = page.locator('.screen:visible a[href="#switch-failed-handoff"]').first();
    if (!(await failedReturn.isVisible())) {
      errors.push(`${viewport.name}: failed switch cannot reach its recheck-required return handoff`);
    } else {
      await failedReturn.click();
      await page.waitForFunction(() => location.hash === '#switch-failed-handoff');
      const bypassCount = await page.locator('.screen:visible a[href="#handoff"], .screen:visible a[href="#chooser"], .screen:visible a[href="#switch-account-review"], .screen:visible a[href="#switch-network-review"], .screen:visible a[href="#switch-pending"], .screen:visible a[href="#action-review"], .screen:visible a[href="#action-review-switched"], .screen:visible a[href="#signature-pending"], .screen:visible a[href="#signature-pending-switched"], .screen:visible a[href="#signed"]').count();
      if (bypassCount !== 0) errors.push(`${viewport.name}: failed-return handoff exposes ${bypassCount} fresh wallet/execution bypass route(s)`);
      const recheck = page.locator('.screen:visible a[href="#switch-reconciling"]').first();
      if (!(await recheck.isVisible())) errors.push(`${viewport.name}: failed-return handoff does not expose the trusted recheck path`);
    }
    interactionResults.push({viewport: viewport.name, path: 'switch-failed-return-blocks-until-recheck', finalHash: await page.evaluate(() => location.hash)});

    const switchUnknownRecoveryPath = ['#switch-unknown', '#switch-reconciling', '#switch-unknown', '#switch-unknown-handoff'];
    await page.goto(`${pathToFileURL(candidatePath).href}${switchUnknownRecoveryPath[0]}`, {waitUntil: 'load'});
    for (const next of switchUnknownRecoveryPath.slice(1)) {
      const link = page.locator(`.screen:visible a[href="${next}"]`).first();
      if (!(await link.isVisible())) {
        errors.push(`${viewport.name}: switch-unknown recovery path cannot reach ${next}`);
        break;
      }
      await link.click();
      await page.waitForFunction(target => location.hash === target, next);
    }
    const switchHandoffBypass = await page.locator('.screen:visible a[href="#switch-pending"], .screen:visible a[href="#action-review"], .screen:visible a[href="#action-review-switched"], .screen:visible a[href="#signature-pending"], .screen:visible a[href="#signature-pending-switched"], .screen:visible a[href="#connected"], .screen:visible a[href="#cancelled"]').count();
    if (switchHandoffBypass !== 0) errors.push(`${viewport.name}: unresolved switch handoff exposes ${switchHandoffBypass} fresh switch/execution bypass route(s)`);
    interactionResults.push({viewport: viewport.name, path: 'switch-unknown-reconcile-still-unknown-to-settlement', finalHash: await page.evaluate(() => location.hash)});

    // Balance blockers are reached from the exact action review, never from an altered settlement instruction.
    for (const balanceState of ['#insufficient-fee', '#insufficient-asset']) {
      await page.goto(`${pathToFileURL(candidatePath).href}#action-review`, {waitUntil: 'load'});
      const balanceLink = page.locator(`.screen:visible a[href="${balanceState}"]`).first();
      if (!(await balanceLink.isVisible())) {
        errors.push(`${viewport.name}: exact review cannot reach ${balanceState}`);
        continue;
      }
      await balanceLink.click();
      await page.waitForFunction(target => location.hash === target, balanceState);
      const executionBypass = await page.locator('.screen:visible a[href="#signature-pending"], .screen:visible a[href="#signature-pending-switched"], .screen:visible a[href="#signed"], .screen:visible a[href="#submission-pending"], .screen:visible a[href="#finalized"]').count();
      if (executionBypass !== 0) errors.push(`${viewport.name}: ${balanceState} exposes ${executionBypass} execution bypass route(s)`);
      const recheck = page.locator('.screen:visible a[href="#action-review"]').first();
      if (!(await recheck.isVisible())) errors.push(`${viewport.name}: ${balanceState} does not preserve exact-review recheck`);
      interactionResults.push({viewport: viewport.name, path: `balance-block-${balanceState.slice(1)}`, finalHash: await page.evaluate(() => location.hash)});
    }

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
  scope: 'J21 bounded balance-block increment: insufficient native network-fee balance and insufficient transfer-asset balance now block signing without mutating the exact upstream settlement amount, asset, recipient, account, or network; all previously built J21 states are rechecked',
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
    'This evidence verifies the insufficient native-fee and insufficient transfer-asset balance increment plus all previously built J21 states; it is not yet a complete Journey 21 review bundle.',
    'Disconnect, offline, loading, and load/provider-error states remain intentionally open for later bounded Builder increments.',
    'It does not provide independent UX judgment or human approval.',
    'No real wallet, signature, chain submission, funds, balance read, fee quote, or network finality is exercised; all product states and balances are synthetic prototype states.',
  ],
};

await writeFile(path.join(evidenceRoot, 'QA_SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(evidenceRoot, 'VISUAL_QA.md'), `# Journey 21 V1 balance-block increment — mechanical evidence\n\n- Exact head: \`${head}\`\n- Candidate SHA-256: \`${candidateSha256}\`\n- States: ${states.length}\n- Viewports: ${viewports.map(v => v.name).join(', ')}\n- Screenshots: ${pages.length}\n- Interaction paths: ${interactionResults.length}\n- Browser errors: ${browserErrors.length}\n- Console errors: ${consoleErrors.length}\n- External runtime requests: ${externalRequests.length}\n- Failures: ${errors.length}\n\nThis is Builder mechanical evidence only. It does not grant visual clearance, REVIEWABLE, GOLDEN-READY, or approval.\n`);

console.log(JSON.stringify({head, candidateSha256, states: states.length, screenshots: pages.length, failures: errors.length}, null, 2));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}