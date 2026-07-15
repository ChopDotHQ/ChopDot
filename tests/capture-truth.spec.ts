import {expect, Page, test} from '@playwright/test';

const storageKey = 'chopdot-portable-shell-state-v1';

test('normal capture is honest, direct, and draft-only until Save spend', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('http://127.0.0.1:4177/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await createThreePersonGroup(page);

  await page.getByRole('button', {name: 'Add spend'}).click();

  await expect(page.getByLabel('Total')).toBeVisible();
  await expect(page.getByLabel('Merchant or reason')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Review split'})).toBeDisabled();
  await expect(page.getByRole('button', {name: /receipt/i})).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByText(/\.png|\.jpg|\.jpeg|\.txt/i)).toHaveCount(0);

  await page.getByLabel('Total').fill('120');
  await page.getByLabel('Merchant or reason').fill('Dinner at Gusto');
  await expect(page.getByRole('button', {name: 'Review split'})).toBeEnabled();
  await page.locator('header').click();

  await page.getByRole('button', {name: 'Review split'}).click();
  await expect(page.getByText('$120.00', {exact: true})).toBeVisible();
  await expect(page.getByText('$40.00', {exact: true})).toHaveCount(3);
  expect(await expenseCount(page)).toBe(0);

  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.getByLabel('Total')).toHaveValue('120');
  await expect(page.getByLabel('Merchant or reason')).toHaveValue('Dinner at Gusto');

  await page.getByRole('button', {name: 'Review split'}).click();
  await page.getByRole('button', {name: 'Save spend'}).click();
  expect(await expenseCount(page)).toBe(1);
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
