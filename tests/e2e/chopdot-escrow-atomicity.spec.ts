import { expect, test, type Page } from '@playwright/test';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function enterAsGuest(page: Page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await guest.click();
  }
}

async function openEscrowPot(page: Page, name: string) {
  await page.goto('/pots?chopdot-escrow-lab=1&chopdot-dot-dev=1');
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${escapeRegex(name)} pot`) });
  await expect(potButton).toBeVisible({ timeout: 10_000 });
  await potButton.click();
  await expect(page.getByTestId('chapter-home')).toBeVisible();
}

async function tab(page: Page, name: 'Overview' | 'People' | 'Activity' | 'Settings') {
  await page.getByTestId('chapter-tabs').getByRole('button', { name }).click();
}

async function chooseDemoPerson(page: Page, name: string) {
  await tab(page, 'People');
  await page.getByRole('button', { name: new RegExp(`^${name}\\b`) }).click();
  await tab(page, 'Overview');
}

async function openDeveloperChecks(page: Page) {
  await tab(page, 'Settings');
  await page.getByText('Developer checks').click();
}

async function recordHeldEvidence(page: Page, payerName: string) {
  await openDeveloperChecks(page);
  await page.getByRole('button', { name: `Add lab-held evidence for ${payerName}` }).click();
  await tab(page, 'Overview');
}

async function clickObligationAction(page: Page, obligationId: string, actionName: string) {
  await tab(page, 'People');
  await page.getByTestId(`obligation-${obligationId}`).getByRole('button', { name: actionName }).click();
  await tab(page, 'Overview');
}

async function clickReleaseAction(page: Page, actionName: string) {
  await page.getByTestId('release-panel').getByRole('button', { name: actionName }).click();
}

async function clickGuidedPrimary(page: Page, actionName: string) {
  const action = page.getByTestId('guided-primary-action');
  await expect(action).toHaveText(actionName);
  await action.click();
}

test.describe('ChopDot escrow atomicity lab', () => {
  test('held evidence stays separate from payment and confirmation across all chapter modes', async ({ page }) => {
    const cases = [
      { pot: 'Dinner split', payer: 'Leo', blocker: 'Leo has not marked $80 paid' },
      { pot: 'Friday savings circle', payer: 'Leo', blocker: 'Leo has not marked $100 paid' },
      { pot: 'Emergency support for Jordan', payer: 'Casey', blocker: 'Casey has not marked $150 paid' },
      { pot: 'Builder house community fund', payer: 'Sam', blocker: 'Sam has not marked 300 USDC paid' },
    ];

    for (const item of cases) {
      await openEscrowPot(page, item.pot);
      await recordHeldEvidence(page, item.payer);

      await expect(page.getByTestId('escrow-status')).toContainText('Lab evidence only');
      await expect(page.getByTestId('escrow-status')).toContainText('ChopDot is not holding funds');
      await expect(page.getByTestId('escrow-status')).toContainText('People still need to mark paid');
      await expect(page.getByTestId('blockers')).toContainText(item.blocker);
      await expect(page.getByTestId('receipt-preview')).toContainText('Private record');
    }
  });

  test('escrow lab controls stay hidden from the normal ChopDot surface', async ({ page }) => {
    await page.goto('/pots?chopdot-dot-dev=1');
    await enterAsGuest(page);
    const potButton = page.getByRole('button', { name: /Open Dinner split pot/ });
    await expect(potButton).toBeVisible({ timeout: 10_000 });
    await potButton.click();
    await expect(page.getByTestId('chapter-home')).toBeVisible();

    await expect(page.getByTestId('escrow-status')).toHaveCount(0);
    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
    await expect(page.getByTestId('escrow-dev-controls')).toHaveCount(0);
    await expect(page.getByText('guaranteeing payout')).toHaveCount(0);
  });

  test('group expense can close only after people mark paid and Mina confirms', async ({ page }) => {
    await openEscrowPot(page, 'Dinner split');

    await recordHeldEvidence(page, 'Leo');
    await clickObligationAction(page, 'obligation_1', 'Mark paid');
    await expect(page.getByTestId('blockers')).toContainText('Mina needs to confirm Leo');

    await chooseDemoPerson(page, 'Mina');
    await clickObligationAction(page, 'obligation_1', 'Confirm received');

    await chooseDemoPerson(page, 'Nina');
    await clickObligationAction(page, 'obligation_2', 'Mark paid');
    await chooseDemoPerson(page, 'Mina');
    await clickObligationAction(page, 'obligation_2', 'Confirm received');

    await chooseDemoPerson(page, 'Omar');
    await clickObligationAction(page, 'obligation_3', 'Mark paid');
    await chooseDemoPerson(page, 'Mina');
    await clickObligationAction(page, 'obligation_3', 'Confirm received');

    await clickReleaseAction(page, 'Prepare reimbursement');
    await clickReleaseAction(page, 'Approve release');
    await openDeveloperChecks(page);
    await page.getByRole('button', { name: 'Add lab release evidence' }).click();
    await tab(page, 'Overview');
    await expect(page.getByTestId('escrow-status')).toContainText('Receiver confirmation is still required');

    await clickReleaseAction(page, 'Mark released outside ChopDot');
    await clickReleaseAction(page, 'Confirm received');
    await clickGuidedPrimary(page, 'Close split');

    await expect(page.getByTestId('receipt-preview')).toContainText('Record closed');
    await tab(page, 'Activity');
    await expect(page.getByTestId('chapter-activity')).toContainText('Lab-held evidence added');
    await expect(page.getByTestId('chapter-activity')).toContainText('ChopDot is not holding funds');
    await expect(page.getByTestId('chapter-activity')).toContainText('Release evidence added');
    await expect(page.getByTestId('chapter-activity')).toContainText('not an automatic payout');
    await expect(page.getByTestId('chapter-activity')).toContainText('Closed');
  });

  test('wrong person cannot add held evidence for another payer', async ({ page }) => {
    await openEscrowPot(page, 'Dinner split');
    await chooseDemoPerson(page, 'Vera');
    await openDeveloperChecks(page);
    await page.getByRole('button', { name: 'Add lab-held evidence for Leo' }).click();
    await tab(page, 'Activity');

    await expect(page.getByTestId('chapter-activity')).toContainText('Held evidence blocked');
    await expect(page.getByTestId('chapter-activity')).toContainText('Leo must add this held evidence');
  });
});
