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
    await expect(page.getByTestId('auth-entry-promise')).toContainText('Start with the group record');
    await expect(page.getByTestId('auth-entry-promise')).toContainText('not the wallet');
    await expect(page.getByTestId('auth-entry-promise')).toContainText('Connect a wallet later');
    await expect(page.getByTestId('auth-entry-steps')).toContainText('Starting a pot?');
    await expect(page.getByTestId('auth-entry-steps')).toContainText('Continue as guest and set up the group record first');
    await expect(page.getByTestId('auth-entry-steps')).toContainText("Joining someone else's pot?");
    await expect(page.getByTestId('auth-entry-steps')).toContainText('your own phone or browser profile');
    await expect(page.getByTestId('auth-entry-steps')).toContainText('Testing settlement or proof?');
    await expect(page.getByTestId('auth-entry-steps')).toContainText('after the group flow makes sense');
    await expect(page.getByRole('button', { name: 'Email & password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with wallets' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue as guest' })).toBeVisible();
    await expect(page.getByTestId('auth-guest-boundary')).toContainText('Guest mode is enough for private coordination');
    await expect(page.getByTestId('auth-guest-boundary')).toContainText('Wallets are optional');
    await expect(page.getByTestId('auth-friend-pilot-guide')).toContainText('Trying ChopDot with friends?');
    await expect(page.getByTestId('auth-friend-pilot-guide')).toContainText('Everyone starts from their own device');
    await expect(page.getByTestId('auth-friend-pilot-guide')).toContainText('takes only their own action');
    await expect(page.getByTestId('auth-friend-pilot-guide')).toContainText('what the group agreed happened');
  });

  test('wallet accordion expands and collapses', async ({ page }) => {
    const walletsButton = page.getByRole('button', { name: 'Sign in with wallets' });

    // Wallets should be collapsed by default
    await expect(page.getByText('Polkadot.js')).not.toBeVisible();

    // Expand
    await walletsButton.click();
    await expect(page.getByText('Polkadot.js')).toBeVisible();
    await expect(page.getByText('WalletConnect')).toBeVisible();
    await expect(page.getByTestId('auth-wallet-options')).toContainText('Wallets are optional for coordination');
    await expect(page.getByTestId('auth-wallet-options')).toContainText('Setup needed');
    await expect(page.getByTestId('auth-wallet-options')).toContainText('Install or unlock this wallet first');
    await expect(page.getByTestId('auth-wallet-options')).toContainText('Mobile handoff');
    await expect(page.getByTestId('auth-wallet-options')).toContainText('Use a mobile wallet and return after signing');

    // Collapse
    await walletsButton.click();
    await expect(page.getByText('Polkadot.js')).not.toBeVisible();
  });

  test('guest login navigates to dashboard', async ({ page }) => {
    await continueAsGuest(page);
    await expect(page.getByText('Wallet required')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Open .* pot/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('guest can sign out and return to onboarding', async ({ page }) => {
    await continueAsGuest(page);
    await page.evaluate(() => {
      window.localStorage.setItem('account.connector', 'walletconnect');
      window.localStorage.setItem('account.walletSource', 'walletconnect');
      window.localStorage.setItem('account.address0', '5FAKE');
      window.sessionStorage.setItem('chopdot_capture_acting_member', 'leo');
      (window as typeof window & { __chopdot_wallet_address?: string }).__chopdot_wallet_address = '5FAKE';
    });
    await page.goto('/you');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByText('Sign in to ChopDot')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('auth-entry-promise')).toContainText('Start with the group record');
    await expect
      .poll(() =>
        page.evaluate(() => ({
          connector: window.localStorage.getItem('account.connector'),
          walletSource: window.localStorage.getItem('account.walletSource'),
          address: window.localStorage.getItem('account.address0'),
          actingMember: window.sessionStorage.getItem('chopdot_capture_acting_member'),
          globalAddress: (window as typeof window & { __chopdot_wallet_address?: string }).__chopdot_wallet_address ?? null,
        })),
      )
      .toEqual({
        connector: null,
        walletSource: null,
        address: null,
        actingMember: null,
        globalAddress: null,
      });
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
    await expect(page.getByTestId('auth-entry-steps')).toContainText('your own phone or browser profile');

    // "Switch to mobile wallets view" should NOT exist
    await expect(page.getByText('Switch to mobile wallets view')).not.toBeVisible();
  });
});
