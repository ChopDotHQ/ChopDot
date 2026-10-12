import './gate-b/browser-launch.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { serve } from './gate-b/test-server.mjs';
import { upgrade, transition, newDraft } from './gate-b/model.js';
import { upgrade as account } from './gate-d/model.js';
import { transition as membershipTransition, upgrade as membershipUpgrade } from './create-join/model.js';

const out = process.env.EVIDENCE_DIR || '/tmp/chopdot-j01-browser';
mkdirSync(out, { recursive: true });
const host = await serve(process.env.PREVIEW_ROOT);
const browser = await chromium.launch({ headless: true });
const report = { status: 'RUNNING', browser: browser.version(), checks: [], screenshots: [], errors: [], limitations: [
  'Local automated browser evidence; not a hosted Actions result, independent review or user comprehension study.',
  'Authentication and wallet results are public synthetic fixtures. No real provider, signing, remote invitation or account is created.',
  'Legacy entry=invite uses the approved reference invitation, not a new canonical membership operation.',
  'Recovery cases explicitly inject source-supported synthetic preconditions before operating visible recovery controls.'
] };
let context, page;
const frame = () => page.frameLocator('#product-frame');
const button = name => frame().getByRole('button', { name, exact: true }).click();
const check = (id, fn) => { fn(); report.checks.push({ id, status: 'PASS' }); };
const shot = async name => { const path = `${out}/${name}.png`; await page.screenshot({ path }); report.screenshots.push(path); };
const state = () => page.evaluate(() => window.ChopDotPreviewV2.getGuestState());
const core = JSON.parse(readFileSync(new URL('./gate-b/contract/semantic-core.json', import.meta.url)));
let seed = upgrade({ group: { id: 'local', name: 'Local test group', currency: 'CHF' }, people: [{ id: 'alex', name: 'Alex' }], expenses: [], accountCreated: false });
const draft = { ...newDraft(seed), amountText: '12.01', description: 'Preserved local lunch' };
seed = account(transition(seed, { type: 'create', id: draft.id, operationId: draft.operationId, actor: 'self', draft }, core));
async function fresh(viewport, query = '', saved = null, actor = 'self') {
  if (context) await context.close();
  context = await browser.newContext({ viewport });
  if (saved) await context.addInitScript(({ s, actor }) => { if (!localStorage.getItem('chopdot.preview-v2.guest')) { localStorage.setItem('chopdot.preview-v2.guest', JSON.stringify(s)); sessionStorage.setItem('chopdot.membership.actor', actor); } }, { s: saved, actor });
  page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`${host.base}/prototypes/integrated-product-preview-v2/index.html${query}`);
  await page.waitForFunction(() => window.ChopDotPreviewV2);
}
async function email(address = 'dev@example.com') {
  await frame().getByLabel('Email', { exact: true }).fill(address);
  await button('Send code');
  await frame().getByLabel('6-digit code').waitFor();
}
async function verified(address = 'dev@example.com') {
  await email(address);
  await frame().getByLabel('6-digit code').fill('123456'); await button('Continue');
  if (address !== 'dev@example.com') { await frame().getByLabel('Your name').fill('Sam'); await button('Continue'); }
  await frame().locator('#entry-screen[data-state="ready"]').waitFor();
}
async function home(mode = 'guest') {
  await frame().locator(`body[data-preview-mode="${mode}"]`).waitFor();
}
try {
  for (const viewport of [{ width: 393, height: 852 }, { width: 430, height: 890 }]) {
    const v = viewport.width;
    await fresh(viewport);
    await page.getByRole('button', { name: 'Continue as guest', exact: true }).waitFor();
    await shot(`front-door-${v}`);
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => document.activeElement.id);
    check(`J01-R02-${v}-keyboard-target`, () => assert.equal(focus, 'guest-entry'));
    await page.keyboard.press('Enter'); await home();
    await frame().getByRole('heading', { name: 'Start your first split.', exact: true }).waitFor();
    await page.reload(); await home();
    check(`J01-R03-${v}-fresh-guest-and-reload`, () => assert.ok(page.url().includes('home=1')));

    await fresh(viewport);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await frame().getByLabel('Email', { exact: true }).waitFor();
    await frame().getByText('Prototype only. No email is sent. Use an example email.', { exact: true }).waitFor();
    await button('Back');
    await page.getByRole('button', { name: 'Continue as guest', exact: true }).waitFor();
    check(`J01-R04-${v}-normal-back`, () => assert.equal(new URL(page.url()).searchParams.has('entry'), false));

    await fresh(viewport, '', seed);
    await page.getByRole('button', { name: 'Continue as guest', exact: true }).click(); await home();
    const before = await state();
    await button('Invite someone'); await page.locator('#account-wall-create').click();
    await frame().getByLabel('Email', { exact: true }).waitFor(); await button('Back');
    await page.locator('#account-wall').waitFor({ state: 'visible' });
    await page.locator('#account-wall-cancel').click(); await home();
    const cancelled = await state();
    check(`J01-R05-${v}-boundary-back-cancel`, () => assert.deepEqual(cancelled.expenses, before.expenses));
    await button('Invite someone'); await page.locator('#account-wall-create').click();
    await email('sam@example.com');
    await frame().getByText('Prototype only. Enter 123456 to continue. No email was sent.', { exact: true }).waitFor();
    await shot(`code-${v}`);
    await page.goBack(); await frame().getByLabel('Email', { exact: true }).waitFor();
    await email('sam@example.com');
    check(`J01-R20-${v}-native-back`, () => assert.equal(new URL(page.url()).searchParams.get('entry'), 'convert-create'));
    await frame().getByLabel('6-digit code').fill('000000'); await button('Continue');
    await frame().getByText('That code does not match. Try again.', { exact: true }).waitFor();
    const incorrect = await state();
    check(`J01-R06-${v}-incorrect-code-no-conversion`, () => assert.equal(incorrect.accountCreated, false));
    const old = await frame().locator('body').evaluate(() => ({ epoch: window.EntryDemo.get().verificationEpoch, evidence: window.EntryDemo.emailProviderEvidence() }));
    await page.reload(); await frame().getByLabel('Email', { exact: true }).waitFor();
    await frame().getByText('Sign-in restarted. Request a fresh code or approval. Your saved work and incoming destination stay.', { exact: true }).waitFor();
    const restarted = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R07-${v}-fresh-restart-intent`, () => {
      assert.notEqual(restarted.verificationEpoch, old.epoch); assert.equal(restarted.email, '');
      assert.equal(restarted.verified, false); assert.equal(restarted.pendingRequest, null);
      assert.equal(new URL(page.url()).searchParams.get('entry'), 'convert-create');
    });
    await email('sam@example.com');
    await frame().locator('body').evaluate((node, evidence) => window.EntryDemo.deliverEmailProviderEvidence(evidence), old.evidence);
    await frame().getByLabel('6-digit code').fill('123456'); await button('Continue');
    await frame().getByLabel('Email', { exact: true }).waitFor();
    const denied = await state();
    check(`J01-R08-${v}-prior-proof-rejected`, () => assert.equal(denied.accountCreated, false));
    await verified('sam@example.com');
    const ready = await state();
    check(`J01-R09-${v}-ready-not-converted`, () => assert.equal(ready.accountCreated, false));
    await button('Open ChopDot'); await home('converted');
    const after = await state();
    check(`J01-R10-${v}-conversion-preserves-work`, () => {
      assert.equal(after.accountCreated, true); assert.deepEqual(after.people, before.people); assert.deepEqual(after.expenses, before.expenses); assert.deepEqual(after.group, before.group);
    });
    await shot(`converted-${v}`); await page.reload(); await home();
    const reloaded = await state();
    check(`J01-R19-${v}-reload-preserves-work-not-session-proof`, () => {
      assert.equal(reloaded.accountCreated, true); assert.deepEqual(reloaded.expenses, before.expenses);
    });

    await fresh(viewport, '?entry=signin');
    await frame().getByLabel('Email', { exact: true }).waitFor();
    await verified(); await frame().getByText('Welcome back.', { exact: true }).waitFor();
    const returning = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R11-${v}-returning-no-name-step`, () => assert.equal(returning.isNew, false));
    await button('Open ChopDot');
    await page.waitForFunction(() => window.ChopDotPreviewV2?.getCurrentJourney() === 'J02');

    await fresh(viewport, '?entry=invite');
    await button('Continue with email'); await email(); await page.reload();
    await frame().getByLabel('Email', { exact: true }).waitFor();
    await button('Back'); await frame().getByText('Your invite is waiting.', { exact: true }).waitFor();
    check(`J01-R12-${v}-invite-back-reload`, () => assert.equal(new URL(page.url()).searchParams.get('entry'), 'invite'));
    await button('Continue with email'); await verified();
    await frame().getByText('You have not joined yet.', { exact: true }).waitFor();
    const inviteState = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R13-${v}-invite-readiness-not-join`, () => { assert.equal(inviteState.destination, 'invite'); assert.equal(inviteState.joined, false); });
    await button('Continue to invite'); await frame().getByTitle('Invite reference').waitFor();

    await fresh(viewport);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await button('Use a wallet instead');
    await button('Everyday Account ending 9Kq');
    await frame().getByRole('group', { name: 'Simulated wallet results' }).waitFor();
    await shot(`wallet-${v}`);
    const walletS1 = await frame().locator('body').evaluate(() => window.EntryDemo.walletProviderEvidence());
    await page.reload(); await frame().getByText('Choose a demo account.', { exact: true }).waitFor();
    await button('Everyday Account ending 9Kq');
    const walletS2 = await frame().locator('body').evaluate(() => window.EntryDemo.walletProviderEvidence());
    await frame().locator('body').evaluate((node, evidence) => window.EntryDemo.deliverWalletProviderEvidence(evidence), walletS1);
    await button('Simulate verified approval');
    const replay = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R21-${v}-wallet-restart-stale-proof`, () => { assert.notEqual(walletS1.epoch, walletS2.epoch); assert.equal(replay.verified, false); assert.equal(replay.route, 'approval-waiting'); });
    await frame().locator('body').evaluate((node, evidence) => window.EntryDemo.deliverWalletProviderEvidence(evidence), walletS2);
    await button('Check again');
    const pending = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R14-${v}-refresh-not-proof`, () => assert.equal(pending.verified, false));
    await button('Simulate unknown result'); await frame().getByText('Result still unknown.', { exact: true }).waitFor();
    await button('Cancel'); await frame().getByText('Choose a demo account.', { exact: true }).waitFor();
    await button('Everyday Account ending 9Kq'); await button('Simulate declined approval');
    await frame().getByText('Sign-in declined.', { exact: true }).waitFor();
    await button('Try again'); await button('Simulate verified approval');
    await frame().locator('#entry-screen[data-state="ready"]').waitFor();
    const wallet = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R15-${v}-wallet-outcomes-discoverable`, () => { assert.equal(wallet.verified, true); assert.equal(wallet.method, 'wallet'); });

    const membership = membershipUpgrade(account({ group: { id: 'invite-group', name: 'Contextual group', currency: 'CHF', membershipManaged: true }, groups: [{ id: 'invite-group', name: 'Contextual group', currency: 'CHF', membershipManaged: true }], people: [], expenses: [], accountCreated: true }));
    const invited = membershipTransition(membership, { type: 'invite', actor: 'self', operationId: 'j01-context-invite', id: 'j01-invite', name: 'Sam' });
    await fresh(viewport, '?createJoin=' + encodeURIComponent('page=account&invite=j01-invite'), invited, 'visitor');
    await button('Join with account'); await frame().getByLabel('Email', { exact: true }).waitFor(); await button('Back');
    await frame().getByRole('button', { name: 'Join with account', exact: true }).waitFor();
    const backed = await state();
    check(`J01-R22-${v}-canonical-invite-back`, () => { assert.equal(backed.people.length, 0); assert.equal(backed.membership.invitations[0].id, 'j01-invite'); assert.ok(page.url().includes('j01-invite')); });
    await button('Join with account'); await email(); await page.reload();
    await frame().getByLabel('Email', { exact: true }).waitFor(); await verified(); await button('Open ChopDot');
    await frame().getByRole('button', { name: 'Join with account', exact: true }).waitFor();
    const awaitingConsent = await state();
    check(`J01-R23-${v}-canonical-invite-reload-entry-not-consent`, () => { assert.equal(awaitingConsent.people.length, 0); assert.equal(awaitingConsent.membership.invitations[0].status, 'pending'); assert.ok(page.url().includes('j01-invite')); });

    await fresh(viewport, '?entry=signin');
    await frame().getByLabel('Email', { exact: true }).waitFor();
    for (const fixture of ['offline', 'expired', 'reauth']) {
      await frame().locator('body').evaluate((node, name) => window.EntryDemo.fixture(name), fixture);
      if (fixture === 'offline') {
        await frame().getByText('You’re offline.', { exact: true }).waitFor(); await button('Try again');
        await frame().getByText('You’re offline.', { exact: true }).waitFor(); await frame().locator('[data-action="BACK_TO_EMAIL"]').click();
        await frame().getByLabel('Email', { exact: true }).waitFor();
      } else if (fixture === 'expired') {
        await frame().getByLabel('6-digit code').fill('123456'); await button('Continue');
        await frame().getByText('This code expired. Request a new one.', { exact: true }).waitFor();
        await button('Send a new code');
      } else {
        await frame().getByText('Welcome back.', { exact: true }).waitFor(); await button('Continue with email');
        await frame().getByLabel('Email', { exact: true }).waitFor();
      }
      const recovered = await frame().locator('body').evaluate(() => window.EntryDemo.get());
      check(`J01-R16-${v}-${fixture}-recovery-controls`, () => { assert.equal(recovered.verified, false); assert.equal(recovered.destination, fixture === 'expired' ? 'home' : 'invite'); });
    }
    await email('other@example.com');
    await frame().getByLabel('6-digit code').fill('123456'); await button('Continue');
    await frame().getByText('Use your original sign-in.', { exact: true }).waitFor();
    const wrong = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R24-${v}-wrong-account-denied`, () => assert.equal(wrong.verified, false));
    await button('Use another email'); await frame().getByLabel('Email', { exact: true }).waitFor();
    await frame().locator('body').evaluate(() => window.EntryDemo.dispatch('NAVIGATE', { route: 'load-error' }));
    await frame().getByText('Couldn’t finish signing in.', { exact: true }).waitFor(); await button('Try again');
    await frame().getByLabel('Email', { exact: true }).waitFor();
    const loadRetry = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R25-${v}-load-error-safe-retry`, () => { assert.equal(loadRetry.verified, false); assert.equal(loadRetry.destination, 'invite'); });
    await button('Use a wallet instead'); await button('Everyday Account ending 9Kq');
    await frame().locator('body').evaluate(() => window.EntryDemo.dispatch('APPROVAL_RESULT', window.EntryModel.walletApprovalResult(window.EntryDemo.walletProviderEvidence(), 'expired')));
    await frame().getByText('Request expired.', { exact: true }).waitFor(); await button('Try again');
    await button('Cancel'); await frame().getByText('Choose a demo account.', { exact: true }).waitFor();
    const expiredWallet = await frame().locator('body').evaluate(() => window.EntryDemo.get());
    check(`J01-R26-${v}-expired-wallet-cancel`, () => { assert.equal(expiredWallet.verified, false); assert.equal(expiredWallet.destination, 'invite'); });
    const overflow = await frame().locator('html').evaluate(node => node.scrollWidth > innerWidth);
    check(`J01-R17-${v}-horizontal-layout`, () => assert.equal(overflow, false));
  }
  check('J01-R18-browser-health', () => assert.deepEqual(report.errors, []));
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1;
  if (page) { report.failureURL = page.url(); report.failureText = await frame().locator('body').innerText().catch(() => 'Frame unavailable'); }
  if (page) await shot('failure').catch(() => {}); console.error(error);
} finally {
  writeFileSync(`${out}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, error: report.error }));
  await browser.close(); await host.close();
}
