import {expect, test, type Browser, type Frame, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type DevAccountName,
  type TestHostAPI,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const productUrl = 'http://127.0.0.1:4177/';
const proofDirectory = path.resolve('proof/live-payer-sync');

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
    __CHOPDOT_CAPTURED_SHARE__?: {url?: string};
  }
}

type HostedPerson = {
  server: TestHostServer;
  page: Page;
  frame: Frame;
};

async function openHosted(browser: Browser, account: DevAccountName): Promise<HostedPerson> {
  const server = await createTestHostServer({
    productUrl,
    accounts: [account],
    productAccounts: {'chopdot-shell-proof.dot/0': account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage({viewport: {width: 430, height: 932}});
  await page.goto(server.url);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
  await expect(page.locator('iframe')).toHaveCount(1);
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  return {server, page, frame};
}

async function onboardAs(frame: Frame, name: string): Promise<void> {
  await frame.getByRole('button', {name: 'Continue as guest'}).click();
  await frame.getByPlaceholder('Display name').fill(name);
  await frame.getByRole('button', {name: `Continue as ${name}`}).click();
  await expect(frame.getByText(`Hey, ${name}`)).toBeVisible();
}

async function installShareCapture(frame: Frame): Promise<void> {
  await frame.evaluate(() => {
    window.__CHOPDOT_CAPTURED_SHARE__ = undefined;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (value: {url?: string}) => {
        window.__CHOPDOT_CAPTURED_SHARE__ = value;
      },
    });
  });
}

test('Leo marks paid once and Mina updates automatically without a return link', async ({browser}) => {
  test.setTimeout(120_000);
  await mkdir(proofDirectory, {recursive: true});
  const mina = await openHosted(browser, 'alice');
  const leo = await openHosted(browser, 'bob');

  try {
    await onboardAs(mina.frame, 'Mina');
    await mina.frame.getByRole('button', {name: 'Settings'}).click();
    await mina.frame.getByLabel('Select currency').selectOption('CHF');
    await mina.frame.getByRole('button', {name: 'Back'}).click();

    await mina.frame.getByRole('button', {name: 'New group'}).click();
    await mina.frame.getByPlaceholder('e.g. Weekend Trip').fill('Zurich Dinner');
    await mina.frame.getByLabel('Friend name').fill('Leo');
    await mina.frame.getByRole('button', {name: 'Add friend'}).click();
    await mina.frame.getByLabel('Friend name').fill(' Leo ');
    await mina.frame.getByRole('button', {name: 'Add friend'}).click();
    await expect(mina.frame.getByRole('alert')).toHaveText('Leo is already in this group.');
    await mina.frame.getByRole('button', {name: 'Create my group'}).click();
    await mina.frame.getByRole('button', {name: 'Add spend'}).click();
    await mina.frame.getByRole('button', {name: 'Enter amount instead'}).click();
    await mina.frame.getByPlaceholder('0.00').fill('120');
    await mina.frame.getByPlaceholder('e.g. Dinner at Gusto').fill('Dinner');
    await mina.frame.getByRole('button', {name: 'Review split'}).click();
    await mina.frame.getByRole('button', {name: 'Save spend'}).click();
    await installShareCapture(mina.frame);
    await mina.frame.getByRole('button', {name: 'Settle up'}).click();
    await mina.frame.getByRole('button', {name: 'Send link to Leo'}).click();

    await expect.poll(
      () => mina.frame.evaluate(() => window.__CHOPDOT_CAPTURED_SHARE__?.url ?? ''),
      {message: 'wait for the host identity request and native share handoff'},
    ).not.toBe('');
    const payerUrl = await mina.frame.evaluate(() => window.__CHOPDOT_CAPTURED_SHARE__?.url ?? '');
    expect(payerUrl).toBeTruthy();
    const payerParams = new URL(payerUrl).searchParams;
    expect(payerParams.get('payRequest')).toBeTruthy();
    expect(payerParams.has('payUpdate')).toBe(false);
    await mina.frame.getByRole('button', {name: 'Share link again with Leo'}).click();
    await expect.poll(() => mina.frame.evaluate(() => window.__CHOPDOT_CAPTURED_SHARE__?.url ?? '')).toBe(payerUrl);
    await expect.poll(() => mina.frame.evaluate(() => {
      const observer = window.__CHOPDOT_SESSION_OBSERVER__;
      return observer?.status === 'error' ? `error:${observer.lastError ?? 'unknown'}` : observer?.status;
    })).toBe('ready');

    const payerHostUrl = new URL(leo.server.url);
    payerHostUrl.search = payerParams.toString();
    await leo.page.goto(payerHostUrl.toString());
    await expect.poll(() => leo.page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
    await expect(leo.page.locator('iframe')).toHaveCount(1);
    const leoPayerFrame = leo.page.frames().find(candidate => candidate !== leo.page.mainFrame());
    if (!leoPayerFrame) throw new Error('Leo payer frame did not attach.');
    await expect(leoPayerFrame.getByRole('heading', {name: 'Pay Mina', level: 2})).toBeVisible();
    await expect(leoPayerFrame.getByText('CHF 60.00', {exact: true})).toBeVisible();
    await expect(leoPayerFrame.getByRole('button', {name: 'I paid Mina'})).toBeVisible();
    await expect(leoPayerFrame.getByRole('button', {name: /Confirm received|Finish group|Add spend/u})).toHaveCount(0);
    await leoPayerFrame.locator('#root').screenshot({path: path.join(proofDirectory, '01-leo-request.png')});

    const leoStatementBaseline = await leo.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length);
    await leoPayerFrame.getByRole('button', {name: 'I paid Mina'}).click();
    await expect(leoPayerFrame.getByRole('heading', {name: 'Marked as paid', level: 2})).toBeVisible({timeout: 20_000});
    await expect(leoPayerFrame.getByText('Mina still needs to confirm.', {exact: true})).toBeVisible();
    await expect(leoPayerFrame.getByText('Waiting for the receiver to confirm', {exact: true})).toBeVisible();
    await leoPayerFrame.locator('#root').screenshot({path: path.join(proofDirectory, '02-leo-delivered.png')});
    expect(new URL(leoPayerFrame.url()).searchParams.has('payUpdate')).toBe(false);

    await expect.poll(() => leo.page.evaluate(
      baseline => window.__TEST_HOST__.getSubmittedStatements().length > baseline,
      leoStatementBaseline,
    )).toBe(true);
    const payerStatements = await leo.page.evaluate(
      baseline => window.__TEST_HOST__.getSubmittedStatements().slice(baseline).map(item => item.statement),
      leoStatementBaseline,
    );
    for (const statement of payerStatements) {
      await mina.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
    }
    await mina.page.waitForTimeout(500);
    expect(await mina.frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.lastRejection)).toBeUndefined();

    await expect(mina.frame.getByText('Needs confirm', {exact: true})).toBeVisible();
    await expect(mina.frame.getByRole('button', {name: 'Confirm received from Leo'})).toBeVisible();
    await mina.frame.locator('#root').screenshot({path: path.join(proofDirectory, '03-mina-updated-live.png')});

    const applied = await mina.frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.applied ?? 0);
    for (const statement of payerStatements) {
      await mina.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
    }
    await mina.page.waitForTimeout(300);
    expect(await mina.frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.applied ?? 0)).toBe(applied);

    const minaStatementBaseline = await mina.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length);
    await mina.frame.getByRole('button', {name: 'Confirm received from Leo'}).click();
    await expect(mina.frame.getByText('Everyone is settled up!', {exact: true})).toBeVisible({timeout: 20_000});
    await expect.poll(() => mina.page.evaluate(
      baseline => window.__TEST_HOST__.getSubmittedStatements().length > baseline,
      minaStatementBaseline,
    )).toBe(true);
    const confirmationStatements = await mina.page.evaluate(
      baseline => window.__TEST_HOST__.getSubmittedStatements().slice(baseline).map(item => item.statement),
      minaStatementBaseline,
    );
    for (const statement of confirmationStatements) {
      await leo.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
    }
    await expect(leoPayerFrame.getByRole('heading', {name: 'Payment confirmed', level: 2})).toBeVisible({timeout: 20_000});
    await expect(leoPayerFrame.getByText('Mina confirmed receipt.', {exact: true})).toBeVisible();
    await leoPayerFrame.locator('#root').screenshot({path: path.join(proofDirectory, '04-leo-confirmed-live.png')});

    for (const statement of confirmationStatements) {
      await leo.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
    }

    await leo.page.reload();
    await expect.poll(() => leo.page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
    const reloadedPayerFrame = leo.page.frames().find(candidate => candidate !== leo.page.mainFrame());
    if (!reloadedPayerFrame) throw new Error('Reloaded Leo payer frame did not attach.');
    await expect(reloadedPayerFrame.getByRole('heading', {name: 'Payment confirmed', level: 2})).toBeVisible();
    await expect(reloadedPayerFrame.getByRole('button', {name: 'I paid Mina'})).toHaveCount(0);
  } finally {
    await mina.page.close().catch(() => undefined);
    await leo.page.close().catch(() => undefined);
    await mina.server.close().catch(() => undefined);
    await leo.server.close().catch(() => undefined);
  }
});
