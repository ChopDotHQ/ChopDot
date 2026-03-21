import { test, expect } from '@playwright/test';

async function continueAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots', { timeout: 10_000 });
  await expect(page.getByText('Sign in to ChopDot')).not.toBeVisible({ timeout: 10_000 });
}

test.describe('Guest: Activity settlements + People settle', () => {
  test('Activity Settlements filter lists on-chain demo row', async ({ page }) => {
    await continueAsGuest(page);

    await page.getByRole('button', { name: 'Activity' }).click();
    await expect(page.locator('h1.text-screen-title', { hasText: /^Activity$/ })).toBeVisible();

    await page.getByRole('button', { name: 'Settlements' }).click();
    await expect(
      page.getByText(/On-chain settlement.*0\.001000 DOT|On-chain settlement/),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('People → settle shows counterparty name (not Unknown)', async ({ page }) => {
    await continueAsGuest(page);

    await page.getByRole('button', { name: 'People' }).click();
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();

    const aliceRow = page.getByRole('button').filter({ hasText: 'Settle with Alice' });
    await aliceRow.click();

    await expect(
      page.getByText(/You need to pay Alice|Choose how you want to collect from Alice/),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Collecting from Unknown')).not.toBeVisible();
    await expect(page.getByText('Choose how you want to collect from Unknown')).not.toBeVisible();
  });
});
