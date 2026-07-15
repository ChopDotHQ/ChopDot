import { expect, test, type Browser, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

type ModeConfig = {
  chapterId: string;
  potName: string;
};

const modes = {
  group: {
    chapterId: 'dot-shared-expense-chapter',
    potName: 'Dinner split',
  },
  savings: {
    chapterId: 'dot-savings-circle-chapter',
    potName: 'Friday savings circle',
  },
  emergency: {
    chapterId: 'dot-emergency-pot-chapter',
    potName: 'Emergency support for Jordan',
  },
  community: {
    chapterId: 'dot-community-fund-chapter',
    potName: 'Builder house community fund',
  },
} satisfies Record<string, ModeConfig>;

function nativeUrl(person: string, sessionId: string) {
  return `${BASE_URL}/pots?chopdot-dot-native=1&person=${person}&chopdot-dot-session=${encodeURIComponent(sessionId)}`;
}

async function enterAsGuest(page: Page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await guest.click();
  }
}

async function openNativePot(page: Page, mode: ModeConfig, person: string, sessionId: string) {
  await page.goto(nativeUrl(person, sessionId));
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${mode.potName} pot`) });
  await expect(potButton).toBeVisible({ timeout: 10_000 });
  await potButton.click();
  if (mode.potName === modes.savings.potName) {
    await expect(page.getByTestId('savings-circle-round')).toBeVisible();
    return;
  }
  if (mode.potName === modes.emergency.potName) {
    await expect(page.getByTestId('emergency-pot-flow')).toBeVisible();
    return;
  }
  await expect(page.getByTestId('chapter-home')).toBeVisible();
  await expect(page.getByTestId('native-sync-status')).toContainText('up to date', { timeout: 8_000 });
}

async function resetNativeSession(page: Page, mode: ModeConfig, sessionId: string) {
  await page.request.post(`${BASE_URL}/__chopdot_dot_statement_store/reset`, {
    data: { chapterId: mode.chapterId, sessionId },
  });
  await page.goto(nativeUrl('reset', sessionId));
  await enterAsGuest(page);
  await page.evaluate((chapterId) => {
    window.localStorage.removeItem(`chopdot_dot_native_session:${chapterId}`);
    window.localStorage.removeItem(`chopdot_dot_native_access:${chapterId}`);
  }, mode.chapterId);
}

async function newDevice(browser: Browser, mode: ModeConfig, person: string, sessionId: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openNativePot(page, mode, person, sessionId);
  return { context, page };
}

async function clickPrimary(page: Page, label: RegExp | string) {
  const savingsButton = page.getByTestId('savings-primary-action');
  const emergencyButton = page.getByTestId('emergency-primary-action');
  const button = await savingsButton.isVisible().catch(() => false)
    ? savingsButton
    : await emergencyButton.isVisible().catch(() => false)
    ? emergencyButton
    : page.getByTestId('guided-primary-action');
  await expect(button).toHaveText(label, { timeout: 8_000 });
  await expect(button).toBeEnabled({ timeout: 8_000 });
  await button.click();
}

async function clickObligationAction(page: Page, obligationId: string, actionName: string) {
  await page.getByTestId('chapter-tabs').getByRole('button', { name: 'People' }).click();
  await page.getByTestId(`obligation-${obligationId}`).getByRole('button', { name: actionName }).click();
  await page.getByTestId('chapter-tabs').getByRole('button', { name: 'Overview' }).click();
}

test.describe('ChopDot.dot no-Supabase native session', () => {
  const timelineCases = [
    {
      name: 'group expense',
      mode: modes.group,
      person: 'leo',
      sessionPrefix: 'native-timeline-group',
      assertions: [
        { testId: 'guided-timeline', text: 'Progress' },
        { testId: 'timeline-step-pay-shares', text: 'Shares paid' },
        { testId: 'timeline-step-confirm-receipts', text: 'Received' },
        { testId: 'timeline-step-close-split', text: 'Record saved' },
        { testId: 'mode-setup', text: 'Split setup' },
        { testId: 'mode-setup', text: 'Receiver confirms' },
      ],
    },
    {
      name: 'savings circle',
      mode: modes.savings,
      person: 'leo',
      sessionPrefix: 'native-timeline-savings',
      assertions: [
        { testId: 'savings-circle-round', text: 'Round 1 · Leo' },
        { testId: 'next-actor', text: 'Mark your payment' },
        { testId: 'savings-contributions', text: 'Contributions' },
        { testId: 'savings-close-state', text: 'Round record' },
      ],
    },
    {
      name: 'emergency pot',
      mode: modes.emergency,
      person: 'casey',
      sessionPrefix: 'native-timeline-emergency',
      assertions: [
        { testId: 'emergency-pot-flow', text: 'Emergency pot' },
        { testId: 'next-actor', text: 'Contribute privately' },
        { testId: 'emergency-contributions', text: 'Your support' },
        { testId: 'emergency-private-record', text: 'private by default' },
      ],
    },
    {
      name: 'community fund',
      mode: modes.community,
      person: 'sam',
      sessionPrefix: 'native-timeline-community',
      assertions: [
        { testId: 'guided-timeline', text: 'Progress' },
        { testId: 'timeline-step-fund-approval', text: 'Approved' },
        { testId: 'timeline-step-fund-handoff', text: 'Record saved' },
        { testId: 'mode-setup', text: 'Fund period setup' },
        { testId: 'mode-setup', text: 'Spend approval' },
        { testId: 'mode-setup', text: 'Handoff' },
        { testId: 'mode-guardrails', text: 'Controls' },
        { testId: 'mode-guardrails', text: 'Approve' },
        { testId: 'mode-guardrails', text: 'Confirms' },
      ],
    },
  ];

  for (const item of timelineCases) {
    test(`${item.name} explains the closing path in user language`, async ({ page }, testInfo) => {
      const suffix = testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const sessionId = `${item.sessionPrefix}-${suffix}`;
      await resetNativeSession(page, item.mode, sessionId);
      await openNativePot(page, item.mode, item.person, sessionId);

      for (const assertion of item.assertions) {
        await expect(page.getByTestId(assertion.testId)).toContainText(assertion.text);
      }
    });
  }

  test('future actors get clear guidance before their turn', async ({ page, browser }, testInfo) => {
    test.setTimeout(60_000);
    const emergencySession = `native-guidance-emergency-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, modes.emergency, emergencySession);

    const devices = [];
    const taylorDevice = await newDevice(browser, modes.emergency, 'taylor', emergencySession);
    devices.push(taylorDevice.context);
    await expect(taylorDevice.page.getByTestId('next-actor')).toContainText('Approval pending');
    await expect(taylorDevice.page.getByTestId('emergency-release-status')).toContainText('Waiting');
    await expect(taylorDevice.page.getByTestId('emergency-private-record')).toContainText('private by default');

    const jordanDevice = await newDevice(browser, modes.emergency, 'jordan', emergencySession);
    devices.push(jordanDevice.context);
    await expect(jordanDevice.page.getByTestId('next-actor')).toContainText('Release pending');
    await expect(jordanDevice.page.getByTestId('emergency-private-record')).toContainText('private by default');

    const rileyDevice = await newDevice(browser, modes.emergency, 'riley', emergencySession);
    devices.push(rileyDevice.context);
    await expect(rileyDevice.page.getByTestId('next-actor')).toContainText('Waiting on the group');
    await expect(rileyDevice.page.getByTestId('emergency-contributions')).toContainText('Casey');
    await expect(rileyDevice.page.getByTestId('emergency-contributions')).toContainText('Morgan');

    const communitySession = `native-guidance-community-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, modes.community, communitySession);
    const priyaDevice = await newDevice(browser, modes.community, 'priya', communitySession);
    devices.push(priyaDevice.context);
    await expect(priyaDevice.page.getByTestId('next-actor')).toContainText('Approval pending');
    await expect(priyaDevice.page.getByTestId('waiting-guide')).toContainText('Status');
    await expect(priyaDevice.page.getByTestId('waiting-guide')).toContainText('Payment review');
    await expect(priyaDevice.page.getByTestId('waiting-guide')).toContainText('Not ready');

    await Promise.all(devices.map((deviceContext) => deviceContext.close()));
  });

  test('receipt review stays compact and product-facing', async ({ page }, testInfo) => {
    const sessionId = `native-receipt-review-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, modes.group, sessionId);
    await openNativePot(page, modes.group, 'leo', sessionId);

    await expect(page.getByTestId('closeout-reconciliation')).toContainText('Close check');
    await expect(page.getByTestId('reconciliation-observed')).toContainText('Observed');
    await expect(page.getByTestId('reconciliation-claimed')).toContainText('Marked paid');
    await expect(page.getByTestId('reconciliation-confirmed')).toContainText('Confirmed');
    await expect(page.getByTestId('reconciliation-unresolved')).toContainText('Still open');
    await expect(page.getByTestId('reconciliation-ready')).toContainText('Ready');
    await expect(page.getByTestId('reconciliation-items')).toContainText('open');

    await page.getByRole('button', { name: 'Review receipt' }).click();
    await expect(page.getByTestId('receipt-review')).toContainText('Receipt');
    await expect(page.getByTestId('receipt-review')).toContainText('Preview only');
    await expect(page.getByTestId('receipt-meaning')).toContainText('Preview only');
    await expect(page.getByTestId('receipt-trust-summary')).toContainText('Summary');
    await expect(page.getByTestId('receipt-redaction')).toContainText('Private receipt');
    await expect(page.getByTestId('receipt-archive-status')).toContainText('Ready on close');
    await expect(page.getByTestId('receipt-archive-status')).toContainText('Not connected yet.');
    await expect(page.getByTestId('receipt-review')).not.toContainText('Does not prove');
    await expect(page.getByTestId('receipt-review')).not.toContainText('Polkadot');
    await expect(page.getByTestId('receipt-review')).not.toContainText('proof');
  });

  test('emergency receipt review stays redacted', async ({ page }, testInfo) => {
    const sessionId = `native-emergency-receipt-review-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, modes.emergency, sessionId);
    await openNativePot(page, modes.emergency, 'casey', sessionId);

    await expect(page.getByTestId('emergency-pot-flow')).toContainText('Emergency pot');
    await expect(page.getByTestId('emergency-private-record')).toContainText('private by default');
    await expect(page.getByTestId('emergency-pot-flow')).not.toContainText('sensitiveReason');
    await expect(page.getByTestId('emergency-pot-flow')).not.toContainText('participant.id');
    await expect(page.getByTestId('emergency-pot-flow')).not.toContainText('Private medical details');
    await expect(page.getByTestId('emergency-pot-flow')).not.toContainText('Emergency support for Jordan');
    await expect(page.getByTestId('emergency-pot-flow')).not.toContainText('Jordan');
  });

  test('treasurer sees grouped pending confirmations when multiple members have marked paid', async ({ page, browser }, testInfo) => {
    const mode = modes.savings;
    const sessionId = `native-grouped-confirmations-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);

    const devices = [];
    const leoDevice = await newDevice(browser, mode, 'leo', sessionId);
    devices.push(leoDevice.context);
    await clickPrimary(leoDevice.page, 'Mark paid');

    const ninaDevice = await newDevice(browser, mode, 'nina', sessionId);
    devices.push(ninaDevice.context);
    await clickPrimary(ninaDevice.page, 'Mark paid');

    const minaDevice = await newDevice(browser, mode, 'mina', sessionId);
    devices.push(minaDevice.context);
    const mina = minaDevice.page;
    await expect(mina.getByTestId('next-actor')).toContainText(/Confirm (Leo|Nina)/);
    await expect(mina.getByTestId('savings-primary-action')).toHaveText('Confirm received');
    await expect(mina.getByTestId('savings-contributions')).toContainText('Leo');
    await expect(mina.getByTestId('savings-contributions')).toContainText('Nina');
    await expect(mina.getByTestId('savings-contributions')).toContainText('Marked paid');
    await expect(mina.getByTestId('savings-close-state')).toContainText('Confirm received next');

    await Promise.all(devices.map((deviceContext) => deviceContext.close()));
  });

  test('active savings-circle person lands directly on their own action', async ({ page }, testInfo) => {
    const mode = modes.savings;
    const sessionId = `native-active-person-priority-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);
    await openNativePot(page, mode, 'omar', sessionId);

    await expect(page.getByTestId('savings-circle-round')).toContainText('Round 1 · Omar');
    await expect(page.getByTestId('next-actor')).toContainText('Mark your payment');
    await expect(page.getByTestId('savings-primary-action')).toHaveText('Mark paid');
    await expect(page.getByTestId('savings-contributions')).toContainText('Omar');
    await expect(page.getByTestId('chapter-tabs')).toHaveCount(0);
  });

  test('savings-circle share link keeps the active person entry', async ({ page }, testInfo) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
    const mode = modes.savings;
    const sessionId = `native-participant-links-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);
    await openNativePot(page, mode, 'omar', sessionId);

    await page.getByTestId('chapter-share-link').click();
    const omarLink = await page.evaluate(() => navigator.clipboard.readText());
    const omarUrl = new URL(omarLink);
    expect(omarUrl.pathname).toBe('/pots');
    expect(omarUrl.searchParams.get('chopdot-dot-native')).toBe('1');
    expect(omarUrl.searchParams.get('person')).toBe('omar');
    expect(omarUrl.searchParams.get('chopdot-dot-session')).toBe(sessionId);
    expect(omarUrl.searchParams.has('chopdot-dot-dev')).toBe(false);
    expect(omarUrl.searchParams.has('chopdot-escrow-lab')).toBe(false);
  });

  test('Leo and Mina complete one savings-circle round from separate person links', async ({ page, browser }, testInfo) => {
    const mode = modes.savings;
    const sessionId = `native-savings-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);

    const devices = [];
    const leoDevice = await newDevice(browser, mode, 'leo', sessionId);
    devices.push(leoDevice.context);
    const leo = leoDevice.page;
    await expect(leo.getByTestId('next-actor')).toContainText('Mark your payment');
    await clickPrimary(leo, 'Mark paid');
    await expect(leo.getByTestId('next-actor')).toContainText('Waiting on Mina');
    await expect(leo.getByTestId('savings-contributions')).toContainText('Marked paid');

    const minaDevice = await newDevice(browser, mode, 'mina', sessionId);
    devices.push(minaDevice.context);
    const mina = minaDevice.page;
    await expect(mina.getByTestId('next-actor')).toContainText('Confirm Leo');
    await clickPrimary(mina, 'Confirm received');

    await expect(mina.getByTestId('savings-contributions')).toContainText('Confirmed');
    await mina.getByRole('button', { name: 'Record delay' }).first().click();
    await expect(mina.getByTestId('savings-contributions')).toContainText('Delayed', { timeout: 8_000 });
    await mina.getByRole('button', { name: 'Record delay' }).first().click();
    await expect(mina.getByTestId('next-actor')).toContainText('Prepare payout', { timeout: 8_000 });
    await clickPrimary(mina, 'Prepare payout');
    await clickPrimary(mina, 'Approve payout');
    await clickPrimary(mina, 'Record payout');
    await expect(mina.getByTestId('next-actor')).toContainText('Waiting on Leo', { timeout: 8_000 });

    await openNativePot(leo, mode, 'leo', sessionId);
    await expect(leo.getByTestId('next-actor')).toContainText('Confirm payout', { timeout: 8_000 });
    await clickPrimary(leo, 'Confirm payout');

    await expect(mina.getByTestId('next-actor')).toContainText('Close round', { timeout: 8_000 });
    await clickPrimary(mina, 'Close round');

    await expect(mina.getByTestId('next-actor')).toContainText('Record saved', { timeout: 8_000 });
    await expect(mina.getByTestId('savings-close-state')).toContainText('Record saved');
    await expect(mina.getByTestId('savings-contributions')).toContainText('3/3 handled');

    await Promise.all(devices.map((deviceContext) => deviceContext.close()));
  });

  test('Riley, Casey, Morgan, Taylor, and Jordan converge on one private emergency-fund state', async ({ page, browser }, testInfo) => {
    const mode = modes.emergency;
    const sessionId = `native-emergency-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);

    const devices = [];
    const caseyDevice = await newDevice(browser, mode, 'casey', sessionId);
    devices.push(caseyDevice.context);
    const casey = caseyDevice.page;
    await expect(casey.getByTestId('next-actor')).toContainText('Contribute privately');
    await expect(casey.getByTestId('emergency-pot-flow')).not.toContainText('Jordan');
    await clickPrimary(casey, 'Contribute');
    await expect(casey.getByTestId('next-actor')).toContainText('Waiting on Riley');

    const rileyDevice = await newDevice(browser, mode, 'riley', sessionId);
    devices.push(rileyDevice.context);
    const riley = rileyDevice.page;
    await expect(riley.getByTestId('next-actor')).toContainText('Confirm Casey');
    await expect(riley.getByTestId('emergency-contributions')).toContainText('Casey');
    await clickPrimary(riley, 'Confirm received');

    const morganDevice = await newDevice(browser, mode, 'morgan', sessionId);
    devices.push(morganDevice.context);
    const morgan = morganDevice.page;
    await expect(morgan.getByTestId('next-actor')).toContainText('Contribute privately');
    await expect(morgan.getByTestId('emergency-pot-flow')).not.toContainText('Jordan');
    await clickPrimary(morgan, 'Contribute');

    await expect(riley.getByTestId('next-actor')).toContainText('Confirm Morgan', { timeout: 8_000 });
    await clickPrimary(riley, 'Confirm received');
    await expect(riley.getByTestId('next-actor')).toContainText('Prepare release', { timeout: 8_000 });
    await clickPrimary(riley, 'Prepare release');
    await clickPrimary(riley, 'Approve release');

    const taylorDevice = await newDevice(browser, mode, 'taylor', sessionId);
    devices.push(taylorDevice.context);
    const taylor = taylorDevice.page;
    await expect(taylor.getByTestId('next-actor')).toContainText('Approve release');
    await clickPrimary(taylor, 'Approve release');

    await expect(riley.getByTestId('next-actor')).toContainText('Record release', { timeout: 8_000 });
    await clickPrimary(riley, 'Record release');

    const jordanDevice = await newDevice(browser, mode, 'jordan', sessionId);
    devices.push(jordanDevice.context);
    const jordan = jordanDevice.page;
    await expect(jordan.getByTestId('next-actor')).toContainText('Confirm received');
    await clickPrimary(jordan, 'Confirm received');

    await expect(riley.getByTestId('next-actor')).toContainText('Close pot', { timeout: 8_000 });
    await clickPrimary(riley, 'Close pot');

    for (const participantPage of [casey, riley, morgan, taylor, jordan]) {
      await expect(participantPage.getByTestId('emergency-private-record')).toContainText('Saved record', { timeout: 8_000 });
      await expect(participantPage.getByTestId('emergency-private-record')).toContainText('private by default', { timeout: 8_000 });
    }

    await Promise.all(devices.map((deviceContext) => deviceContext.close()));
  });

  test('Alex, Sam, Noor, Priya, and Jordan converge on one community-pot period with approvals', async ({ page, browser }, testInfo) => {
    const mode = modes.community;
    const sessionId = `native-community-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);

    const devices = [];
    const samDevice = await newDevice(browser, mode, 'sam', sessionId);
    devices.push(samDevice.context);
    const sam = samDevice.page;
    await expect(sam.getByTestId('next-actor')).toContainText('Mark your payment');
    await clickPrimary(sam, 'Mark paid');

    const alexDevice = await newDevice(browser, mode, 'alex', sessionId);
    devices.push(alexDevice.context);
    const alex = alexDevice.page;
    await expect(alex.getByTestId('next-actor')).toContainText('Confirm Sam');
    await expect(alex.getByTestId('organizer-queue')).toContainText('Confirm Sam');
    await expect(alex.getByTestId('organizer-queue-obligation_1')).toContainText('300 USDC pending');
    await expect(alex.getByTestId('organizer-queue-obligation_1')).toContainText('Confirm received');
    await clickPrimary(alex, 'Confirm received');

    const noorDevice = await newDevice(browser, mode, 'noor', sessionId);
    devices.push(noorDevice.context);
    const noor = noorDevice.page;
    await expect(noor.getByTestId('next-actor')).toContainText('Mark your payment');
    await clickPrimary(noor, 'Mark paid');

    await expect(alex.getByTestId('next-actor')).toContainText('Confirm Noor', { timeout: 8_000 });
    await clickPrimary(alex, 'Confirm received');
    await expect(alex.getByTestId('next-actor')).toContainText('Prepare release', { timeout: 8_000 });
    await clickPrimary(alex, 'Prepare release');
    await expect(alex.getByTestId('release-handoff')).toContainText('Release handoff');
    await expect(alex.getByTestId('release-handoff')).toContainText('Approval');
    await expect(alex.getByTestId('release-handoff')).toContainText('Pending');
    await expect(alex.getByTestId('release-handoff')).toContainText('Not ready');
    await clickPrimary(alex, 'Approve release');

    await expect(sam.getByTestId('release-panel').getByRole('button', { name: 'Record release' })).toHaveCount(0);

    const priyaDevice = await newDevice(browser, mode, 'priya', sessionId);
    devices.push(priyaDevice.context);
    const priya = priyaDevice.page;
    await expect(priya.getByTestId('next-actor')).toContainText('Approve release');
    await clickPrimary(priya, 'Approve release');

    await expect(sam.getByTestId('next-actor')).toContainText('Record release', { timeout: 8_000 });
    await expect(sam.getByTestId('release-handoff')).toContainText('Ready');
    await expect(sam.getByTestId('release-handoff')).toContainText('Pending');
    await clickPrimary(sam, 'Record release');

    const jordanDevice = await newDevice(browser, mode, 'jordan', sessionId);
    devices.push(jordanDevice.context);
    const jordan = jordanDevice.page;
    await expect(jordan.getByTestId('next-actor')).toContainText('Confirm the release');
    await expect(jordan.getByTestId('release-handoff')).toContainText('Jordan pending');
    await expect(jordan.getByTestId('release-handoff')).toContainText('Not ready');
    await clickPrimary(jordan, 'Confirm received');

    await expect(alex.getByTestId('next-actor')).toContainText('Close period', { timeout: 8_000 });
    await clickPrimary(alex, 'Close period');

    for (const participantPage of [sam, alex, noor, priya, jordan]) {
      await expect(participantPage.getByTestId('receipt-preview')).toContainText('Record closed', { timeout: 8_000 });
      await expect(participantPage.getByTestId('receipt-preview')).toContainText('confirmed or noted', { timeout: 8_000 });
      await expect(participantPage.getByTestId('native-sync-status')).toContainText('up to date');
    }

    await Promise.all(devices.map((deviceContext) => deviceContext.close()));
  });
});
