import { test, expect } from '@playwright/test';

async function continueAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots', { timeout: 10_000 });
  await expect(page.getByText('Sign in to ChopDot')).not.toBeVisible({ timeout: 10_000 });
}

test.describe('Import pot smoke', () => {
  test('bad import link opens the import screen and fails visibly', async ({ page }) => {
    await page.route('**/ipfs/**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'not found' }),
      });
    });

    await continueAsGuest(page);
    await page.goto('/pots?cid=Qm11111111111111111111111111111111111111111111');

    await expect(page.getByRole('heading', { name: 'Import Pot' })).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('p').filter({ hasText: 'Failed to import pot: Pot not found on IPFS' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('valid import link previews the pot and adds it to the normal pot flow', async ({ page }) => {
    await page.route('**/ipfs/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          potId: 'imported-valid-pot',
          name: 'Imported weekend pot',
          type: 'expense',
          baseCurrency: 'USD',
          members: [
            { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
            { id: 'leo', name: 'Leo', role: 'Member', status: 'active' },
          ],
          expenses: [],
          createdAt: '2026-06-20T12:00:00.000Z',
          updatedAt: '2026-06-20T12:00:00.000Z',
        }),
      });
    });

    await continueAsGuest(page);
    await page.goto('/pots?cid=Qm22222222222222222222222222222222222222222222');

    await expect(page.getByRole('heading', { name: 'Import Pot' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Pot imported successfully!')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Imported weekend pot')).toBeVisible();

    await page.getByRole('button', { name: 'Add to My Pots' }).click();
    await expect(page.getByText('Imported weekend pot').first()).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() =>
        page.evaluate(() =>
          JSON.parse(window.localStorage.getItem('chopdot_pots') || '[]').some(
            (pot: { id?: string }) => pot.id === 'imported-valid-pot',
          ),
        ),
      )
      .toBe(true);

    await page.goto('/pots');
    await expect(page.getByRole('button', { name: /Open Imported weekend pot pot/ })).toBeVisible({
      timeout: 10_000,
    });
  });
});
