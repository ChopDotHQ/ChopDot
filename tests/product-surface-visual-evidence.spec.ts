import {expect, test} from '@playwright/test';
import {closeHostedProduct, openHostedProduct} from './support/hostedProductAccount.ts';

const appUrl = 'http://127.0.0.1:4177/';
const evidenceRoot = 'artifacts/release/ui-wave-4';

test('capture receipt-first product evidence at mobile and desktop widths', async ({browser}) => {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(appUrl, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.getByRole('heading', {name: 'Start with the receipt.'})).toBeVisible();
  await page.screenshot({path: `${evidenceRoot}/01-welcome-mobile.png`, fullPage: true});

  await page.getByRole('button', {name: 'Scan a receipt'}).click();
  await page.getByLabel('Import a receipt').setInputFiles({
    name: 'gusto-receipt.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Gusto Zurich\nGrand total CHF 120.00'),
  });
  await expect(page.getByText('Receipt added — check the details')).toBeVisible();
  await page.screenshot({path: `${evidenceRoot}/02-local-receipt-draft-mobile.png`, fullPage: true});
  await page.close();

  const product = await openHostedProduct(browser, {viewport: {width: 390, height: 844}});
  const {frame} = product;
  try {
    await frame.getByRole('button', {name: 'New group'}).click();
    await frame.getByPlaceholder('e.g. Weekend Trip').fill('Zurich Dinner');
    await expect(frame.getByLabel('Friend name')).toHaveCount(0);
    await frame.getByRole('button', {name: 'Create group'}).click();
    await frame.getByLabel('Back').click();
    await expect(frame.getByRole('heading', {name: 'Start with the receipt.'})).toBeVisible();
    await frame.locator('#root').screenshot({path: `${evidenceRoot}/03-home-group-card-mobile.png`});

    for (const mode of ['Trip', 'Couple', 'Spend Card', 'Savings circle', 'Emergency pot', 'Community fund']) {
      await frame.getByRole('button', {name: `Open ${mode}`}).click();
      await frame.locator('#root').screenshot({path: `${evidenceRoot}/mode-${slug(mode)}-mobile.png`});
      await frame.getByLabel('Back').click();
    }

    await product.page.setViewportSize({width: 1440, height: 1000});
    await frame.locator('#root').screenshot({path: `${evidenceRoot}/10-home-desktop.png`});
  } finally {
    await closeHostedProduct(product);
  }
});

function slug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-');
}
