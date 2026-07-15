import { test, expect } from '@playwright/test';

const CAPTURE_POT_ID = 'capture-test-pot';

async function continueAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots', { timeout: 10_000 });
}

async function seedCapturePot(page: import('@playwright/test').Page) {
  await page.evaluate((potId) => {
    const pot = {
      id: potId,
      name: 'Friday Crew',
      type: 'expense',
      baseCurrency: 'CHF',
      members: [
        { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
        { id: 'alice', name: 'Alice', role: 'Member', status: 'active' },
        { id: 'bob', name: 'Bob', role: 'Member', status: 'active' },
        { id: 'charlie', name: 'Charlie', role: 'Member', status: 'active' },
      ],
      spendGroup: {
        id: 'sg_friday_crew',
        label: 'Friday Crew',
        memberIds: ['owner', 'alice', 'bob', 'charlie'],
        defaultSplitRule: 'equal',
        preferredPaymentApp: 'twint',
        activePotId: potId,
        closedPotIds: [],
      },
      expenses: [],
      history: [],
      archived: false,
      budgetEnabled: false,
      checkpointEnabled: false,
      mode: 'casual',
      confirmationsEnabled: false,
      lastEditAt: new Date().toISOString(),
    };

    const raw = window.localStorage.getItem('chopdot_pots');
    const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
    const filtered = existing.filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      return (entry as { id?: string }).id !== potId;
    });
    window.localStorage.setItem('chopdot_pots', JSON.stringify([pot, ...filtered]));
    window.localStorage.removeItem('chopdot_capture_link_tokens');
  }, CAPTURE_POT_ID);
}

test.describe('Capture wallet pass spend (P2 lite C15)', () => {
  test('spend token cold-load opens spend card', async ({ page }) => {
    await continueAsGuest(page);
    await seedCapturePot(page);
    await page.reload();

    await page.getByRole('button', { name: 'Friday Crew' }).click();
    await page.getByTestId('pot-open-spend-card').click();
    await expect(page.getByTestId('spend-entry-guide')).toContainText('Split this payment');

    const token = await page.evaluate(() => {
      const newToken = `cap_spend_${Date.now()}`;
      const store = [
        {
          token: newToken,
          type: 'spend',
          payload: {
            chapterId: 'ch_test',
            potId: 'capture-test-pot',
            spendSessionId: 'ws_test',
            payerId: 'owner',
            spendCardId: 'sc_capture-test-pot',
            exp: Date.now() + 60 * 60 * 1000,
          },
        },
      ];
      window.localStorage.setItem('chopdot_capture_link_tokens', JSON.stringify(store));
      return newToken;
    });

    await page.goto(`/spend?t=${token}`);
    await expect(page.getByTestId('spend-card-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('spend-entry-guide')).toContainText('Split this payment');
    await expect(page.getByTestId('receipt-placeholder')).toContainText('TWINT');
    await expect(page.getByTestId('spend-card-add-receipt')).toBeVisible();
  });
});
