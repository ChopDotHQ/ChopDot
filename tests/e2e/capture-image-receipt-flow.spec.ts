import { test, expect } from '@playwright/test';
import path from 'path';

const CAPTURE_POT_ID = 'image-receipt-pot';

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

test.describe('Image Receipt OCR OCR Splitting', () => {
  test('scan image receipt, assign items, and settle', async ({ page }) => {
    await continueAsGuest(page);
    await seedCapturePot(page);
    await page.reload();
    await page.waitForURL('**/pots', { timeout: 10_000 });

    await openCapturePot(page);
    await openSpendCard(page);
    await expect(page.getByTestId('spend-card-add-receipt')).toContainText('Scan receipt');

    // Upload the generated receipt image
    await page.getByTestId('spend-card-receipt-file').setInputFiles(
      path.resolve(process.cwd(), 'tests/e2e/fixtures/test-receipt.png')
    );

    // OCR might take a few seconds
    await expect(page.getByTestId('spend-card-checkout-notice')).toContainText('Receipt read', { timeout: 30_000 });
    
    // Check that OCR parsed the items successfully
    await expect(page.getByTestId('spend-card-evidence-summary')).toContainText('Receipt');
    await expect(page.getByTestId('spend-card-evidence-summary')).toContainText('ZURICH TRATTORIA');
    await expect(page.getByTestId('spend-card-receipt-items')).toContainText('125.00 CHF');
    
    // Check the items
    await expect(page.getByTestId('spend-card-receipt-items')).toContainText('Ribeye Steak');
    await expect(page.getByTestId('spend-card-receipt-items')).toContainText('Caesar Salad');
    await expect(page.getByTestId('spend-card-receipt-items')).toContainText('Glass Red Wine');

    // Assign items
    // First expand the split details
    await page.getByText('Change split').click();

    // Helper to assign an item exclusively to one person
    const assignTo = async (itemName: string, memberName: string) => {
      const row = page.locator('div.rounded-2xl').filter({ has: page.locator('p.text-caption.font-medium', { hasText: itemName }) });
      const members = ['Mina', 'Leo', 'Nina'];
      for (const m of members) {
        if (m !== memberName) {
          // Unclick the ones that aren't the target member to isolate
          await row.locator('button', { hasText: m }).click();
        }
      }
    };

    // Leo gets the Ribeye Steak
    await assignTo('Ribeye Steak', 'Leo');
    
    // Nina gets the Caesar Salad
    await assignTo('Caesar Salad', 'Nina');
    
    // Mina gets the Wine, Water, Tiramisu
    await assignTo('Glass Red Wine', 'Mina');
    await assignTo('Sparkling Water', 'Mina');
    await assignTo('Tiramisu', 'Mina');

    // Send TWINT links
    await page.getByTestId('spend-card-pay-now').click();
    
    // Wait for the chapter status
    await expect(page.getByTestId('capture-chapter-status')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('capture-chapter-status')).toContainText('2 shares open');
    
    // Leo pays
    await setActingMember(page, 'leo');
    await page.reload();
    await openCapturePot(page);
    await openSpendCard(page);
    const leoMarkPaid = page.locator('[data-testid$="-mark-paid"]').first();
    await expect(leoMarkPaid).toBeEnabled({ timeout: 10_000 });
    await leoMarkPaid.click();
    await expect(page.getByTestId('capture-chapter-status')).toContainText('waiting confirmation');

    // Nina pays
    await setActingMember(page, 'nina');
    await page.reload();
    await openCapturePot(page);
    await openSpendCard(page);
    const ninaMarkPaid = page.locator('[data-testid$="-mark-paid"]').first();
    await expect(ninaMarkPaid).toBeEnabled({ timeout: 10_000 });
    await ninaMarkPaid.click();

    // Mina confirms
    await setActingMember(page, 'owner');
    await page.reload();
    await openCapturePot(page);
    
    // Mina confirms Leo
    const confirmLeo = page.locator('button[data-testid$="-confirm"]').first();
    await expect(confirmLeo).toBeEnabled({ timeout: 10_000 });
    await confirmLeo.click();
    
    // Mina confirms Nina
    const confirmNina = page.locator('button[data-testid$="-confirm"]').first();
    await expect(confirmNina).toBeEnabled({ timeout: 10_000 });
    await confirmNina.click();
    
    // Closeout
    await expect(page.getByTestId('capture-ready-to-close')).toContainText('ready to close', {
      timeout: 10_000,
    });
    await page.getByTestId('capture-close-record').click();
    await expect(page.getByTestId('capture-record-closed')).toContainText('Record saved', {
      timeout: 10_000,
    });
  });
});
