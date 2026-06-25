import { expect, test, type Page } from '@playwright/test';

type AgentWalletCase = {
  scenarioId: string;
  chapterId: string;
  potName: string;
  person: string;
  expectedActivity: string;
};

const SESSION = 'agent-wallet-trial-2026-06-22';

const cases: AgentWalletCase[] = [
  {
    scenarioId: 'group_expense',
    chapterId: 'dot-shared-expense-chapter',
    potName: 'Dinner split',
    person: 'mina',
    expectedActivity: 'Group expense: 2 finalized public-testnet transfer(s) matched the right shares.',
  },
  {
    scenarioId: 'savings_circle',
    chapterId: 'dot-savings-circle-chapter',
    potName: 'Friday savings circle',
    person: 'mina',
    expectedActivity: 'Savings circle: 4 finalized public-testnet transfer(s) matched the right shares.',
  },
  {
    scenarioId: 'emergency_pot',
    chapterId: 'dot-emergency-pot-chapter',
    potName: 'Emergency support for Jordan',
    person: 'riley',
    expectedActivity: 'Emergency pot: 2 finalized public-testnet transfer(s) matched the right shares.',
  },
  {
    scenarioId: 'community_fund',
    chapterId: 'dot-community-fund-chapter',
    potName: 'Builder house community fund',
    person: 'alex',
    expectedActivity: 'Community fund: 2 finalized public-testnet transfer(s) matched the right shares.',
  },
];

async function enterAsGuest(page: Page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await guest.click();
  }
}

async function resetNativeSession(page: Page, chapterId: string, sessionId: string) {
  await page.request.post('/__chopdot_dot_statement_store/reset', {
    data: { chapterId, sessionId },
  });
}

async function openAgentWalletPot(page: Page, item: AgentWalletCase, runId = `${Date.now()}`) {
  const sessionId = `${SESSION}-${item.scenarioId}-${runId}`;
  await page.goto('/pots');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await resetNativeSession(page, item.chapterId, sessionId);
  await page.goto(`/pots?chopdot-dot-native=1&agent-wallet-trial=${SESSION}&chopdot-dot-session=${sessionId}&scenario=${item.scenarioId}&person=${item.person}`);
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${item.potName} pot`) });
  await expect(potButton).toBeVisible({ timeout: 10_000 });
  await potButton.click();
  await expect(page.getByTestId('chapter-home')).toBeVisible();
}

test.describe('Agent wallet PAS scenarios', () => {
  for (const item of cases) {
    test(`${item.scenarioId} imports finalized PAS movement as received payment evidence`, async ({ page }, testInfo) => {
      await openAgentWalletPot(page, item, `${testInfo.workerIndex}-${testInfo.retry}-${item.scenarioId}`);

      await expect(page.getByTestId('native-sync-status')).toContainText('up to date', { timeout: 15_000 });
      await expect(page.getByTestId('receipt-preview')).toContainText('Record closed', { timeout: 20_000 });
      await expect(page.getByTestId('receipt-preview')).toContainText('Record closed. The receipt shows what the group confirmed or noted.');

      await page.getByTestId('chapter-tabs').getByRole('button', { name: 'Activity' }).click();
      await expect(page.getByTestId('chapter-activity')).toContainText('PAS payments recorded');
      await expect(page.getByTestId('chapter-activity')).toContainText(item.expectedActivity);
      await expect(page.getByTestId('chapter-activity')).toContainText('Closed');
    });
  }

  test('emergency receipt stays redacted after PAS evidence closes the scenario', async ({ page }) => {
    const item = cases.find((candidate) => candidate.scenarioId === 'emergency_pot');
    if (!item) throw new Error('Missing emergency case');
    await openAgentWalletPot(page, item, `redaction-${Date.now()}`);

    await expect(page.getByTestId('receipt-preview')).toContainText('Record closed', { timeout: 20_000 });
    await page.getByRole('button', { name: 'Review receipt' }).click();
    await expect(page.getByTestId('receipt-review')).toContainText('Redacted export');
    await expect(page.getByTestId('receipt-review')).not.toContainText('Private medical details');
    await expect(page.getByTestId('receipt-review')).not.toContainText('0x09865e617472075075ed575608fb5f6e455bf34a24ddb269c799412381536115');
  });
});
