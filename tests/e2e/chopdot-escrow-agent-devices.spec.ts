import { expect, test, type Browser, type Page } from '@playwright/test';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function enterAsGuest(page: Page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await guest.click();
  }
}

async function openNativePot(page: Page, potName: string, session: string, person: string) {
  await page.goto(`/pots?chopdot-dot-native=1&chopdot-dot-dev=1&chopdot-dot-session=${session}&person=${person}`);
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${escapeRegex(potName)} pot`) });
  await expect(potButton).toBeVisible({ timeout: 10_000 });
  await potButton.click();
  await expect(page.getByTestId('chapter-home')).toBeVisible();
  await expect(page.getByTestId('native-sync-status')).toContainText('up to date', { timeout: 10_000 });
}

async function openEscrowLabPot(page: Page, potName: string, person: string) {
  await page.goto(`/pots?chopdot-escrow-lab=1&chopdot-dot-dev=1&person=${person}`);
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${escapeRegex(potName)} pot`) });
  await expect(potButton).toBeVisible({ timeout: 10_000 });
  await potButton.click();
  await expect(page.getByTestId('chapter-home')).toBeVisible();
}

async function tab(page: Page, name: 'Overview' | 'People' | 'Activity' | 'Settings') {
  await page.getByTestId('chapter-tabs').getByRole('button', { name }).click();
}

async function withDevicePage(browser: Browser, fn: (page: Page) => Promise<void>) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

test.describe('ChopDot escrow-mode agents on separate devices', () => {
  const cases = [
    {
      mode: 'group-expense',
      potName: 'Dinner split',
      payer: 'leo',
      confirmer: 'mina',
      blocker: 'Mina needs to confirm Leo',
    },
    {
      mode: 'savings-circle',
      potName: 'Friday savings circle',
      payer: 'leo',
      confirmer: 'mina',
      blocker: 'Mina needs to confirm Leo',
    },
    {
      mode: 'emergency-pot',
      potName: 'Emergency support for Jordan',
      payer: 'casey',
      confirmer: 'riley',
      blocker: 'Riley needs to confirm Casey',
    },
    {
      mode: 'community-fund',
      potName: 'Builder house community fund',
      payer: 'sam',
      confirmer: 'alex',
      blocker: 'Alex needs to confirm Sam',
    },
  ];

  for (const item of cases) {
    test(`${item.mode} first payment converges across separate devices`, async ({ browser }, testInfo) => {
      const session = `escrow-agent-${item.mode}-${testInfo.project.name}-${Date.now()}`.replace(/[^a-z0-9-]/gi, '-');

      await withDevicePage(browser, async (payerPage) => {
        await openNativePot(payerPage, item.potName, session, item.payer);
        await expect(payerPage.getByTestId('guided-primary-action')).toHaveText('Mark paid');
        await payerPage.getByTestId('guided-primary-action').click();
        await expect(payerPage.getByTestId('native-sync-status')).toContainText('up to date', { timeout: 10_000 });
      });

      await withDevicePage(browser, async (confirmerPage) => {
        await openNativePot(confirmerPage, item.potName, session, item.confirmer);
        await expect(confirmerPage.getByTestId('blockers')).toContainText(item.blocker, { timeout: 10_000 });
        await expect(confirmerPage.getByTestId('guided-primary-action')).toHaveText('Confirm received');
        await confirmerPage.getByTestId('guided-primary-action').click();
        await expect(confirmerPage.getByTestId('blockers')).not.toContainText(item.blocker, { timeout: 10_000 });
      });
    });
  }

  test('viewer cannot add another person held evidence from their own device', async ({ browser }) => {
    await withDevicePage(browser, async (viewerPage) => {
      await openEscrowLabPot(viewerPage, 'Dinner split', 'vera');
      await tab(viewerPage, 'Settings');
      await viewerPage.getByText('Developer checks').click();
      await viewerPage.getByRole('button', { name: 'Add lab-held evidence for Leo' }).click();
      await tab(viewerPage, 'Activity');

      await expect(viewerPage.getByTestId('chapter-activity')).toContainText('Held evidence blocked');
      await expect(viewerPage.getByTestId('chapter-activity')).toContainText('Leo must add this held evidence');
    });
  });
});
