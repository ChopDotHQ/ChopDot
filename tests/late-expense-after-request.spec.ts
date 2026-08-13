import {expect, test} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const proofDirectory = path.resolve('proof/late-expense-after-request');

test('Mina can add a forgotten expense after sending Leo a request', async ({page}) => {
  await mkdir(proofDirectory, {recursive: true});
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => undefined,
    });
  });
  await page.setViewportSize({width: 430, height: 932});
  await page.goto('http://127.0.0.1:4177/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.getByRole('button', {name: 'Continue as guest'}).click();
  await page.getByPlaceholder('Display name').fill('Mina');
  await page.getByRole('button', {name: 'Continue as Mina'}).click();
  await page.getByRole('button', {name: 'Start with a group'}).click();
  await page.getByPlaceholder('e.g. Weekend Trip').fill('Test Payment');
  await page.getByLabel('Friend name').fill('Leo');
  await page.getByRole('button', {name: 'Add friend'}).click();
  await page.getByRole('button', {name: 'Create group'}).click();

  await page.getByRole('button', {name: 'Add spend'}).click();
  await page.getByRole('button', {name: 'Enter amount instead'}).click();
  await page.getByPlaceholder('0.00').fill('10');
  await page.getByPlaceholder('e.g. Dinner at Gusto').fill('Coffee');
  await page.getByRole('button', {name: 'Review split'}).click();
  await page.getByRole('button', {name: 'Save spend'}).click();
  await page.getByRole('button', {name: 'Settle up'}).click();
  await page.getByRole('button', {name: 'Send link to Leo'}).click();
  await page.getByRole('button', {name: 'Back'}).click();

  await expect(page.getByTestId('group-request-waiting')).toHaveText('Waiting for Leo');
  await expect(page.getByTestId('group-add-expense')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Finish group'})).toHaveCount(0);
  await expect(page.getByText('Request sent', {exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Test Payment'})).toBeVisible();
  await expect(page.getByText('Mina (You)', {exact: true})).toBeVisible();
  await expect(page.getByText('Leo', {exact: true})).toBeVisible();
  await page.waitForTimeout(250);
  await page.locator('#root').screenshot({
    path: path.join(proofDirectory, '01-request-sent-add-expense-available.png'),
  });

  await page.getByTestId('group-add-expense').click();
  await page.getByRole('button', {name: 'Enter amount instead'}).click();
  await page.getByPlaceholder('0.00').fill('10');
  await page.getByPlaceholder('e.g. Dinner at Gusto').fill('Taxi');
  await page.getByRole('button', {name: 'Review split'}).click();
  await page.getByRole('button', {name: 'Save spend'}).click();

  await expect(page.getByText('$20.00', {exact: true})).toBeVisible();
  await expect(page.getByText('Request sent · $5.00 more', {exact: true})).toBeVisible();
  await expect(page.getByTestId('group-request-more')).toHaveText('Request $5.00 more');
  await expect(page.getByTestId('group-add-expense')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Finish group'})).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Test Payment'})).toBeVisible();
  await expect(page.getByText('Mina (You)', {exact: true})).toBeVisible();
  await expect(page.getByText('Leo', {exact: true})).toBeVisible();
  await page.waitForTimeout(250);
  await page.locator('#root').screenshot({
    path: path.join(proofDirectory, '02-late-expense-saved.png'),
  });

  await page.getByTestId('group-request-more').click();
  await expect(page.getByRole('button', {name: 'Send updated link to Leo'})).toBeVisible();
  await page.getByRole('button', {name: 'Send updated link to Leo'}).click();
  await page.getByRole('button', {name: 'Back'}).click();

  await expect(page.getByTestId('group-request-waiting')).toHaveText('Waiting for Leo');
  await expect(page.getByText('Request sent', {exact: true})).toBeVisible();
  await expect(page.getByText('Request sent · $5.00 more', {exact: true})).toHaveCount(0);
  await page.locator('#root').screenshot({
    path: path.join(proofDirectory, '03-updated-request-sent.png'),
  });
});
