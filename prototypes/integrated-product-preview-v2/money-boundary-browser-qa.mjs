import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MONEY_V1_MAX_ABS_MINOR_UNITS, moneyFromMinorUnits, moneyFromPreviewDecimal, formatPreviewMoney, allocationView } from './money-v1.js';

const base = process.env.PREVIEW_V2_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out = new URL('./artifacts/', import.meta.url);
mkdirSync(out, { recursive: true });
const report = { gate: 'A', evidence: 'MoneyV1-range-native-browser', sourceChecks: [], checks: [], paths: [], errors: [], viewports: [] };
const max = 10n ** 30n;
const decimal = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
const maximum = decimal(max);
const tooLarge = decimal(max + 1n);
const product = page => page.frameLocator('#product-frame');
const state = page => page.evaluate(() => window.ChopDotPreviewV2.getGuestState());
const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push(name); };
const sourceCheck = (name, fn) => { fn(); report.sourceChecks.push(name); };
const capture = (page, name) => page.screenshot({ path: new URL(`${name}.png`, out).pathname, fullPage: true });
let browser;

async function home(page) {
  await page.waitForFunction(() => window.ChopDotPreviewV2?.getCurrentJourney() === 'J02' && window.ChopDotPreviewV2?.getHomeMode() === 'guest');
  await product(page).locator('body[data-preview-mode="guest"]').waitFor();
}
async function reopen(page) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  await home(page);
  await product(page).getByRole('button', { name: 'Add expense', exact: true }).click();
  await product(page).locator('#entry .amount').waitFor();
}

try {
  sourceCheck('governing magnitude constant retained', () => assert.equal(MONEY_V1_MAX_ABS_MINOR_UNITS, max));
  sourceCheck('maximum constructed exactly', () => assert.equal(moneyFromPreviewDecimal(maximum, 'CHF').minorUnits, String(max)));
  sourceCheck('max+1 bigint denied', () => assert.throws(() => moneyFromMinorUnits(max + 1n, 'CHF'), /supported limit/));
  sourceCheck('max+1 decimal denied', () => assert.throws(() => moneyFromPreviewDecimal(tooLarge, 'CHF'), /supported limit/));
  const restoredOversize = { v: 1, minorUnits: String(max + 1n), currency: 'CHF', exponent: 2 };
  sourceCheck('restored oversized money denied by formatter', () => assert.throws(() => formatPreviewMoney(restoredOversize), /supported limit/));
  sourceCheck('restored oversized snapshot denied by consumer', () => assert.throws(() => allocationView({ version: 1, total: restoredOversize, allocations: [{ participantId: 'self', amount: restoredOversize }] }, ['self']), /supported limit/));
  browser = await chromium.launch({ headless: true });
  for (const vp of [{ width: 393, height: 852 }, { width: 430, height: 890 }]) {
    const label = `${vp.width}x${vp.height}`;
    report.viewports.push(label);
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.errors.push(`${label}: ${String(error)}`));
    page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) report.errors.push(`${label}: ${message.text()}`); });
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) report.errors.push(`${label}: HTTP ${response.status()} ${response.url()}`); });
    try {
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
      await home(page);
      await product(page).getByRole('button', { name: 'Start a group', exact: true }).click();
      await product(page).getByLabel('Group name').fill('Range check');
      await product(page).locator('#entry').getByRole('link', { name: 'Create group', exact: true }).click();
      await product(page).locator('#success').getByRole('heading', { name: 'Range check is ready.', exact: true }).waitFor();
      await product(page).locator('#success').getByRole('link', { name: 'Add expense', exact: true }).click();
      await product(page).getByLabel('Amount', { exact: true }).fill('12.34');
      await product(page).getByLabel('Description', { exact: true }).fill('Boundary expense');
      check(`${label}: ordinary valid draft starts exact`, (await state(page)).expenseDraft.allocation.total.minorUnits, '1234');
      await product(page).getByLabel('Amount', { exact: true }).fill(tooLarge);
      await product(page).locator('#entry a[href="#success"]').click();
      let current = await state(page);
      check(`${label}: max+1 cannot save expense`, current.expenses.length, 0);
      check(`${label}: max+1 remains on editable entry`, await product(page).locator('#entry .amount').isVisible());
      check(`${label}: max+1 signals invalid amount`, await product(page).getByLabel('Amount', { exact: true }).evaluate(input => input.validity.customError));
      check(`${label}: invalid raw text is retained as draft only`, current.expenseDraft.amountText, tooLarge);
      check(`${label}: invalid raw text has no exact-money allocation`, current.expenseDraft.allocation, null);
      check(`${label}: invalid input preserves description`, current.expenseDraft.description, 'Boundary expense');
      await capture(page, `gate-a-money-range-rejected-${label}`);
      await reopen(page);
      check(`${label}: rejected raw draft survives reload`, await product(page).getByLabel('Amount', { exact: true }).inputValue(), tooLarge);
      await product(page).locator('#entry a[href="#success"]').click();
      check(`${label}: reload cannot authorize invalid amount`, (await state(page)).expenses.length, 0);
      await product(page).getByLabel('Amount', { exact: true }).fill(maximum);
      current = await state(page);
      check(`${label}: correcting amount clears validity`, await product(page).getByLabel('Amount', { exact: true }).evaluate(input => input.validity.customError), false);
      check(`${label}: maximum is accepted into exact draft`, current.expenseDraft.allocation.total.minorUnits, String(max));
      check(`${label}: maximum draft allocation conserves`, current.expenseDraft.allocation.allocations.reduce((sum, row) => sum + BigInt(row.amount.minorUnits), 0n).toString(), String(max));
      check(`${label}: maximum entry summary is contained`, await product(page).locator('#entry a[href="#split"] .row-sub').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await product(page).locator('#entry a[href="#split"]').click();
      check(`${label}: maximum participant share is contained`, await product(page).locator('#split [data-person-id="self"] > div > span').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      check(`${label}: maximum split summary is contained`, await product(page).locator('#split .split-summary').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await capture(page, `gate-a-money-range-split-${label}`);
      await product(page).locator('#split').getByRole('link', { name: 'Done', exact: true }).click();

      // Fault injection changes storage availability, never product or identity state.
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        window.__restoreGateARangeStorage = () => { Storage.prototype.setItem = original; delete window.__restoreGateARangeStorage; };
        Storage.prototype.setItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
      });
      await product(page).locator('#entry a[href="#success"]').click();
      check(`${label}: failed storage leaves zero completed expenses`, (await state(page)).expenses.length, 0);
      check(`${label}: failed storage retains editable amount`, await product(page).getByLabel('Amount', { exact: true }).inputValue(), maximum);
      await product(page).getByText("Couldn't save on this device. Your details are still here.", { exact: true }).waitFor();
      check(`${label}: failed storage displays recovery notice`, await product(page).locator('#entry .amount').isVisible());
      await capture(page, `gate-a-money-range-save-failure-${label}`);
      await page.evaluate(() => window.__restoreGateARangeStorage());
      await product(page).locator('#entry a[href="#success"]').click();
      await product(page).locator('#success').getByRole('heading', { name: 'Boundary expense added.', exact: true }).waitFor();
      const saved = await state(page);
      check(`${label}: retry after storage recovery saves once`, saved.expenses.length, 1);
      check(`${label}: maximum completed value is exact`, saved.expenses[0].money.minorUnits, String(max));
      check(`${label}: maximum completed allocation conserves`, saved.expenses[0].allocation.allocations.reduce((sum, row) => sum + BigInt(row.amount.minorUnits), 0n).toString(), String(max));
      check(`${label}: maximum receipt consumes exact saved money`, await product(page).locator('#success .receipt-amount').innerText(), `CHF ${maximum}`);
      check(`${label}: maximum receipt is marked exact`, await product(page).locator('#success').getAttribute('data-money-state'), 'exact');
      const layout = await product(page).locator('#success .receipt-summary').evaluate(card => {
        const title = card.querySelector('.receipt-top > :first-child');
        const amount = card.querySelector('.receipt-amount');
        const shareLabel = card.querySelector('.shares > span');
        const shareAmount = card.querySelector('.shares > b');
        return {
          columnsSeparate: title.getBoundingClientRect().right + 1 <= amount.getBoundingClientRect().left,
          sharesSeparate: shareLabel.getBoundingClientRect().right + 1 <= shareAmount.getBoundingClientRect().left,
          textContained: [title, amount, shareAmount].every(el => el.scrollWidth <= el.clientWidth + 1),
          cardContained: card.scrollWidth <= card.clientWidth + 1,
        };
      });
      for (const [name, passed] of Object.entries(layout)) check(`${label}: maximum receipt ${name}`, passed);
      await capture(page, `gate-a-money-range-maximum-${label}`);
      await reopen(page);
      check(`${label}: maximum saved record survives real reload`, (await state(page)).expenses, saved.expenses);
      await product(page).getByLabel('Amount', { exact: true }).fill(tooLarge);
      await product(page).getByLabel('Description', { exact: true }).fill('Rejected second expense');
      await product(page).locator('#entry a[href="#success"]').click();
      check(`${label}: rejected second expense cannot alter saved records`, (await state(page)).expenses, saved.expenses);
      check(`${label}: range handling creates no account authority`, (await state(page)).accountCreated, false);
      report.paths.push(`${label}: ordinary max+1 rejection → reload/rejection → correct to max → split/receipt layout → storage failure/retry → exact receipt → saved reload → second invalid submit`);
    } catch (error) {
      await capture(page, `gate-a-money-range-failure-${label}`).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  report.result = 'pass';
} catch (error) {
  report.result = 'fail';
  report.failure = String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  writeFileSync(new URL('gate-a-money-range-summary.json', out), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
