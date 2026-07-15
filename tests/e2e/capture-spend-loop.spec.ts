import { test, expect } from '@playwright/test';

const CAPTURE_POT_ID = 'capture-test-pot';

async function continueAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/pots');
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots', { timeout: 10_000 });
  await expect(page.getByText('Sign in to ChopDot')).not.toBeVisible({ timeout: 10_000 });
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
  }, CAPTURE_POT_ID);
}

async function openCapturePot(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Friday Crew' }).click();
  await expect(page.getByTestId('pot-open-spend-card')).toBeVisible({ timeout: 10_000 });
}

async function openSpendCard(page: import('@playwright/test').Page) {
  await page.getByTestId('pot-open-spend-card').click();
  await expect(page.getByTestId('spend-card-screen')).toBeVisible();
}

async function setActingMember(page: import('@playwright/test').Page, memberId: string) {
  await page.evaluate((id) => {
    window.sessionStorage.setItem('chopdot_capture_acting_member', id);
  }, memberId);
}

test.describe('Capture spend loop (P1a)', () => {
  test('guest: spend card → legs → mark paid → confirm', async ({ page }) => {
    await continueAsGuest(page);
    await seedCapturePot(page);
    await page.reload();
    await page.waitForURL('**/pots', { timeout: 10_000 });

    await openCapturePot(page);
    await expect(page.getByTestId('pot-open-spend-card')).toContainText('Split this payment');
    await expect(page.getByTestId('pot-open-spend-card')).toContainText('CHF');
    await openSpendCard(page);
    await expect(page.getByTestId('spend-entry-guide')).toContainText('Friday Crew');
    await expect(page.getByTestId('spend-entry-guide')).toContainText('Add receipt');
    await expect(page.getByTestId('receipt-placeholder')).toContainText('With Leo, Nina');
    await expect(page.getByTestId('receipt-placeholder')).toContainText('TWINT');
    await expect(page.locator('body')).not.toContainText(
      /evidence|rail|kernel|adapter|obligation|chapter|test-token|raw JSON|protocol|settlement|native|state machine/i,
    );
    await expect(page.getByTestId('spend-card-checkout-capture')).not.toBeVisible();
    await expect(page.getByTestId('spend-card-add-receipt')).toContainText('Add receipt');
    await expect(page.getByTestId('spend-card-paste-link')).toContainText('Paste payment link');
    await expect(page.getByTestId('spend-card-enter-total')).toContainText('Enter total instead');
    await expect(page.getByTestId('spend-card-quick-amount')).toHaveCount(0);
    await expect(page.getByTestId('spend-card-pay-now')).toHaveCount(0);
    await expect(page.getByTestId('receipt-item-add')).toHaveCount(0);
    await page.getByTestId('spend-card-paste-link').click();

    await expect(page.getByTestId('spend-card-checkout-capture')).toContainText('Paste payment link');
    await page
      .getByTestId('spend-card-checkout-evidence')
      .fill('w3spay://request?amount=120&currency=CHF&merchant=Cafe%20Zola&memo=Dinner&status=failed');
    await page.getByTestId('spend-card-use-checkout-evidence').click();
    await expect(page.getByTestId('spend-card-checkout-error')).toContainText('checkout failed');
    await expect(page.getByTestId('receipt-item-row')).toHaveCount(0);

    await page.getByTestId('spend-card-receipt-file').setInputFiles({
      name: 'zurich-trattoria-receipt.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from([
        'Zurich Trattoria',
        '24.06.2026',
        'Pasta 38.00',
        'Salad 22.00',
        'Wine 60.00',
        'Total CHF 120.00',
      ].join('\n')),
    });
    await expect(page.getByTestId('spend-card-evidence-summary')).toContainText('Receipt');
    await expect(page.getByTestId('spend-card-evidence-summary')).toContainText('Zurich Trattoria');
    await expect(page.getByTestId('spend-card-evidence-summary')).toContainText('Saved');

    await expect(page.getByTestId('spend-entry-guide')).toContainText('Ready to split');
    await expect(page.getByTestId('spend-entry-guide')).toContainText('120.00 CHF');
    await expect(page.getByTestId('spend-card-receipt-items')).toContainText('120.00 CHF');
    await expect(page.getByTestId('receipt-item-row')).toHaveCount(3);
    await expect(page.getByTestId('spend-card-receipt-items')).toContainText('Pasta');
    await expect(page.getByTestId('spend-card-receipt-items')).toContainText('Wine');
    await expect(page.getByTestId('receipt-item-total')).toContainText('120.00 CHF');
    await expect(page.getByTestId('spend-card-rail-choice')).toContainText('Change payment app · TWINT');
    await expect(page.getByTestId('spend-card-pay-now')).toContainText('Split this payment');

    await page.getByTestId('spend-card-pay-now').click();

    await expect(page.getByTestId('spend-card-created-summary')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('spend-card-created-summary')).toContainText('Pay links');
    await expect(page.getByText('Leo → Mina · 40.00 CHF')).toBeVisible();
    await expect(page.getByText('Nina → Mina · 40.00 CHF')).toBeVisible();
    await expect(page.getByTestId('capture-chapter-status')).toHaveCount(0);

    await setActingMember(page, 'leo');
    await page.reload();
    await openCapturePot(page);
    await openSpendCard(page);

    const markPaidButton = page.locator('[data-testid$="-mark-paid"]').first();
    await expect(markPaidButton).toBeEnabled({ timeout: 10_000 });
    await markPaidButton.click();
    await expect(page.getByTestId('capture-chapter-status')).toContainText('Marked paid');
    await expect(page.getByTestId('capture-group-guidance')).toContainText('waiting for confirmation');
    await expect(page.getByTestId('capture-action-queue')).toContainText('Waiting to confirm');

    await setActingMember(page, 'owner');
    await page.reload();
    await openCapturePot(page);
    await openSpendCard(page);

    const confirmButton = page.locator('button[data-testid$="-confirm"]').first();
    await expect(confirmButton).toBeEnabled({ timeout: 10_000 });
    await expect(confirmButton).toHaveText('Confirm received');
    await expect(page.getByTestId('capture-action-queue')).toContainText('Your turn');
    await expect(page.getByTestId('capture-action-queue')).toContainText('Confirm Leo');
    await confirmButton.click();

    await expect(page.getByTestId('spend-card-created-summary')).toContainText('1 open', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('capture-chapter-status')).toHaveCount(0);

    await setActingMember(page, 'nina');
    await page.goto('/pots');
    await openCapturePot(page);
    await openSpendCard(page);

    const ninaMarkPaidButton = page.locator('[data-testid$="-mark-paid"]').first();
    await expect(ninaMarkPaidButton).toBeEnabled({ timeout: 10_000 });
    await ninaMarkPaidButton.click();
    await expect(page.getByTestId('capture-chapter-status')).toContainText('Marked paid');

    await setActingMember(page, 'owner');
    await page.goto('/pots');
    await openCapturePot(page);
    await openSpendCard(page);

    const ninaConfirmButton = page.locator('button[data-testid$="-confirm"]').first();
    await expect(ninaConfirmButton).toBeEnabled({ timeout: 10_000 });
    await expect(page.getByTestId('capture-action-queue')).toContainText('Confirm Nina');
    await ninaConfirmButton.click();

    await expect(page.getByTestId('capture-ready-to-close')).toContainText('All shares confirmed', {
      timeout: 10_000,
    });
    await page.getByTestId('capture-close-record').click();
    await expect(page.getByTestId('capture-record-closed')).toContainText('Record saved', {
      timeout: 10_000,
    });
  });
});
