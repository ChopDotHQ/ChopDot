import { test, expect } from '@playwright/test';

const CAPTURE_POT_ID = 'capture-test-pot';

async function continueAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots', { timeout: 10_000 });
}

async function seedOpenFriendPayment(page: import('@playwright/test').Page) {
  return page.evaluate((potId) => {
    const now = new Date().toISOString();
    const chapterId = `chapter_${potId}`;
    const legId = 'leg_leo_to_mina';
    const chapter = {
      schemaVersion: '0.2.0',
      id: chapterId,
      name: 'Friday Crew',
      currency: 'CHF',
      chapterState: 'open',
      potId,
      members: [
        { id: 'owner', name: 'Mina' },
        { id: 'leo', name: 'Leo' },
        { id: 'nina', name: 'Nina' },
      ],
      expenses: [
        {
          id: 'exp_dinner_zurich',
          amount: 120,
          currency: 'CHF',
          paidBy: 'owner',
          memo: 'Dinner',
          createdAt: now,
          splitMemberIds: ['owner', 'leo', 'nina'],
          source: 'spend_card',
        },
      ],
      legs: [
        { id: legId, fromMemberId: 'leo', toMemberId: 'owner', amount: 40, currency: 'CHF', state: 'open' },
        { id: 'leg_nina_to_mina', fromMemberId: 'nina', toMemberId: 'owner', amount: 40, currency: 'CHF', state: 'open' },
      ],
      spendCards: [
        {
          id: 'sc_friday_crew',
          label: 'Friday Crew',
          recentParticipantIds: ['owner', 'leo', 'nina'],
          settlementPreference: 'twint',
          defaultSplitRule: 'equal',
        },
      ],
      createdAt: now,
    };
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
      expenses: [
        {
          id: 'exp_dinner_zurich',
          amount: 120,
          currency: 'CHF',
          paidBy: 'owner',
          memo: 'Dinner',
          date: now,
          split: [
            { memberId: 'owner', amount: 40 },
            { memberId: 'leo', amount: 40 },
            { memberId: 'nina', amount: 40 },
          ],
          attestations: [],
          hasReceipt: false,
        },
      ],
      history: [],
      archived: false,
      budgetEnabled: false,
      checkpointEnabled: false,
      mode: 'auditable',
      confirmationsEnabled: true,
      chapter,
      lastEditAt: now,
    };
    const payToken = `cap_test_pay_${Date.now()}`;
    window.localStorage.setItem('chopdot_pots', JSON.stringify([pot]));
    window.localStorage.setItem(
      'chopdot_capture_link_tokens',
      JSON.stringify([
        {
          token: payToken,
          type: 'pay',
          payload: {
            chapterId,
            potId,
            legId,
            fromMemberId: 'leo',
            toMemberId: 'owner',
            toMemberName: 'Mina',
            amount: 40,
            currency: 'CHF',
            exp: Date.now() + 60 * 60 * 1000,
          },
        },
      ]),
    );
    window.sessionStorage.setItem('chopdot_capture_acting_member', 'leo');
    return { payToken, legId, chapterId, receiverId: 'owner' };
  }, CAPTURE_POT_ID);
}

test.describe('Capture pay/confirm links (P1b)', () => {
  test('pay link → mark paid → confirm link closes leg', async ({ page }) => {
    await continueAsGuest(page);
    const linkBundle = await seedOpenFriendPayment(page);

    await page.goto(`/pay?t=${linkBundle.payToken}`);
    await expect(page.getByTestId('capture-handoff-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('capture-pay-entry-guide')).toContainText('40.00 CHF');
    await expect(page.getByTestId('capture-pay-entry-guide')).toContainText('to Mina');
    await expect(page.getByTestId('handoff-panel-twint')).toContainText('Pay with TWINT');
    await expect(page.getByTestId('capture-chapter-status')).toHaveCount(0);
    await expect(page.getByTestId('capture-action-queue')).toHaveCount(0);
    await page.getByTestId('capture-handoff-mark-paid').click();
    await expect(page.getByTestId('capture-handoff-waiting-confirmation')).toContainText('Marked paid');
    await expect(page.getByTestId('capture-handoff-waiting-confirmation')).toContainText('Mina confirms next');

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
    await expect(page.getByTestId('capture-confirm-entry-guide')).toContainText('40.00 CHF');
    await expect(page.getByTestId('capture-confirm-entry-guide')).toContainText('From Leo');
    await page.getByTestId('capture-confirm-submit').click();
    await expect(page.getByTestId('capture-confirm-done')).toContainText('Confirmed received');
    await expect(page.getByTestId('capture-link-error-screen')).toHaveCount(0);
  });
});
