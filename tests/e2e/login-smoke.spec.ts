import { test, expect } from '@playwright/test';

async function continueAsGuest(page: import('@playwright/test').Page) {
  const guestButton = page.getByRole('button', { name: 'Continue as guest' });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await guestButton.click();
    await page.waitForURL('**/pots', { timeout: 10_000 });
    try {
      await expect(page.getByText('Sign in to ChopDot')).not.toBeVisible({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }
}

test.describe('Login screen smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pots');
    await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  });

  test('renders all 4 login option rows', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Email & password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with wallets' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue as guest' })).toBeVisible();
  });

  test('wallet accordion expands and collapses', async ({ page }) => {
    const walletsButton = page.getByRole('button', { name: 'Sign in with wallets' });

    // Wallets should be collapsed by default
    await expect(page.getByText('Polkadot.js')).not.toBeVisible();

    // Expand
    await walletsButton.click();
    await expect(page.getByText('Polkadot.js')).toBeVisible();
    await expect(page.getByText('WalletConnect')).toBeVisible();

    // Collapse
    await walletsButton.click();
    await expect(page.getByText('Polkadot.js')).not.toBeVisible();
  });

  test('guest login navigates to dashboard', async ({ page }) => {
    await continueAsGuest(page);
  });

  test('Google button is present and clickable', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: 'Google' });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('mobile and desktop render the same layout', async ({ page, browserName }, testInfo) => {
    // This test runs in both Desktop Chrome and mobile-chrome projects
    // Both should have all 4 option rows — no separate mobile panel
    await expect(page.getByRole('button', { name: 'Email & password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with wallets' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue as guest' })).toBeVisible();

    // "Switch to mobile wallets view" should NOT exist
    await expect(page.getByText('Switch to mobile wallets view')).not.toBeVisible();
  });
});
