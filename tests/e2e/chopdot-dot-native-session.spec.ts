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
  const button = page.getByTestId('guided-primary-action');
  await expect(button).toHaveText(label, { timeout: 8_000 });
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
        { testId: 'guided-timeline', text: 'Progress' },
        { testId: 'timeline-step-circle-contributions', text: 'Contributions' },
        { testId: 'timeline-step-circle-delay-notes', text: 'Notes' },
        { testId: 'timeline-step-circle-closeout', text: 'Round saved' },
        { testId: 'mode-setup', text: 'Round setup' },
        { testId: 'mode-setup', text: 'Round payout' },
        { testId: 'mode-setup', text: 'Delay note' },
      ],
    },
    {
      name: 'emergency pot',
      mode: modes.emergency,
      person: 'casey',
      sessionPrefix: 'native-timeline-emergency',
      assertions: [
        { testId: 'guided-timeline', text: 'Progress' },
        { testId: 'timeline-step-emergency-approval', text: 'Approved' },
        { testId: 'timeline-step-emergency-receipt', text: 'Receipt saved' },
        { testId: 'mode-setup', text: 'Privacy setup' },
        { testId: 'mode-setup', text: 'Release approval' },
        { testId: 'mode-setup', text: 'Redacted' },
        { testId: 'mode-guardrails', text: 'Privacy' },
        { testId: 'mode-guardrails', text: 'Sensitive details' },
        { testId: 'mode-guardrails', text: 'Redacted receipt' },
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
    const emergencySession = `native-guidance-emergency-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, modes.emergency, emergencySession);

    const devices = [];
    const taylorDevice = await newDevice(browser, modes.emergency, 'taylor', emergencySession);
    devices.push(taylorDevice.context);
    await expect(taylorDevice.page.getByTestId('next-actor')).toContainText('Approval pending');
    await expect(taylorDevice.page.getByTestId('waiting-guide')).toContainText('Status');
    await expect(taylorDevice.page.getByTestId('waiting-guide')).toContainText('Payment review');
    await expect(taylorDevice.page.getByTestId('waiting-guide')).toContainText('Not ready');

    const jordanDevice = await newDevice(browser, modes.emergency, 'jordan', emergencySession);
    devices.push(jordanDevice.context);
    await expect(jordanDevice.page.getByTestId('next-actor')).toContainText('Release pending');
    await expect(jordanDevice.page.getByTestId('waiting-guide')).toContainText('Status');

    const rileyDevice = await newDevice(browser, modes.emergency, 'riley', emergencySession);
    devices.push(rileyDevice.context);
    await expect(rileyDevice.page.getByTestId('next-actor')).toContainText('Waiting on the group');
    await expect(rileyDevice.page.getByTestId('waiting-guide')).toHaveCount(0);

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

    await expect(page.getByTestId('receipt-review')).toContainText('Private receipt');
    await expect(page.getByTestId('receipt-trust-summary')).toContainText('Names and private details hidden');
    await expect(page.getByTestId('receipt-redaction')).toContainText('Hidden');
    await expect(page.getByTestId('receipt-redaction')).toContainText('Names, payment details, private notes.');
    await expect(page.getByTestId('receipt-redaction')).not.toContainText('sensitiveReason');
    await expect(page.getByTestId('receipt-redaction')).not.toContainText('participant.id');
    await expect(page.getByTestId('receipt-review')).not.toContainText('Private medical details');
    await expect(page.getByTestId('receipt-review')).not.toContainText('Emergency support for Jordan');
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
    await expect(mina.getByTestId('next-actor')).toContainText('Confirm Leo');
    await expect(mina.getByTestId('blockers')).toContainText('Mina confirms next');
    await expect(mina.getByTestId('blockers')).toContainText('Leo, Nina · $200');
    await expect(mina.getByTestId('organizer-queue')).toContainText('Confirm Leo');
    await expect(mina.getByTestId('organizer-queue')).toContainText('Confirm Nina');

    await Promise.all(devices.map((deviceContext) => deviceContext.close()));
  });

  test('active person is first in People tab and payment details', async ({ page }, testInfo) => {
    const mode = modes.savings;
    const sessionId = `native-active-person-priority-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);
    await openNativePot(page, mode, 'omar', sessionId);

    await page.getByTestId('chapter-tabs').getByRole('button', { name: 'People' }).click();
    await expect(page.getByTestId('chapter-people').locator('[data-testid^="participant-"]').first()).toHaveAttribute('data-testid', 'participant-omar');
    await expect(page.getByTestId('participant-omar')).toContainText('You');
    await expect(page.getByTestId('chapter-people').locator('[data-testid^="obligation-"]').first()).toHaveAttribute('data-testid', 'obligation-obligation_3');
    await expect(page.getByTestId('obligation-obligation_3')).toContainText('Omar');
    await expect(page.getByTestId('obligation-obligation_3')).toContainText('Mark paid');
  });

  test('participant links keep each person on their own device entry', async ({ page }, testInfo) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
    const mode = modes.savings;
    const sessionId = `native-participant-links-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);
    await openNativePot(page, mode, 'omar', sessionId);

    await page.getByTestId('chapter-tabs').getByRole('button', { name: 'People' }).click();
    await expect(page.getByTestId('person-link-guide')).toContainText('Send each person their own link');
    await expect(page.getByTestId('person-link-guide')).toContainText('Use one device or browser profile per person');

    await page.getByTestId('participant-share-link-leo').click();
    const leoLink = await page.evaluate(() => navigator.clipboard.readText());
    const leoUrl = new URL(leoLink);
    expect(leoUrl.pathname).toBe('/pots');
    expect(leoUrl.searchParams.get('chopdot-dot-native')).toBe('1');
    expect(leoUrl.searchParams.get('person')).toBe('leo');
    expect(leoUrl.searchParams.get('chopdot-dot-session')).toBe(sessionId);
    expect(leoUrl.searchParams.has('chopdot-dot-dev')).toBe(false);
    expect(leoUrl.searchParams.has('chopdot-escrow-lab')).toBe(false);

    await page.getByTestId('chapter-share-link').click();
    const omarLink = await page.evaluate(() => navigator.clipboard.readText());
    const omarUrl = new URL(omarLink);
    expect(omarUrl.searchParams.get('person')).toBe('omar');
    expect(omarUrl.searchParams.get('chopdot-dot-session')).toBe(sessionId);
  });

  test('Leo, Nina, Omar, and Mina converge on one signed savings-circle state across separate devices', async ({ page, browser }, testInfo) => {
    const mode = modes.savings;
    const sessionId = `native-savings-${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await resetNativeSession(page, mode, sessionId);

    const devices = [];
    const leoDevice = await newDevice(browser, mode, 'leo', sessionId);
    devices.push(leoDevice.context);
    const leo = leoDevice.page;
    await expect(leo.getByTestId('next-actor')).toContainText('Mark your payment');
    await clickPrimary(leo, 'Mark paid');
    await expect(leo.getByTestId('reconciliation-claimed')).toContainText('1');
    await expect(leo.getByTestId('reconciliation-items')).toContainText('Leo marked paid');
    await expect(leo.getByTestId('reconciliation-items')).toContainText('Waiting on Mina');
    await expect(leo.getByTestId('next-actor')).toContainText('Waiting on Mina');
    await expect(leo.getByTestId('chapter-overview')).toContainText('$100 marked paid');
    await expect(leo.getByTestId('waiting-guide')).toContainText('Payment marked');
    await expect(leo.getByTestId('waiting-guide')).toContainText('Receiver confirmation');
    await expect(leo.getByTestId('organizer-queue')).toHaveCount(0);

    const minaDevice = await newDevice(browser, mode, 'mina', sessionId);
    devices.push(minaDevice.context);
    const mina = minaDevice.page;
    await expect(mina.getByTestId('next-actor')).toContainText('Confirm Leo');
    await expect(mina.getByTestId('organizer-queue')).toContainText('Confirm Leo');
    await expect(mina.getByTestId('organizer-queue-obligation_1')).toContainText('$100 pending');
    await expect(mina.getByTestId('organizer-queue-obligation_1')).toContainText('Confirm received');
    await expect(mina.getByTestId('organizer-queue')).toContainText('Check Nina');
    await expect(mina.getByTestId('organizer-queue')).toContainText('Check Omar');
    await expect(mina.getByTestId('organizer-queue-obligation_2')).toContainText('$100 open');
    await expect(mina.getByTestId('blockers')).toContainText('Mina needs to confirm Leo');
    await clickPrimary(mina, 'Confirm received');
    await expect(mina.getByTestId('reconciliation-confirmed')).toContainText('1');
    await expect(mina.getByTestId('reconciliation-items')).toContainText('Leo paid');

    const ninaDevice = await newDevice(browser, mode, 'nina', sessionId);
    devices.push(ninaDevice.context);
    const nina = ninaDevice.page;
    await expect(nina.getByTestId('next-actor')).toContainText('Mark your payment');
    await clickPrimary(nina, 'Mark paid');

    await expect(mina.getByTestId('next-actor')).toContainText('Confirm Nina', { timeout: 8_000 });
    await expect(mina.getByTestId('organizer-queue')).toContainText('Confirm Nina', { timeout: 8_000 });
    await clickPrimary(mina, 'Confirm received');

    const omarDevice = await newDevice(browser, mode, 'omar', sessionId);
    devices.push(omarDevice.context);
    const omar = omarDevice.page;
    await expect(omar.getByTestId('next-actor')).toContainText('Mark your payment');
    await expect(omar.getByTestId('blockers')).toContainText('Omar has not marked');

    await expect(mina.getByTestId('organizer-queue')).toContainText('Check Omar', { timeout: 8_000 });
    await mina.getByTestId('organizer-queue-obligation_3').getByRole('button', { name: 'Record delay' }).click();
    await expect(leo.getByTestId('blockers')).toContainText('Round 1 payout to Leo has not been prepared', { timeout: 8_000 });
    await expect(nina.getByTestId('blockers')).toContainText('Round 1 payout to Leo has not been prepared', { timeout: 8_000 });

    await expect(mina.getByTestId('next-actor')).toContainText('Prepare payout', { timeout: 8_000 });
    await expect(mina.getByTestId('organizer-queue')).toContainText('Prepare payout');
    await expect(mina.getByTestId('organizer-queue-prepare-release')).toContainText('$200 to Leo');
    await clickPrimary(mina, 'Prepare payout');
    await clickPrimary(mina, 'Approve payout');

    await expect(omar.getByTestId('next-actor')).toContainText('Record payout', { timeout: 8_000 });
    await clickPrimary(omar, 'Record payout');

    await expect(leo.getByTestId('next-actor')).toContainText('Confirm the release', { timeout: 8_000 });
    await clickPrimary(leo, 'Confirm received');

    await expect(mina.getByTestId('next-actor')).toContainText('Close round', { timeout: 8_000 });
    await clickPrimary(mina, 'Close round');

    for (const participantPage of [leo, mina, nina, omar]) {
      await expect(participantPage.getByTestId('receipt-preview')).toContainText('Record closed', { timeout: 8_000 });
      await expect(participantPage.getByTestId('receipt-preview')).toContainText('confirmed or noted', { timeout: 8_000 });
      await expect(participantPage.getByTestId('native-sync-status')).toContainText('up to date');
    }

    await mina.getByTestId('chapter-tabs').getByRole('button', { name: 'Activity' }).click();
    await expect(mina.getByTestId('chapter-activity')).toContainText('Receipt saved', { timeout: 8_000 });

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
    await expect(casey.getByTestId('next-actor')).toContainText('Mark your payment');
    await clickPrimary(casey, 'Mark paid');

    const rileyDevice = await newDevice(browser, mode, 'riley', sessionId);
    devices.push(rileyDevice.context);
    const riley = rileyDevice.page;
    await expect(riley.getByTestId('next-actor')).toContainText('Confirm Casey');
    await expect(riley.getByTestId('organizer-queue')).toContainText('Confirm Casey');
    await expect(riley.getByTestId('organizer-queue-obligation_1')).toContainText('$150 pending');
    await expect(riley.getByTestId('organizer-queue-obligation_1')).toContainText('Confirm received');
    await clickPrimary(riley, 'Confirm received');

    const morganDevice = await newDevice(browser, mode, 'morgan', sessionId);
    devices.push(morganDevice.context);
    const morgan = morganDevice.page;
    await expect(morgan.getByTestId('next-actor')).toContainText('Mark your payment');
    await clickPrimary(morgan, 'Mark paid');

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
    await expect(jordan.getByTestId('next-actor')).toContainText('Confirm the release');
    await clickPrimary(jordan, 'Confirm received');

    await expect(riley.getByTestId('next-actor')).toContainText('Close pot', { timeout: 8_000 });
    await clickPrimary(riley, 'Close pot');

    for (const participantPage of [casey, riley, morgan, taylor, jordan]) {
      await expect(participantPage.getByTestId('receipt-preview')).toContainText('Record closed', { timeout: 8_000 });
      await expect(participantPage.getByTestId('receipt-preview')).toContainText('confirmed or noted', { timeout: 8_000 });
      await expect(participantPage.getByTestId('native-sync-status')).toContainText('up to date');
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
