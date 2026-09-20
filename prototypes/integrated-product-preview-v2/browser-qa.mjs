import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PREVIEW_V2_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out = new URL('./artifacts/', import.meta.url);
mkdirSync(out, { recursive: true });
const report = { gate: 'A', evidence: 'native-browser-localStorage-and-reload', viewports: [], paths: [], checks: [], errors: [], limitations: ['Authentication is the approved demonstration flow, not a real provider.', 'Fractional-cent allocation and other split methods are not qualified by this common-case suite.'] };
const browser = await chromium.launch({ headless: true });
const product = page => page.frameLocator('#product-frame');
const state = page => page.evaluate(() => window.ChopDotPreviewV2.getGuestState());
const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push(name); };
const snapshot = (page, name) => page.screenshot({ path: new URL(`${name}.png`, out).pathname, fullPage: true });
function watch(page, label) {
  page.on('pageerror', error => report.errors.push(`${label}: ${String(error)}`));
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) report.errors.push(`${label}: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) report.errors.push(`${label}: HTTP ${response.status()} ${response.url()}`); });
}
async function atHome(page, mode = 'guest') {
  await page.waitForFunction(expected => window.ChopDotPreviewV2?.getCurrentJourney() === 'J02' && window.ChopDotPreviewV2?.getHomeMode() === expected, mode);
  await product(page).locator(`body[data-preview-mode="${mode}"]`).waitFor();
}
async function openExpense(page) {
  await product(page).getByRole('button', { name: 'Add expense', exact: true }).click();
  await product(page).locator('#entry .amount').waitFor();
}
async function fillExpense(page, amount, description) {
  await product(page).getByLabel('Amount', { exact: true }).fill(amount);
  await product(page).getByLabel('Description', { exact: true }).fill(description);
}
async function backFromExpense(page, mode = 'guest') {
  await product(page).locator('#entry').getByRole('link', { name: 'Back', exact: true }).click();
  await atHome(page, mode);
}
async function saveExpense(page, description) {
  await product(page).locator('#entry').getByRole('link', { name: 'Add expense', exact: true }).click();
  await product(page).locator('#success').getByRole('heading', { name: `${description} added.`, exact: true }).waitFor();
}
async function returnFromReceipt(page, mode = 'guest') {
  await product(page).locator('#success').getByRole('link', { name: 'Back to group', exact: true }).click();
  await atHome(page, mode);
}
async function createLocalGroup(page, name) {
  await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  await atHome(page);
  await product(page).getByRole('button', { name: 'Start a group', exact: true }).click();
  await product(page).getByLabel('Group name').fill(name);
  await product(page).locator('#entry').getByRole('link', { name: 'Create group', exact: true }).click();
  await product(page).locator('#success').getByRole('heading', { name: `${name} is ready.`, exact: true }).waitFor();
}
async function addGroupPerson(page, name) {
  const success = product(page).locator('#success');
  await success.getByRole('link', { name: 'Add people', exact: true }).click();
  await success.getByLabel('Person name', { exact: true }).fill(name);
  await success.locator('.guest-group-add-row').getByRole('button', { name: 'Add', exact: true }).click();
  await success.locator('.guest-group-person-copy b').getByText(name, { exact: true }).waitFor();
  await success.getByRole('button', { name: 'Done', exact: true }).click();
}
async function convert(page, label) {
  await product(page).getByRole('button', { name: 'Invite someone', exact: true }).click();
  await page.locator('#account-wall-create').click();
  await product(page).getByLabel('Email', { exact: true }).fill('sam@example.com');
  await product(page).getByRole('button', { name: 'Send code', exact: true }).click();
  await product(page).getByLabel('6-digit code', { exact: true }).fill('000000');
  await product(page).getByRole('button', { name: 'Continue', exact: true }).click();
  await product(page).getByText('That code does not match. Try again.', { exact: true }).waitFor();
  check(`${label}: wrong demonstration code cannot convert`, (await state(page)).accountCreated, false);
  await product(page).getByLabel('6-digit code', { exact: true }).fill('123456');
  await product(page).getByRole('button', { name: 'Continue', exact: true }).click();
  await product(page).getByLabel('Your name', { exact: true }).fill('Sam');
  await product(page).getByRole('button', { name: 'Continue', exact: true }).click();
  await product(page).getByText('You’re ready.', { exact: true }).waitFor();
  check(`${label}: readiness alone does not complete conversion`, (await state(page)).accountCreated, false);
  await product(page).getByRole('button', { name: 'Open ChopDot', exact: true }).click();
  await atHome(page, 'converted');
  await product(page).getByRole('heading', { name: 'Your work is still here.', exact: true }).waitFor();
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
      await page.getByText('Share & chop.', { exact: true }).waitFor();
      await snapshot(page, `gate-a-front-door-${label}`);
      await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
      await atHome(page);
      await product(page).getByRole('heading', { name: 'Start your first split.', exact: true }).waitFor();
      await product(page).getByText('No groups yet.', { exact: true }).waitFor();
      const body = await product(page).locator('body').innerText();
      for (const token of ['You’re almost square.', '2 things need you', 'Zurich Weekend', 'Apartment', 'Ski Trip', 'Polkadot wallet']) check(`${label}: no mature fixture ${token}`, body.includes(token), false);
      check(`${label}: no wallet`, await product(page).locator('.wallet').isVisible(), false);
      check(`${label}: no premature center expense action`, await product(page).locator('.add-tab').isVisible(), false);
      await snapshot(page, `gate-a-guest-first-use-${label}`);
      await product(page).getByRole('button', { name: 'Start a group', exact: true }).click();
      await product(page).getByLabel('Group name').fill('Local Weekend');
      await product(page).locator('#entry').getByRole('link', { name: 'Create group', exact: true }).click();
      await product(page).locator('#success').getByRole('heading', { name: 'Local Weekend is ready.', exact: true }).waitFor();
      await product(page).locator('#success').getByText('Local draft · saved on this device', { exact: true }).waitFor();
      await product(page).locator('#success').getByText('Add people or add an expense.', { exact: true }).waitFor();
      check(`${label}: group creation is not invite-first`, await product(page).locator('#success').getByText('Invite people', { exact: true }).count(), 0);
      await snapshot(page, `gate-a-local-group-created-${label}`);
      await addGroupPerson(page, 'Jeanine');
      await addGroupPerson(page, 'Marc');
      const originalPeople = (await state(page)).people;
      check(`${label}: group editor retains distinct local people`, new Set(originalPeople.map(p => p.id)).size, 2);
      check(`${label}: adding names creates no account`, (await state(page)).accountCreated, false);
      check(`${label}: adding names creates no Participant`, (await state(page)).participantCreated, false);
      await product(page).locator('#success').getByRole('link', { name: 'Add people', exact: true }).click();
      await product(page).locator('#success .guest-group-people-editor').scrollIntoViewIfNeeded();
      await snapshot(page, `gate-a-local-group-people-${label}`);
      await product(page).locator('#success').getByRole('button', { name: 'Done', exact: true }).click();
      await product(page).locator('#success').getByRole('link', { name: 'Add expense', exact: true }).click();
      await product(page).locator('#entry .amount').waitFor();
      check(`${label}: new expense amount is not a fixture`, await product(page).getByLabel('Amount').inputValue(), '');
      check(`${label}: new expense description is not a fixture`, await product(page).getByLabel('Description').inputValue(), '');
      await fillExpense(page, '42.00', 'Coffee');
      await product(page).locator('#entry a[href="#payer"]').click();
      await product(page).locator('#payer').getByRole('button', { name: /Jeanine/ }).click();
      await product(page).locator('#entry a[href="#split"]').click();
      await product(page).locator('#split [data-person-id="self"]').click();
      check(`${label}: excluded viewer row`, await product(page).locator('#split [data-person-id="self"] > div > span').innerText(), 'Not included');
      check(`${label}: initials retained`, await product(page).locator('#split [data-person-id="self"] > .avatar').innerText(), 'Y');
      check(`${label}: current split footer`, await product(page).locator('#split .split-total').innerText(), 'CHF 21.00 each');
      check(`${label}: fixture shortcut hidden`, await product(page).locator('#split').getByText('Preview two people', { exact: true }).isVisible(), false);
      await snapshot(page, `gate-a-self-excluded-split-${label}`);
      await product(page).locator('#split').getByRole('link', { name: 'Done', exact: true }).click();
      const draft = (await state(page)).expenseDraft;
      await backFromExpense(page);
      check(`${label}: Back is not a completed save`, (await state(page)).expenses.length, 0);
      check(`${label}: no handoff artifact`, (await product(page).locator('body').innerText()).includes('Journey 08 leads here'), false);
      await openExpense(page);
      check(`${label}: edited amount survives Back`, await product(page).getByLabel('Amount').inputValue(), '42.00');
      check(`${label}: edited description survives Back`, await product(page).getByLabel('Description').inputValue(), 'Coffee');
      check(`${label}: draft selections survive Back`, (await state(page)).expenseDraft, draft);
      // A native top-level reload while editing: no injected storage or success state.
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
      await atHome(page);
      await openExpense(page);
      check(`${label}: native reload preserves entire unfinished draft`, (await state(page)).expenseDraft, draft);
      check(`${label}: native reload restores visible amount`, await product(page).getByLabel('Amount').inputValue(), '42.00');
      check(`${label}: native reload restores visible description`, await product(page).getByLabel('Description').inputValue(), 'Coffee');
      await snapshot(page, `gate-a-restored-expense-${label}`);
      await saveExpense(page, 'Coffee');
      check(`${label}: excluded viewer receipt is zero`, await product(page).locator('#success .shares b').innerText(), 'CHF 0.00');
      check(`${label}: correct receipt total`, await product(page).locator('#success .receipt-amount').innerText(), 'CHF 42.00');
      check(`${label}: correct payer`, await product(page).locator('#success .receipt-meta').innerText(), 'Jeanine paid · Today');
      check(`${label}: truthful saved-local copy`, await product(page).locator('#success .success-wrap > p').innerText(), 'Split between 2 people · saved locally.');
      await snapshot(page, `gate-a-receipt-${label}`);
      await returnFromReceipt(page);
      const saved = await state(page);
      check(`${label}: payer ID saved`, saved.expenses[0].payerId, originalPeople[0].id);
      check(`${label}: participant IDs saved`, saved.expenses[0].participantIds, originalPeople.map(p => p.id));
      check(`${label}: no false Open action`, await product(page).getByText('Open', { exact: true }).count(), 0);
      check(`${label}: center expense action now visible`, await product(page).locator('.add-tab').isVisible());
      await product(page).getByRole('button', { name: 'Invite someone', exact: true }).click();
      await page.getByRole('heading', { name: 'Ready to share?', exact: true }).waitFor();
      await page.getByText("Everything you've done stays.", { exact: true }).waitFor();
      await snapshot(page, `gate-a-account-boundary-${label}`);
      await page.getByRole('button', { name: 'Not now', exact: true }).click();
      await atHome(page);
      check(`${label}: Not now preserves saved work`, (await state(page)).expenses, saved.expenses);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
      await atHome(page);
      check(`${label}: native reload preserves local people`, (await state(page)).people, originalPeople);
      check(`${label}: native reload preserves saved work`, (await state(page)).expenses, saved.expenses);
      await convert(page, label);
      const converted = await state(page);
      for (const key of ['group', 'people', 'expenses']) check(`${label}: conversion preserves ${key}`, converted[key], saved[key]);
      const entryBefore = await page.evaluate(() => window.ChopDotPreviewV2.getLastEntryState());
      await openExpense(page);
      await fillExpense(page, '30.00', 'Train tickets');
      await backFromExpense(page, 'converted');
      check(`${label}: editing Back retains conversion`, (await state(page)).accountCreated);
      check(`${label}: editing Back retains exact entry context`, await page.evaluate(() => window.ChopDotPreviewV2.getLastEntryState()), entryBefore);
      await openExpense(page);
      check(`${label}: converted draft retained`, await product(page).getByLabel('Description').inputValue(), 'Train tickets');
      await saveExpense(page, 'Train tickets');
      await returnFromReceipt(page, 'converted');
      check(`${label}: saved return retains conversion`, (await state(page)).accountCreated);
      check(`${label}: two actual saved expenses`, (await state(page)).expenses.length, 2);
      await snapshot(page, `gate-a-converted-after-edit-${label}`);
      report.paths.push(`${label}: full guest/group/people/expense/Back/native reload/share boundary/conversion/post-conversion editing task`);
    } catch (error) {
      await snapshot(page, `gate-a-task-failure-${label}`).catch(() => {});
      throw error;
    } finally { await context.close(); }

    // Independently exercise J05's own local-person editors and literal labels.
    const c2 = await browser.newContext({ viewport: vp });
    const p2 = await c2.newPage(); p2.setDefaultTimeout(15000); watch(p2, `people-${label}`);
    try {
      await p2.goto(base, { waitUntil: 'networkidle' });
      await createLocalGroup(p2, 'Trip <friends> & family');
      await addGroupPerson(p2, '<b>Alex</b>');
      await product(p2).locator('#success').getByRole('link', { name: 'Add people', exact: true }).click();
      check(`${label}: literal J03 name`, await product(p2).locator('#success .guest-group-person-copy b').last().innerText(), '<b>Alex</b>');
      check(`${label}: no nested markup from name`, await product(p2).locator('#success .guest-group-person-copy b b').count(), 0);
      await product(p2).locator('#success').getByRole('button', { name: 'Done', exact: true }).click();
      await product(p2).locator('#success').getByRole('link', { name: 'Add expense', exact: true }).click();
      await product(p2).locator('#entry .amount').waitFor();
      await fillExpense(p2, '60.00', 'Lunch');
      await product(p2).locator('#entry a[href="#payer"]').click();
      await product(p2).locator('#payer').getByRole('button', { name: /Add person/ }).click();
      await product(p2).locator('#payer').getByLabel('Person name').fill('Jeanine');
      await product(p2).locator('#payer .guest-person-editor').getByRole('button', { name: 'Add person', exact: true }).click();
      await product(p2).locator('#entry a[href="#payer"]').waitFor();
      const payerState = await state(p2);
      check(`${label}: J05-added payer chosen`, payerState.selectedPayerId, payerState.people.find(p => p.name === 'Jeanine').id);
      await product(p2).locator('#entry a[href="#split"]').click();
      await product(p2).locator('#split').getByRole('button', { name: /Add person/ }).click();
      await product(p2).locator('#split').getByLabel('Person name').fill('Marc');
      await product(p2).locator('#split .guest-person-editor').getByRole('button', { name: 'Add person', exact: true }).click();
      check(`${label}: split editor closes after successful add`, await product(p2).locator('#split .guest-person-editor').count(), 0);
      check(`${label}: local split people carry current shares`, await product(p2).locator('#split .split-total').innerText(), 'CHF 15.00 each');
      await product(p2).locator('#split').getByRole('link', { name: 'Done', exact: true }).click();
      await backFromExpense(p2);
      check(`${label}: group label is literal text`, await product(p2).locator('[data-local-group-name]').innerText(), 'Trip <friends> & family');
      check(`${label}: group label creates no elements`, await product(p2).locator('[data-local-group-name] > *').count(), 0);
      await p2.reload({ waitUntil: 'networkidle' });
      await p2.getByRole('button', { name: 'Continue as guest', exact: true }).click();
      await atHome(p2); await openExpense(p2);
      await product(p2).locator('#entry a[href="#payer"]').click();
      await product(p2).locator('#payer').getByText('<b>Alex</b>', { exact: true }).waitFor();
      check(`${label}: restored name creates no HTML`, await product(p2).locator('#payer .guest-member-button b b').count(), 0);
      await snapshot(p2, `gate-a-literal-restored-people-${label}`);
      await product(p2).locator('#payer').getByRole('link', { name: 'Cancel', exact: true }).click();
      await saveExpense(p2, 'Lunch');
      await product(p2).locator('#success').getByRole('link', { name: 'Add another', exact: true }).click();
      check(`${label}: Add another starts blank amount`, await product(p2).getByLabel('Amount').inputValue(), '');
      check(`${label}: Add another starts blank description`, await product(p2).getByLabel('Description').inputValue(), '');
      report.paths.push(`${label}: literal J03/Home/restored names + J05 payer/split addition + fresh next expense`);
    } finally { await c2.close(); }

    // Preserve the inherited invite-context test; exercise both viewports.
    const ci = await browser.newContext({ viewport: vp });
    const pi = await ci.newPage(); watch(pi, `invite-${label}`);
    try {
      const inviteUrl = new URL(base); inviteUrl.searchParams.set('entry', 'invite');
      await pi.goto(inviteUrl.href, { waitUntil: 'networkidle' });
      await product(pi).locator('#entry-screen[data-state="invite"]').waitFor();
      await product(pi).getByText('Geneva Weekend', { exact: true }).waitFor();
      check(`${label}: invite context bypasses front door`, await pi.locator('#front-door').isVisible(), false);
      report.paths.push(`${label}: deep invitation context bypasses generic entry`);
    } finally { await ci.close(); }
  }
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  report.result = 'pass';
} catch (error) {
  report.result = 'fail'; report.failure = String(error); process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(new URL('gate-a-summary.json', out), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
