import {expect, test} from '@playwright/test';
import {closeHostedProduct, currentProductFrame, openHostedProduct} from './support/hostedProductAccount.ts';

const appUrl = 'http://127.0.0.1:4177/';

test('empty Home has one receipt action and one secondary New group path', async ({page}) => {
  await enterAsGuest(page);

  await expect(page.getByRole('heading', {name: 'Start with the receipt.'})).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]:visible')).toHaveCount(1);
  await expect(page.getByRole('button', {name: 'Scan a receipt'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'New group'})).toHaveCount(1);
  await expect(page.getByText('Start something together')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Start with a group'})).toHaveCount(0);

  await page.getByRole('button', {name: 'New group'}).click();
  const groupType = page.getByLabel('What is it for?');
  await expect(groupType.locator('option')).toHaveCount(7);
  await groupType.selectOption('savings_circle');
  await expect(page.getByLabel('Group name')).toHaveValue('Savings circle');
});

test('Create group completes existing account setup and keeps signed creation behind one action', async ({browser}) => {
  const product = await openHostedProduct(browser, {bindAccount: false, viewport: {width: 390, height: 844}});
  try {
    await enterAsGuest(product.frame);
    await product.frame.getByRole('button', {name: 'New group'}).click();
    await product.frame.getByLabel('Group name').fill('Zurich dinner');

    await product.frame.getByRole('button', {name: 'Create my group'}).click();

    await expect(product.frame.getByRole('heading', {name: 'Zurich dinner'})).toBeVisible({timeout: 15_000});
    await expect(product.frame.locator('body')).not.toContainText(/Product Account|personhood|protocol|host|adapter/iu);
  } finally {
    await closeHostedProduct(product);
  }
});

test('failed setup keeps the group draft and offers one plain-language retry', async ({page}) => {
  await enterAsGuest(page);
  await page.getByRole('button', {name: 'New group'}).click();
  await page.getByLabel('Group name').fill('Zurich dinner');

  await page.getByRole('button', {name: 'Create my group'}).click();

  await expect(page.getByRole('alert')).toContainText(/group name is still here/iu);
  await expect(page.getByLabel('Group name')).toHaveValue('Zurich dinner');
  await expect(page.getByRole('button', {name: 'Try again'})).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Product Account|personhood|protocol|host|adapter/iu);
});

test('New group restores the exact local draft and candidate after a full reload', async ({page}) => {
  await enterAsGuest(page);
  await page.getByRole('button', {name: 'New group'}).click();
  await page.getByLabel('Group name').fill('Reload-safe dinner');
  await page.getByLabel('What is it for?').selectOption('trip');
  const before = await page.evaluate(() => window.sessionStorage.getItem('chopdot-new-group-form-v1'));
  expect(before).toBeTruthy();

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.getByRole('button', {name: 'New group'}).click();

  await expect(page.getByLabel('Group name')).toHaveValue('Reload-safe dinner');
  await expect(page.getByLabel('What is it for?')).toHaveValue('trip');
  const after = await page.evaluate(() => window.sessionStorage.getItem('chopdot-new-group-form-v1'));
  expect(after).toBe(before);
});

test('an occupied account identity is rejected before account capabilities can create the guest group', async ({browser}) => {
  const product = await openHostedProduct(browser, {bindAccount: false, viewport: {width: 390, height: 844}});
  try {
    await product.frame.evaluate(() => {
      window.localStorage.setItem('chopdot-portable-shell-state-v1', JSON.stringify({
        mode: 'clean',
        theme: 'light',
        currency: 'CHF',
        preferredPaymentMethod: null,
        currentUserId: 'guest',
        users: {
          guest: {id: 'guest', name: 'Mina'},
          Alice: {id: 'Alice', name: 'Someone already here'},
        },
        groups: {},
        expenses: {},
        splits: {},
        paymentMethods: {},
        activityEvents: {},
        savedRecords: {},
      }));
    });
    await product.page.reload({waitUntil: 'domcontentloaded'});
    await expect.poll(
      () => product.page.evaluate(() => (window as typeof window & {__TEST_HOST__: {getConnectionStatus(): string}}).__TEST_HOST__.getConnectionStatus()),
      {timeout: 15_000},
    ).toBe('connected');
    product.frame = currentProductFrame(product.page);
    const seeded = await product.frame.evaluate(() => JSON.parse(
      window.localStorage.getItem('chopdot-portable-shell-state-v1') ?? '{}',
    ) as {currentUserId?: string; users?: Record<string, unknown>});
    expect(seeded.currentUserId).toBe('guest');
    expect(Object.keys(seeded.users ?? {})).toContain('Alice');

    await product.frame.getByRole('button', {name: 'New group'}).click();
    await product.frame.getByLabel('Group name').fill('Must stay a draft');
    await product.frame.getByRole('button', {name: 'Create my group'}).click();

    await product.frame.waitForTimeout(1_000);
    const projection = await product.frame.evaluate(() => JSON.parse(
      window.localStorage.getItem('chopdot-portable-shell-state-v1') ?? '{}',
    ) as {currentUserId?: string; groups?: Record<string, unknown>});
    expect(projection.currentUserId).toBe('guest');
    expect(Object.keys(projection.groups ?? {})).toHaveLength(0);
    await expect(product.frame.getByRole('alert')).toContainText(/group name is still here/iu);
    await expect(product.frame.getByLabel('Group name')).toHaveValue('Must stay a draft');
  } finally {
    await closeHostedProduct(product);
  }
});

async function enterAsGuest(page: import('@playwright/test').Page | import('@playwright/test').Frame) {
  if ('reload' in page) {
    await page.goto(appUrl, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({waitUntil: 'domcontentloaded'});
  }
  await page.getByRole('button', {name: 'Continue as guest'}).click();
  await page.getByPlaceholder('Display name').fill('Mina');
  await page.getByRole('button', {name: 'Continue as Mina'}).click();
}
