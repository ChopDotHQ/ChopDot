import { expect, test, type Page, type TestInfo } from '@playwright/test';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function enterAsGuest(page: Page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await guest.click();
  }
}

async function openChapterPot(page: Page, name: string) {
  await page.goto('/pots');
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${escapeRegex(name)} pot`) });
  await expect(potButton).toBeVisible({ timeout: 10_000 });
  await potButton.click();
  await expect(page.getByTestId('chapter-home')).toBeVisible();
  await expect(page.getByTestId('chapter-tabs')).toContainText('Overview');
  await expect(page.getByText('Pots').last()).toBeVisible();
}

async function openNativeChapterPot(page: Page, query: string, options: { person?: 'leo' | 'mina'; expectedStatus?: 'up to date' | 'needs refresh' } = {}) {
  const person = options.person ?? 'leo';
  await page.goto(`/pots?chopdot-dot-native=1&chopdot-dot-dev=1&person=${person}&${query}`);
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: /Open Friday savings circle pot/ });
  await expect(potButton).toBeVisible({ timeout: 10_000 });
  await potButton.click();
  await expect(page.getByTestId('chapter-home')).toBeVisible();
  if (options.expectedStatus) {
    await expect(page.getByTestId('native-sync-status')).toContainText(options.expectedStatus, { timeout: 8_000 });
  }
  if (options.expectedStatus === 'needs refresh') {
    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
  }
}

async function tab(page: Page, name: 'Overview' | 'People' | 'Activity' | 'Settings') {
  await page.getByTestId('chapter-tabs').getByRole('button', { name }).click();
}

async function chooseDemoPerson(page: Page, name: string) {
  await tab(page, 'People');
  await page.getByRole('button', { name: new RegExp(`^${name}\\b`) }).click();
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

function uniqueNativeSession(prefix: string, testInfo: TestInfo): string {
  return `${prefix}-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}`;
}

test.describe('ChopDot.dot native pot modes', () => {
  test('all three modes appear as real ChopDot pots', async ({ page }) => {
    await page.goto('/pots');
    await enterAsGuest(page);

    await expect(page.getByRole('button', { name: /Open Dinner split pot/ })).toContainText('Group expense');
    await expect(page.getByRole('button', { name: /Open Friday savings circle pot/ })).toContainText('Savings circle');
    await expect(page.getByRole('button', { name: /Open Emergency support for Jordan pot/ })).toContainText('Emergency pot');
    await expect(page.getByRole('button', { name: /Open Builder house community fund pot/ })).toContainText('Community fund');
  });

  test('savings circle completes a round through the native ChopDot surface', async ({ page }) => {
    await openChapterPot(page, 'Friday savings circle');

    await clickObligationAction(page, 'obligation_1', 'Mark paid');
    await expect(page.getByTestId('blockers')).toContainText('Mina needs to confirm Leo');

    await chooseDemoPerson(page, 'Mina');
    await clickObligationAction(page, 'obligation_1', 'Confirm received');

    await chooseDemoPerson(page, 'Omar');
    await clickObligationAction(page, 'obligation_3', 'Mark paid');
    await chooseDemoPerson(page, 'Mina');
    await clickObligationAction(page, 'obligation_3', 'Confirm received');
    await clickObligationAction(page, 'obligation_2', 'Record delay');

    await clickReleaseAction(page, 'Prepare payout');
    await clickReleaseAction(page, 'Approve payout');
    await chooseDemoPerson(page, 'Omar');
    await clickReleaseAction(page, 'Mark released outside ChopDot');
    await chooseDemoPerson(page, 'Leo');
    await clickReleaseAction(page, 'Confirm received');
    await chooseDemoPerson(page, 'Mina');
    await clickGuidedPrimary(page, 'Close round');

    await expect(page.getByTestId('receipt-preview')).toContainText('Record closed');
    await tab(page, 'Activity');
    await expect(page.getByTestId('chapter-activity')).toContainText('Closed');
  });

  test('emergency pot closes with redacted receipt behavior', async ({ page }) => {
    await openChapterPot(page, 'Emergency support for Jordan');

    await clickObligationAction(page, 'obligation_1', 'Mark paid');
    await chooseDemoPerson(page, 'Riley');
    await clickObligationAction(page, 'obligation_1', 'Confirm received');

    await chooseDemoPerson(page, 'Morgan');
    await clickObligationAction(page, 'obligation_2', 'Mark paid');
    await chooseDemoPerson(page, 'Riley');
    await clickObligationAction(page, 'obligation_2', 'Confirm received');

    await clickReleaseAction(page, 'Prepare release');
    await clickReleaseAction(page, 'Approve release');
    await chooseDemoPerson(page, 'Taylor');
    await clickReleaseAction(page, 'Approve release');
    await chooseDemoPerson(page, 'Riley');
    await clickReleaseAction(page, 'Mark released outside ChopDot');
    await chooseDemoPerson(page, 'Jordan');
    await clickReleaseAction(page, 'Confirm received');
    await chooseDemoPerson(page, 'Riley');
    await clickGuidedPrimary(page, 'Close pot');

    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
    const developerChecks = page.getByTestId('developer-checks');
    await expect(developerChecks).toContainText('"chapterName": "Emergency pot"');
    await expect(developerChecks).not.toContainText('Private medical details');
  });

  test('community fund completes approvals, release, and closeout', async ({ page }) => {
    await openChapterPot(page, 'Builder house community fund');

    await clickObligationAction(page, 'obligation_1', 'Mark paid');
    await chooseDemoPerson(page, 'Alex');
    await clickObligationAction(page, 'obligation_1', 'Confirm received');

    await chooseDemoPerson(page, 'Noor');
    await clickObligationAction(page, 'obligation_2', 'Mark paid');
    await chooseDemoPerson(page, 'Alex');
    await clickObligationAction(page, 'obligation_2', 'Confirm received');

    await clickReleaseAction(page, 'Prepare release');
    await clickReleaseAction(page, 'Approve release');
    await expect(page.getByTestId('blockers')).toContainText('Priya still needs to approve');

    await chooseDemoPerson(page, 'Sam');
    await expect(page.getByTestId('release-panel').getByRole('button', { name: 'Mark released outside ChopDot' })).toHaveCount(0);

    await chooseDemoPerson(page, 'Priya');
    await clickReleaseAction(page, 'Approve release');
    await chooseDemoPerson(page, 'Sam');
    await clickReleaseAction(page, 'Mark released outside ChopDot');
    await chooseDemoPerson(page, 'Jordan');
    await clickReleaseAction(page, 'Confirm received');
    await chooseDemoPerson(page, 'Alex');
    await clickGuidedPrimary(page, 'Close period');

    await expect(page.getByTestId('receipt-preview')).toContainText('Record closed');
  });

  test('emergency pot redacted open-item receipt hides private names and blocker details', async ({ page }) => {
    await openChapterPot(page, 'Emergency support for Jordan');
    await chooseDemoPerson(page, 'Riley');

    await page.getByRole('button', { name: 'Close pot with note' }).click();

    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
    const developerChecks = page.getByTestId('developer-checks');

    await expect(developerChecks).toContainText('"chapterName": "Emergency pot"');
    await expect(developerChecks).toContainText('Private emergency item still needs review');
    await expect(developerChecks).not.toContainText('Emergency support for Jordan');
    await expect(developerChecks).not.toContainText('Private medical details');
    await expect(developerChecks).not.toContainText('Casey');
    await expect(developerChecks).not.toContainText('Morgan');
    await expect(developerChecks).not.toContainText('Jordan');
  });

  test('lab savings circle shows summit banner', async ({ page }) => {
    await page.goto('/?chopdot-dot-lab=1&mode=savings_circle');
    await expect(page.getByTestId('summit-banner')).toContainText('Spend Cards next');
  });

  test('adversarial controls stay out of normal user flow', async ({ page }) => {
    await openChapterPot(page, 'Builder house community fund');

    await clickObligationAction(page, 'obligation_1', 'Mark paid');
    await chooseDemoPerson(page, 'Alex');
    await clickObligationAction(page, 'obligation_1', 'Confirm received');

    await chooseDemoPerson(page, 'Noor');
    await clickObligationAction(page, 'obligation_2', 'Mark paid');
    await chooseDemoPerson(page, 'Alex');
    await clickObligationAction(page, 'obligation_2', 'Confirm received');

    await clickReleaseAction(page, 'Prepare release');

    await chooseDemoPerson(page, 'Vera');
    await expect(page.getByTestId('release-panel').getByRole('button', { name: 'Approve release' })).toHaveCount(0);

    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
    await expect(page.getByTestId('developer-checks')).toContainText('Adversarial actions');
    await page.getByRole('button', { name: 'Simulate failed transfer' }).first().click();
    await expect(page.getByTestId('token-rail')).toContainText('failed');
  });

  test('Product Account host-required mode fails visibly without demo signer fallback', async ({ page }, testInfo) => {
    await openNativeChapterPot(page, `chopdot-dot-signer=host-required&chopdot-dot-session=${uniqueNativeSession('host-signer-required', testInfo)}`, {
      expectedStatus: 'needs refresh',
    });

    await expect(page.getByTestId('native-host-gate-status')).toContainText('Product Account host is unavailable');
    await expect(page.getByTestId('native-session-events')).toContainText('needs refresh');
  });

  test('Statement Store host-required mode fails visibly without local transport fallback', async ({ page }, testInfo) => {
    await openNativeChapterPot(page, `chopdot-dot-transport=host-required&chopdot-dot-session=${uniqueNativeSession('host-transport-required', testInfo)}`, {
      expectedStatus: 'needs refresh',
    });

    await expect(page.getByTestId('native-host-gate-status')).toContainText('Statement Store host transport is unavailable');
    await expect(page.getByTestId('native-session-events')).toContainText('needs refresh');
  });

  test('native host preflight reports every strict adapter gate separately', async ({ page }, testInfo) => {
    await openNativeChapterPot(page, `chopdot-dot-session=${uniqueNativeSession('host-preflight', testInfo)}`);

    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
    await expect(page.getByTestId('native-host-preflight-identity')).toContainText('fail', { timeout: 8_000 });
    await expect(page.getByTestId('native-host-preflight-transport')).toContainText('fail');
    await expect(page.getByTestId('native-host-preflight-archive')).toContainText('fail');
    await expect(page.getByTestId('native-host-preflight-closeout_proof')).toContainText('fail');
    await expect(page.getByTestId('native-host-preflight-payout_evidence')).toContainText('fail');
    await expect(page.getByTestId('native-host-preflight')).not.toContainText('bulletin_lab');
    await expect(page.getByTestId('native-host-preflight')).not.toContainText('hash_only_lab');
  });

  test('Bulletin archive host-required mode fails visibly without local receipt fallback', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Developer host archive preflight is covered on desktop; mobile keeps product-flow coverage.');
    await openNativeChapterPot(page, `chopdot-dot-transport=local&chopdot-dot-archive=host-required&chopdot-dot-session=${uniqueNativeSession('host-archive-required', testInfo)}`, {
      person: 'mina',
      expectedStatus: 'up to date',
    });

    await page.getByRole('button', { name: 'Close round with note' }).click();
    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
    await expect(page.getByTestId('native-host-gate-status')).toContainText('Cloud Storage host archive is unavailable');
  });

  test('closeout proof host-required mode fails visibly without hash-only fallback', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Developer closeout proof preflight is covered on desktop; mobile keeps product-flow coverage.');
    await openNativeChapterPot(page, `chopdot-dot-transport=local&chopdot-dot-closeout=host-required&chopdot-dot-session=${uniqueNativeSession('host-closeout-required', testInfo)}`, {
      person: 'mina',
      expectedStatus: 'up to date',
    });

    await page.getByRole('button', { name: 'Close round with note' }).click();
    await tab(page, 'Settings');
    await page.getByText('Developer checks').click();
    await expect(page.getByTestId('native-host-gate-status')).toContainText('closeout proof host anchor is unavailable');
  });
});
