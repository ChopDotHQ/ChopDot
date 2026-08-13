import {expect, Page, test} from '@playwright/test';

const storageKey = 'chopdot-portable-shell-state-v1';

test('receipt-first capture stays draft-only until Save spend', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('http://127.0.0.1:4177/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await createThreePersonGroup(page);

  await page.getByRole('button', {name: 'Add spend'}).click();

  await expect(page.getByRole('heading', {name: 'Start with the receipt'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add receipt'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Enter amount instead'})).toBeVisible();
  await page.screenshot({
    path: 'proof/chopdot-candidate-2026-08-12/screenshots/05-capture-receipt-first-mobile.png',
    fullPage: true,
  });
  expect(await expenseCount(page)).toBe(0);

  await page.getByLabel('Choose receipt').setInputFiles({
    name: 'gusto-receipt.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Gusto Zurich\nGrand total CHF 120.00'),
  });
  await expect(page.getByText('Receipt added — review the details')).toBeVisible();
  await expect(page.getByLabel('Total')).toHaveValue('120');
  await expect(page.getByLabel('Merchant or reason')).toHaveValue('Gusto Zurich');
  await expect(page.getByRole('button', {name: 'Review split'})).toBeEnabled();
  await page.screenshot({
    path: 'proof/chopdot-candidate-2026-08-12/screenshots/06-capture-receipt-review-mobile.png',
    fullPage: true,
  });
  await page.locator('header').click();

  await page.getByRole('button', {name: 'Review split'}).click();
  await expect(page.getByText('$120.00', {exact: true})).toBeVisible();
  await expect(page.getByText('$40.00', {exact: true})).toHaveCount(3);
  expect(await expenseCount(page)).toBe(0);

  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.getByLabel('Total')).toHaveValue('120');
  await expect(page.getByLabel('Merchant or reason')).toHaveValue('Gusto Zurich');

  await page.getByRole('button', {name: 'Review split'}).click();
  await page.getByRole('button', {name: 'Save spend'}).click();
  expect(await expenseCount(page)).toBe(1);
});

test('unreadable photo falls back to correction without creating money state', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('http://127.0.0.1:4177/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await createThreePersonGroup(page);
  await page.getByRole('button', {name: 'Add spend'}).click();

  await page.getByLabel('Choose receipt').setInputFiles({
    name: 'dinner.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await expect(page.getByRole('alert')).toContainText('Couldn’t read the total');
  await expect(page.getByRole('button', {name: 'Review split'})).toBeDisabled();
  expect(await expenseCount(page)).toBe(0);
});

async function createThreePersonGroup(page: Page) {
  await page.getByRole('button', {name: 'Continue as guest'}).click();
  await page.getByPlaceholder('Display name').fill('Mina');
  await page.getByRole('button', {name: /Continue as Mina|Start/}).click();
  await page.getByRole('button', {name: 'Start with a group'}).click();
  await page.getByPlaceholder('e.g. Weekend Trip').fill('Weekend Trip');
  await page.getByLabel('Friend name').fill('Leo');
  await page.getByRole('button', {name: 'Add friend'}).click();
  await page.getByLabel('Friend name').fill('Nina');
  await page.getByRole('button', {name: 'Add friend'}).click();
  await page.getByRole('button', {name: 'Create group'}).click();
}

async function expenseCount(page: Page) {
  return page.evaluate((key) => {
    const stored = window.localStorage.getItem(key);
    if (!stored) return 0;
    const parsed = JSON.parse(stored) as {expenses?: Record<string, unknown>};
    return Object.keys(parsed.expenses ?? {}).length;
  }, storageKey);
}
