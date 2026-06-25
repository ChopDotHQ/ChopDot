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
        { id: 'owner', name: 'Mina', role: 'Owner', status: 'active' },
        { id: 'leo', name: 'Leo', role: 'Member', status: 'active' },
        { id: 'nina', name: 'Nina', role: 'Member', status: 'active' },
      ],
      spendGroup: {
        id: 'sg_friday_crew',
        label: 'Friday Crew',
        memberIds: ['owner', 'leo', 'nina'],
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

async function commitDinnerSplit(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Friday Crew' }).click();
  await page.getByTestId('pot-open-spend-card').click();
  await expect(page.getByTestId('spend-entry-guide')).toContainText('Use at checkout');
  await page.getByTestId('spend-card-paste-link').click();
  await page
    .getByTestId('spend-card-checkout-evidence')
    .fill('w3spay://request?amount=120&currency=CHF&merchant=Cafe%20Zola&memo=Dinner&paymentId=w3s-002&status=submitted');
  await page.getByTestId('spend-card-use-checkout-evidence').click();
  await expect(page.getByTestId('receipt-item-total')).toContainText('120.00 CHF');
  await expect(page.getByTestId('spend-card-rail-choice')).toContainText('Change payment app · TWINT');
  await page.getByTestId('spend-card-pay-now').click();
  await expect(page.getByTestId('capture-chapter-status')).toContainText('2 shares open', {
    timeout: 10_000,
  });
}

test.describe('Capture pay/confirm links (P1b)', () => {
  test('pay link → mark paid → confirm link closes leg', async ({ page }) => {
    await continueAsGuest(page);
    await seedCapturePot(page);
    await page.reload();
    await commitDinnerSplit(page);

    const linkBundle = await page.evaluate(async () => {
      const potsRaw = window.localStorage.getItem('chopdot_pots');
      const pots = potsRaw ? (JSON.parse(potsRaw) as Array<{ id: string; chapter?: { id: string; legs?: Array<{ id: string; fromMemberId: string; toMemberId: string; amount: number; currency: string; state: string }> } }>) : [];
      const pot = pots.find((entry) => entry.id === 'capture-test-pot');
      const chapter = pot?.chapter;
      const leg = chapter?.legs?.find((item) => item.fromMemberId === 'leo' && item.state === 'open');
      if (!chapter || !leg) {
        throw new Error('Expected open alice leg');
      }

      const tokensRaw = window.localStorage.getItem('chopdot_capture_link_tokens');
      const store = tokensRaw ? JSON.parse(tokensRaw) : [];
      const payToken = `cap_test_pay_${Date.now()}`;
      store.push({
        token: payToken,
        type: 'pay',
        payload: {
          chapterId: chapter.id,
          potId: 'capture-test-pot',
          legId: leg.id,
          fromMemberId: leg.fromMemberId,
          toMemberId: leg.toMemberId,
          amount: leg.amount,
          currency: leg.currency,
          exp: Date.now() + 60 * 60 * 1000,
        },
      });
      window.localStorage.setItem('chopdot_capture_link_tokens', JSON.stringify(store));
      return { payToken, legId: leg.id, chapterId: chapter.id, receiverId: leg.toMemberId };
    });

    await page.goto(`/pay?t=${linkBundle.payToken}`);
    await expect(page.getByTestId('capture-handoff-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('capture-pay-entry-guide')).toContainText('Pay your share');
    await expect(page.getByTestId('capture-pay-entry-guide')).toContainText('Use your normal payment app');
    await expect(page.getByTestId('capture-handoff-leg-id')).toContainText('to Mina');
    await expect(page.getByTestId('handoff-panel-twint')).toContainText('Pay with TWINT');
    await expect(page.getByTestId('handoff-status-label')).toContainText('ready to pay');
    await expect(page.getByTestId('handoff-panel-twint')).toContainText('receiver confirms what arrived');
    await expect(page.getByTestId('capture-chapter-status')).toHaveCount(0);
    await expect(page.getByTestId('capture-action-queue')).toHaveCount(0);
    await page.getByTestId('capture-handoff-mark-paid').click();
    await expect(page.getByTestId('capture-handoff-waiting-confirmation')).toContainText('Waiting for confirmation');
    await expect(page.getByTestId('capture-handoff-waiting-confirmation')).toContainText('closes this share');

    const confirmToken = await page.evaluate(
      ({ legId, chapterId, receiverId }) => {
        const tokensRaw = window.localStorage.getItem('chopdot_capture_link_tokens');
        const store = tokensRaw ? JSON.parse(tokensRaw) : [];
        const token = `cap_test_confirm_${Date.now()}`;
        store.push({
          token,
          type: 'confirm',
          payload: {
            chapterId,
            potId: 'capture-test-pot',
            legId,
            receiverId,
            exp: Date.now() + 60 * 60 * 1000,
          },
        });
        window.localStorage.setItem('chopdot_capture_link_tokens', JSON.stringify(store));
        window.sessionStorage.setItem('chopdot_capture_acting_member', receiverId);
        return token;
      },
      linkBundle,
    );

    await page.goto(`/confirm?t=${confirmToken}`);
    await expect(page.getByTestId('capture-confirm-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('capture-confirm-entry-guide')).toContainText('Confirm money arrived');
    await expect(page.getByTestId('capture-confirm-entry-guide')).toContainText('Only confirm if you received the money');
    await page.getByTestId('capture-confirm-submit').click();
    await page.waitForURL('**/pots', { timeout: 10_000 });
    await expect(page.getByTestId('capture-link-error-screen')).toHaveCount(0);

    await page.goto('/pots');
    await page.getByRole('button', { name: 'Friday Crew' }).click();
    await expect(page.getByTestId('capture-chapter-status')).toContainText('1 share open', {
      timeout: 10_000,
    });
  });
});
