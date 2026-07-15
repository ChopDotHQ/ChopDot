import { expect, test } from '@playwright/test';

const POT_ID = 'pas-payment-link-pot';
const SESSION = 'agent-wallet-trial-2026-06-22';

async function continueAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots', { timeout: 10_000 });
}

async function seedWalletFriendPayment(
  page: import('@playwright/test').Page,
  options: { currency?: 'PAS' | 'DOT' | 'USDC'; amount?: number; legId?: string } = {},
) {
  return page.evaluate(({ potId, currency, amount, legId }) => {
    const now = new Date().toISOString();
    const chapterId = `chapter_${potId}`;
    const paymentLegId = legId ?? `leg_leo_to_mina_${currency.toLowerCase()}`;
    const chapter = {
      schemaVersion: '0.2.0',
      id: chapterId,
      name: 'Friday Crew',
      currency,
      chapterState: 'open',
      potId,
      members: [
        { id: 'mina', name: 'Mina' },
        { id: 'leo', name: 'Leo' },
        { id: 'nina', name: 'Nina' },
      ],
      expenses: [
        {
          id: `exp_${currency.toLowerCase()}_dinner`,
          amount: amount * 3,
          currency,
          paidBy: 'mina',
          memo: 'Dinner',
          createdAt: now,
          splitMemberIds: ['mina', 'leo', 'nina'],
          source: 'spend_card',
        },
      ],
      legs: [
        { id: paymentLegId, fromMemberId: 'leo', toMemberId: 'mina', amount, currency, state: 'open' },
        { id: `leg_nina_to_mina_${currency.toLowerCase()}`, fromMemberId: 'nina', toMemberId: 'mina', amount, currency, state: 'open' },
      ],
      spendCards: [
        {
          id: 'sc_friday_crew',
          label: 'Friday Crew',
          recentParticipantIds: ['mina', 'leo', 'nina'],
          settlementPreference: currency.toLowerCase(),
          defaultSplitRule: 'equal',
        },
      ],
      createdAt: now,
    };
    const pot = {
      id: potId,
      name: 'Friday Crew',
      type: 'expense',
      baseCurrency: currency,
      members: [
        { id: 'mina', name: 'Mina', role: 'Owner', status: 'active' },
        { id: 'leo', name: 'Leo', role: 'Member', status: 'active' },
        { id: 'nina', name: 'Nina', role: 'Member', status: 'active' },
      ],
      expenses: [
        {
          id: `exp_${currency.toLowerCase()}_dinner`,
          amount: amount * 3,
          currency,
          paidBy: 'mina',
          memo: 'Dinner',
          date: now,
          split: [
            { memberId: 'mina', amount },
            { memberId: 'leo', amount },
            { memberId: 'nina', amount },
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
    const payToken = `cap_test_${currency.toLowerCase()}_pay_${Date.now()}`;
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
            legId: paymentLegId,
            fromMemberId: 'leo',
            toMemberId: 'mina',
            toMemberName: 'Mina',
            amount,
            currency,
            exp: Date.now() + 60 * 60 * 1000,
          },
        },
      ]),
    );
    window.sessionStorage.setItem('chopdot_capture_acting_member', 'leo');
    return { payToken, legId: paymentLegId };
  }, {
    potId: POT_ID,
    currency: options.currency ?? 'PAS',
    amount: options.amount ?? 0.011,
    legId: options.legId,
  });
}

test.describe.skip('legacy artifact-backed wallet payment link', () => {
  test('matching public-testnet PAS payment clears only the exact share', async ({ page }) => {
    await continueAsGuest(page);
    const seeded = await seedWalletFriendPayment(page);

    await page.goto(`/pay?t=${seeded.payToken}&agent-wallet-trial=${SESSION}&pas-scenario=group_expense`);
    await expect(page.getByTestId('capture-handoff-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('capture-pay-entry-guide')).toContainText('0.01 PAS');
    await expect(page.getByTestId('handoff-panel-pas')).toContainText('Pay with PAS');
    await expect(page.getByTestId('handoff-panel-pas')).toContainText('Pay from your wallet');

    await page.getByTestId('capture-handoff-check-wallet').click();
    await expect(page.getByTestId('capture-handoff-wallet-received')).toContainText('Payment received', { timeout: 10_000 });

    const states = await page.evaluate(() => {
      const [pot] = JSON.parse(window.localStorage.getItem('chopdot_pots') ?? '[]');
      return pot.chapter.legs.map((leg: any) => ({ id: leg.id, state: leg.state }));
    });
    expect(states).toEqual([
      { id: 'leg_leo_to_mina_pas', state: 'confirmed' },
      { id: 'leg_nina_to_mina_pas', state: 'open' },
    ]);
  });

  test('matching DOT report clears only the exact DOT share', async ({ page }) => {
    await continueAsGuest(page);
    const seeded = await seedWalletFriendPayment(page, { currency: 'DOT', amount: 0.021 });
    await page.route('**/__agent_wallet_trial/pas-report?**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          executionMode: 'executed_public_testnet_wallet',
          scenarios: [
            {
              id: 'group_expense',
              name: 'Group expense',
              transfers: [
                {
                  from: 'leo',
                  to: 'mina',
                  currency: 'DOT',
                  amount: '0.021',
                  status: 'finalized',
                  txHash: '0xdot',
                  product: { clearsPayment: true },
                },
              ],
            },
          ],
        }),
      });
    });

    await page.goto(`/pay?t=${seeded.payToken}&agent-wallet-trial=dot-fixture&wallet-scenario=group_expense`);
    await expect(page.getByTestId('handoff-panel-dot')).toContainText('Pay with DOT');
    await page.getByTestId('capture-handoff-check-wallet').click();
    await expect(page.getByTestId('capture-handoff-wallet-received')).toContainText('Payment received', { timeout: 10_000 });

    const states = await page.evaluate(() => {
      const [pot] = JSON.parse(window.localStorage.getItem('chopdot_pots') ?? '[]');
      return pot.chapter.legs.map((leg: any) => ({ id: leg.id, state: leg.state }));
    });
    expect(states).toEqual([
      { id: 'leg_leo_to_mina_dot', state: 'confirmed' },
      { id: 'leg_nina_to_mina_dot', state: 'open' },
    ]);
  });

  test('matching TEST_USDC wallet report clears only the exact USDC share', async ({ page }) => {
    await continueAsGuest(page);
    const seeded = await seedWalletFriendPayment(page, { currency: 'USDC', amount: 0.021 });

    await page.goto(`/pay?t=${seeded.payToken}&agent-wallet-trial=${SESSION}&wallet-scenario=group_expense`);
    await expect(page.getByTestId('handoff-panel-usdc')).toContainText('Pay with USDC');
    await page.getByTestId('capture-handoff-check-wallet').click();
    await expect(page.getByTestId('capture-handoff-wallet-received')).toContainText('Payment received', { timeout: 10_000 });

    const states = await page.evaluate(() => {
      const [pot] = JSON.parse(window.localStorage.getItem('chopdot_pots') ?? '[]');
      return pot.chapter.legs.map((leg: any) => ({ id: leg.id, state: leg.state }));
    });
    expect(states).toEqual([
      { id: 'leg_leo_to_mina_usdc', state: 'confirmed' },
      { id: 'leg_nina_to_mina_usdc', state: 'open' },
    ]);
  });

  test('wrong currency and missing funds keep the share open', async ({ page }) => {
    await continueAsGuest(page);
    const seeded = await seedWalletFriendPayment(page, { currency: 'USDC', amount: 0.021 });
    await page.route('**/__agent_wallet_trial/pas-report?**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          executionMode: 'executed_public_testnet_wallet',
          scenarios: [
            {
              id: 'group_expense',
              name: 'Group expense',
              transfers: [
                {
                  from: 'leo',
                  to: 'mina',
                  currency: 'DOT',
                  amount: '0.021',
                  status: 'finalized',
                  txHash: '0xwrong',
                  product: { clearsPayment: true },
                },
              ],
            },
          ],
        }),
      });
    });

    await page.goto(`/pay?t=${seeded.payToken}&agent-wallet-trial=usdc-fixture&wallet-scenario=group_expense`);
    await expect(page.getByTestId('handoff-panel-usdc')).toContainText('Pay with USDC');
    await page.getByTestId('capture-handoff-check-wallet').click();
    await expect(page.getByTestId('capture-handoff-wallet-wrong-currency')).toContainText('Wrong currency');

    const wrongCurrencyState = await page.evaluate(() => {
      const [pot] = JSON.parse(window.localStorage.getItem('chopdot_pots') ?? '[]');
      return pot.chapter.legs.find((leg: any) => leg.id === 'leg_leo_to_mina_usdc').state;
    });
    expect(wrongCurrencyState).toBe('open');

    await page.unroute('**/__agent_wallet_trial/pas-report?**');
    await page.route('**/__agent_wallet_trial/pas-report?**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          executionMode: 'executed_public_testnet_wallet',
          scenarios: [
            {
              id: 'group_expense',
              name: 'Group expense',
              transfers: [
                {
                  from: 'leo',
                  to: 'mina',
                  currency: 'USDC',
                  amount: '0.021',
                  status: 'failed',
                  failureReason: 'insufficient balance',
                  product: { clearsPayment: false },
                },
              ],
            },
          ],
        }),
      });
    });
    await page.reload();
    await page.getByTestId('capture-handoff-check-wallet').click();
    await expect(page.getByTestId('capture-handoff-wallet-needs-funds')).toContainText('Wallet needs funds');
  });
});
