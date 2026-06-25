import { test, expect } from '@playwright/test';

const emailProviderProofEnabled =
  process.env.CHOPDOT_EMAIL_PROVIDER_PROOF === '1' ||
  process.env.VITE_SUPABASE_URL?.includes('127.0.0.1:54321') === true;

test.describe('Email provider auth proof', () => {
  test.skip(
    !emailProviderProofEnabled,
    'Email provider proof requires a local Supabase auth override. Run with CHOPDOT_EMAIL_PROVIDER_PROOF=1 and local VITE_SUPABASE_* env.',
  );

  test('email signup, sign-out, and sign-in cycle returns to ChopDot without stale state', async ({ page }) => {
    const unique = Date.now().toString(36);
    const email = `codex-email-provider-${unique}@example.com`;
    const password = `ChopDot-${unique}-pass`;

    await page.goto('/pots');
    await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Email & password' }).click();
    await expect(page.getByRole('heading', { name: 'Email & password' })).toBeVisible();
    await page.getByRole('button', { name: 'Need an account? Create one' }).click();

    await expect(page.getByText('Create your ChopDot account')).toBeVisible({ timeout: 10_000 });
    await page.locator('#signup-email').fill(email);
    await page.locator('#signup-password').fill(password);
    await page.locator('#signup-confirm-password').fill(password);
    await page.locator('#signup-username').fill(`codex-${unique}`);
    await page.getByLabel(/I agree to the Terms of Service/i).check();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Sign in to ChopDot')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Pots', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Create Pot' })).toBeVisible({ timeout: 15_000 });

    await page.evaluate(() => {
      window.localStorage.setItem('account.connector', 'walletconnect');
      window.localStorage.setItem('account.walletSource', 'walletconnect');
      window.localStorage.setItem('account.address0', '5STALE');
      window.sessionStorage.setItem('chopdot_capture_acting_member', 'leo');
      (window as typeof window & { __chopdot_wallet_address?: string }).__chopdot_wallet_address = '5STALE';
    });

    await page.goto('/you');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByText('Sign in to ChopDot')).toBeVisible({ timeout: 10_000 });
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

    await page.getByRole('button', { name: 'Email & password' }).click();
    await page.locator('#email-login-email').fill(email);
    await page.locator('#email-login-password').fill(password);
    await page.getByRole('button', { name: 'Continue with email' }).click();

    await expect(page.getByText('Sign in to ChopDot')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Pots', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Create Pot' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Wallet required')).not.toBeVisible();
  });
});
