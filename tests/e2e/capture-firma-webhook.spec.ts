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

async function commitDinnerSplit(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Friday Crew' }).click();
  await page.getByTestId('pot-open-spend-card').click();
  await page.getByTestId('spend-card-paste-link').click();
  await page
    .getByTestId('spend-card-checkout-evidence')
    .fill('w3spay://request?amount=120&currency=CHF&merchant=Cafe%20Zola&memo=Dinner&paymentId=w3s-firma-001&status=submitted');
  await page.getByTestId('spend-card-use-checkout-evidence').click();
  await page.getByTestId('spend-card-pay-now').click();
  await expect(page.getByTestId('capture-chapter-status')).toContainText('3 shares open', {
    timeout: 10_000,
  });
}

test.describe('Capture Firma webhook claim (P2 lite C17)', () => {
  test('webhook claim marks leg claimed; confirm still required', async ({ page }) => {
    await continueAsGuest(page);
    await seedCapturePot(page);
    await page.reload();
    await commitDinnerSplit(page);

    const webhookResult = await page.evaluate(async () => {
      const potsRaw = window.localStorage.getItem('chopdot_pots');
      const pots = potsRaw ? JSON.parse(potsRaw) : [];
      const pot = pots.find((entry: { id: string }) => entry.id === 'capture-test-pot');
      const chapter = pot?.chapter;
      const leg = chapter?.legs?.find(
        (item: { fromMemberId: string; state: string }) =>
          item.fromMemberId === 'alice' && item.state === 'open',
      );
      if (!chapter || !leg) {
        return { ok: false, reason: 'missing leg' };
      }

      const payload = {
        id: 'evt_test',
        type: 'payment.settled',
        created_at: new Date().toISOString(),
        data: {
          amount: leg.amount,
          currency: leg.currency,
          memo: `chopdot:leg:${leg.id}:pot:capture-test-pot:chapter:${chapter.id}`,
          payer_ref: 'alice',
        },
      };

      const harness = window.__chopdotCaptureTest;
      if (!harness) {
        return { ok: false, reason: 'harness missing' };
      }

      return harness.simulateFirmaWebhookClaim({
        potId: 'capture-test-pot',
        payload,
        deliveryId: `delivery_${Date.now()}`,
      });
    });

    expect(webhookResult.ok).toBe(true);

    await page.reload();
    await page.getByRole('button', { name: 'Friday Crew' }).click();
    await page.getByTestId('pot-open-spend-card').click();
    await expect(page.getByTestId('capture-chapter-status')).toContainText('Marked paid, waiting confirmation', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('capture-group-guidance')).toContainText('Receivers should confirm only after money arrives');
    await expect(page.getByTestId('capture-chapter-status')).toContainText('3 shares open', {
      timeout: 10_000,
    });

    await page.evaluate(() => {
      window.sessionStorage.setItem('chopdot_capture_acting_member', 'owner');
    });
    await page.reload();
    await page.getByRole('button', { name: 'Friday Crew' }).click();
    await page.getByTestId('pot-open-spend-card').click();

    const confirmButtons = page.locator('button[data-testid$="-confirm"]');
    await expect(confirmButtons.first()).toBeEnabled({ timeout: 10_000 });
  });
});
