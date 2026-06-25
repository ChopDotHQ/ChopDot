import { test, expect } from '@playwright/test';

async function continueAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots', { timeout: 10_000 });
  await expect(page.getByText('Sign in to ChopDot')).not.toBeVisible({ timeout: 10_000 });
}

async function openEmergencyFund(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.getByRole('button', { name: /Open .*Emergency Fund pot/ }).click();
  await expect(page.getByText('Recorded total')).toBeVisible({ timeout: 10_000 });
}

test.describe('Savings record routes', () => {
  test('savings pot uses record-only contribution and withdrawal flows', async ({ page }) => {
    await continueAsGuest(page);

    const emergencyFundCard = page.getByRole('button', { name: /Open .*Emergency Fund pot/ });
    await expect(emergencyFundCard).toContainText('Record only');
    await expect(emergencyFundCard).toContainText('Recorded total');
    await expect(emergencyFundCard).toContainText('Money movement');
    await expect(emergencyFundCard).toContainText('Outside app');
    await expect(emergencyFundCard).not.toContainText(/APY|yield|Total pooled/i);

    await openEmergencyFund(page);
    await expect(page.getByText('ChopDot role')).toBeVisible();
    await expect(page.getByText('Record only')).toBeVisible();
    await expect(page.getByText('No custody')).toBeVisible();
    await expect(page.getByText(/Money moves outside the app/i)).toBeVisible();
    await expect(page.getByText(/APY|yield|Earning yield via Polkadot/i)).not.toBeVisible();

    await page.getByRole('button', { name: 'Record contribution' }).click();
    await expect(page.getByRole('heading', { name: 'Record Contribution' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Recorded so far')).toBeVisible();
    await expect(page.getByText('How it moved')).toBeVisible();
    await expect(page.getByText('External wallet transfer')).toBeVisible();
    await page.getByRole('button', { name: '+DOT 100', exact: true }).click();
    await expect(page.getByText(/It does not move or hold money/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record DOT 100.00' })).toBeVisible();
    await expect(page.getByText(/APY|yield|Direct on-chain deposit/i)).not.toBeVisible();

    await openEmergencyFund(page);
    await page.getByRole('button', { name: 'Record withdrawal' }).click();
    await expect(page.getByRole('heading', { name: 'Record Withdrawal' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Recorded balance in .*Emergency Fund/)).toBeVisible();
    await expect(page.getByText('After external transfer')).toBeVisible();
    await expect(page.getByText(/does not custody funds, send withdrawals, or guarantee settlement/i)).toBeVisible();
    await expect(page.getByText(/APY|yield|Network fee|Funds will be withdrawn/i)).not.toBeVisible();
  });
});
