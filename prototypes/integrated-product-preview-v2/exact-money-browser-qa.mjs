import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PREVIEW_V2_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out = new URL('./artifacts/', import.meta.url);
mkdirSync(out, { recursive: true });
const report = {
  gate: 'A',
  evidence: 'exact-MoneyV1-equal-allocation-native-browser',
  viewports: [],
  paths: [],
  checks: [],
  errors: [],
  scope: 'Preview-only equal split. No new split method, rail, provider, Golden, or production authority.',
};
const browser = await chromium.launch({ headless: true });
const product = page => page.frameLocator('#product-frame');
const state = page => page.evaluate(() => window.ChopDotPreviewV2.getGuestState());
const check = (name, actual, expected = true) => {
  assert.deepEqual(actual, expected, name);
  report.checks.push(name);
};
const snapshot = (page, name) => page.screenshot({ path: new URL(`${name}.png`, out).pathname, fullPage: true });

function watch(page, label) {
  page.on('pageerror', error => report.errors.push(`${label}: ${String(error)}`));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      report.errors.push(`${label}: ${message.text()}`);
    }
  });
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
      report.errors.push(`${label}: HTTP ${response.status()} ${response.url()}`);
    }
  });
}

async function atHome(page) {
  await page.waitForFunction(() => window.ChopDotPreviewV2?.getCurrentJourney() === 'J02' && window.ChopDotPreviewV2?.getHomeMode() === 'guest');
  await product(page).locator('body[data-preview-mode="guest"]').waitFor();
}

async function createGroup(page) {
  await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  await atHome(page);
  await product(page).getByRole('button', { name: 'Start a group', exact: true }).click();
  await product(page).getByLabel('Group name').fill('Exact Split');
  await product(page).locator('#entry').getByRole('link', { name: 'Create group', exact: true }).click();
  await product(page).locator('#success').getByRole('heading', { name: 'Exact Split is ready.', exact: true }).waitFor();
}

async function addGroupPerson(page, name) {
  const success = product(page).locator('#success');
  await success.getByRole('link', { name: 'Add people', exact: true }).click();
  await success.getByLabel('Person name', { exact: true }).fill(name);
  await success.locator('.guest-group-add-row').getByRole('button', { name: 'Add', exact: true }).click();
  await success.locator('.guest-group-person-copy b').getByText(name, { exact: true }).waitFor();
  await success.getByRole('button', { name: 'Done', exact: true }).click();
}

async function openExpense(page) {
  const successAdd = product(page).locator('#success').getByRole('link', { name: 'Add expense', exact: true });
  if (await successAdd.count()) await successAdd.click();
  else await product(page).getByRole('button', { name: 'Add expense', exact: true }).click();
  await product(page).locator('#entry .amount').waitFor();
}

function minorSum(allocation) {
  return allocation.allocations.reduce((sum, row) => sum + BigInt(row.amount.minorUnits), 0n);
}

function formatCHF(money) {
  const units = BigInt(money.minorUnits);
  return `CHF ${(units / 100n).toString()}.${(units % 100n).toString().padStart(2, '0')}`;
}

function expectedAllocation(snapshot) {
  const ids = snapshot.allocations.map(row => row.participantId);
  const units = snapshot.allocations.map(row => row.amount.minorUnits);
  return { ids, units };
}

try {
  for (const vp of [{ width: 393, height: 852 }, { width: 430, height: 890 }]) {
    const label = `${vp.width}x${vp.height}`;
    report.viewports.push(label);
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    watch(page, label);
    try {
      await page.goto(base, { waitUntil: 'networkidle' });
      await createGroup(page);
      await addGroupPerson(page, 'Jeanine');
      await addGroupPerson(page, 'Marc');
      await openExpense(page);
      await product(page).getByLabel('Amount', { exact: true }).fill('10.00');
      await product(page).getByLabel('Description', { exact: true }).fill('Dinner');

      let draft = (await state(page)).expenseDraft;
      check(`${label}: exact draft version`, draft.version, 2);
      check(`${label}: equal-only method retained`, draft.method, 'equal');
      check(`${label}: exact total is 1000 minor units`, draft.allocation.total.minorUnits, '1000');
      check(`${label}: exact total partition is CHF/2`, [draft.allocation.total.currency, draft.allocation.total.exponent], ['CHF', 2]);
      check(`${label}: three exact allocations`, draft.allocation.allocations.length, 3);
      check(`${label}: exact allocations conserve 1000`, minorSum(draft.allocation).toString(), '1000');
      const canonicalIds = [...draft.participantIds].map(String).sort();
      check(`${label}: allocation identity is stable-ID sorted`, draft.allocation.allocations.map(row => row.participantId), canonicalIds);
      check(`${label}: deterministic remainder is first stable ID`, draft.allocation.allocations.map(row => row.amount.minorUnits), ['334', '333', '333']);
      check(`${label}: entry never claims false equal cents`, await product(page).locator('#entry a[href="#split"] .row-sub').innerText(), '3 people · exact shares');

      await product(page).locator('#entry a[href="#payer"]').click();
      await product(page).locator('#payer').getByRole('button', { name: /Jeanine/ }).click();
      const payerState = await state(page);
      check(`${label}: payer change preserves exact allocation`, expectedAllocation(payerState.expenseDraft.allocation), expectedAllocation(draft.allocation));
      check(`${label}: payer change is independent of share ownership`, payerState.selectedPayerId, payerState.people.find(person => person.name === 'Jeanine').id);

      await product(page).locator('#entry a[href="#split"]').click();
      check(`${label}: non-divisible footer is truthful`, await product(page).locator('#split .split-total').innerText(), 'Exact shares');
      for (const row of draft.allocation.allocations) {
        check(
          `${label}: visible exact share ${row.participantId}`,
          await product(page).locator(`#split [data-person-id="${row.participantId}"] > div > span`).innerText(),
          formatCHF(row.amount),
        );
      }
      check(`${label}: no split-method widening shortcut`, await product(page).locator('#split').getByText('Preview two people', { exact: true }).isVisible(), false);
      await snapshot(page, `gate-a-exact-money-included-${label}`);

      await product(page).locator('#split [data-person-id="self"]').click();
      let excluded = (await state(page)).expenseDraft;
      check(`${label}: self-excluded selection has two people`, excluded.participantIds.length, 2);
      check(`${label}: self-excluded total still conserves`, minorSum(excluded.allocation).toString(), '1000');
      check(`${label}: self-excluded exact split is equal`, excluded.allocation.allocations.map(row => row.amount.minorUnits), ['500', '500']);
      check(`${label}: self-excluded row says not included`, await product(page).locator('#split [data-person-id="self"] > div > span').innerText(), 'Not included');
      check(`${label}: self-excluded footer`, await product(page).locator('#split .split-total').innerText(), 'CHF 5.00 each');
      await product(page).locator('#split').getByRole('link', { name: 'Done', exact: true }).click();
      check(`${label}: self-excluded entry summary`, await product(page).locator('#entry a[href="#split"] .row-sub').innerText(), '2 people · CHF 5.00 each');
      await product(page).locator('#entry a[href="#split"]').click();
      await product(page).locator('#split [data-person-id="self"]').click();
      draft = (await state(page)).expenseDraft;
      check(`${label}: re-including self restores canonical allocation despite selection order`, expectedAllocation(draft.allocation), {
        ids: canonicalIds,
        units: ['334', '333', '333'],
      });
      await product(page).locator('#split').getByRole('link', { name: 'Done', exact: true }).click();

      await product(page).getByLabel('Amount', { exact: true }).fill('10.01');
      const edited = (await state(page)).expenseDraft;
      check(`${label}: edit recomputes exact total`, edited.allocation.total.minorUnits, '1001');
      check(`${label}: edited exact allocation conserves`, minorSum(edited.allocation).toString(), '1001');
      check(`${label}: edited deterministic remainder`, edited.allocation.allocations.map(row => row.amount.minorUnits), ['334', '334', '333']);
      await product(page).getByLabel('Amount', { exact: true }).fill('10.00');
      const beforeBack = (await state(page)).expenseDraft;
      check(`${label}: editing back to 10.00 restores allocation identity`, expectedAllocation(beforeBack.allocation), {
        ids: canonicalIds,
        units: ['334', '333', '333'],
      });

      await product(page).locator('#entry').getByRole('link', { name: 'Back', exact: true }).click();
      await atHome(page);
      check(`${label}: Back does not save expense`, (await state(page)).expenses.length, 0);
      await product(page).getByRole('button', { name: 'Add expense', exact: true }).click();
      await product(page).locator('#entry .amount').waitFor();
      check(`${label}: Back/reopen retains exact allocation`, (await state(page)).expenseDraft, beforeBack);

      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
      await atHome(page);
      await product(page).getByRole('button', { name: 'Add expense', exact: true }).click();
      await product(page).locator('#entry .amount').waitFor();
      const afterReload = (await state(page)).expenseDraft;
      check(`${label}: reload retains exact allocation snapshot`, afterReload, beforeBack);
      check(`${label}: reload visibly retains amount`, await product(page).getByLabel('Amount', { exact: true }).inputValue(), '10.00');
      check(`${label}: reload visibly retains exact-share summary`, await product(page).locator('#entry a[href="#split"] .row-sub').innerText(), '3 people · exact shares');
      await snapshot(page, `gate-a-exact-money-restored-${label}`);

      const addLink = product(page).locator('#entry a[href="#success"]');
      await addLink.evaluate(anchor => {
        anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await product(page).locator('#success').getByRole('heading', { name: 'Dinner added.', exact: true }).waitFor();
      const saved = await state(page);
      check(`${label}: duplicate submit saves exactly once`, saved.expenses.length, 1);
      check(`${label}: saved expense method remains equal-only`, saved.expenses[0].allocation.version, 1);
      check(`${label}: saved expense stores exact total`, saved.expenses[0].money.minorUnits, '1000');
      check(`${label}: saved expense stores exact allocation`, saved.expenses[0].allocation, beforeBack.allocation);
      check(`${label}: saved exact allocation conserves`, minorSum(saved.expenses[0].allocation).toString(), saved.expenses[0].money.minorUnits);
      check(`${label}: receipt marks exact money state`, await product(page).locator('#success').getAttribute('data-money-state'), 'exact');
      check(`${label}: receipt total consumes persisted exact total`, await product(page).locator('#success .receipt-amount').innerText(), 'CHF 10.00');
      const selfMoney = saved.expenses[0].allocation.allocations.find(row => row.participantId === 'self').amount;
      check(`${label}: receipt self share consumes persisted allocation`, await product(page).locator('#success .shares b').innerText(), formatCHF(selfMoney));
      await snapshot(page, `gate-a-exact-money-receipt-${label}`);

      await product(page).locator('#success').getByRole('link', { name: 'Back to group', exact: true }).click();
      await atHome(page);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
      await atHome(page);
      const persisted = await state(page);
      check(`${label}: saved exact allocation survives reload`, persisted.expenses[0].allocation, saved.expenses[0].allocation);
      check(`${label}: saved exact money survives reload`, persisted.expenses[0].money, saved.expenses[0].money);

      report.paths.push(`${label}: CHF 10.00 / 3 exact create → payer/participant edits → Back → reload → duplicate submit → receipt → saved reload`);
    } catch (error) {
      await snapshot(page, `gate-a-exact-money-failure-${label}`).catch(() => {});
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
  await browser.close();
  writeFileSync(new URL('gate-a-exact-money-summary.json', out), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
