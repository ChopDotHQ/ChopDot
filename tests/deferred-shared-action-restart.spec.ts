import {expect, test, type Browser, type Frame, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type DevAccountName,
  type TestHostAPI,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const sessionSecret = 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
const sessionRoom = 'restart-safe-causal-order';
const sessionQuery = `chopSession=${sessionRoom}&chopKey=${sessionSecret}`;
const productUrl = `http://127.0.0.1:4177/?developerChecks=1&${sessionQuery}`;
const stateKey = 'chopdot-portable-shell-state-v1';
const deferredKey = 'chopdot-deferred-shared-events-v1';
const ledgerKey = 'chopdot-processed-shared-events-v1';
const proofDirectory = path.resolve('proof/deferred-shared-action-restart');

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
  }
}

type Participant = {
  person: string;
  server: TestHostServer;
  page: Page;
  frame: Frame;
};

async function productFrame(page: Page): Promise<Frame> {
  await expect(page.locator('iframe')).toHaveCount(1);
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  await expect.poll(() => frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.status)).toBe('ready');
  return frame;
}

async function openParticipant(
  browser: Browser,
  definition: {person: string; account: DevAccountName},
): Promise<Participant> {
  const server = await createTestHostServer({
    productUrl,
    accounts: [definition.account],
    productAccounts: {'chopdot-shell-proof.dot/0': definition.account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage({viewport: {width: 430, height: 932}});
  await page.goto(`${server.url}?${sessionQuery}`);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
  return {...definition, server, page, frame: await productFrame(page)};
}

async function onboard(participant: Participant): Promise<void> {
  await participant.frame.getByRole('button', {name: 'Continue as guest'}).click();
  await participant.frame.getByPlaceholder('Display name').fill(participant.person);
  await participant.frame.getByRole('button', {name: `Continue as ${participant.person}`}).click();
  await expect(participant.frame.getByText(`Hey, ${participant.person}`)).toBeVisible();
  await expect.poll(() => participant.page.evaluate(
    () => window.__TEST_HOST__.getSubmittedStatements().length,
  )).toBe(1);
}

test('a causally early shared action survives receiver restart and converges later', async ({browser}) => {
  test.setTimeout(150_000);
  await mkdir(proofDirectory, {recursive: true});
  const mina = await openParticipant(browser, {account: 'alice', person: 'Mina'});
  const leo = await openParticipant(browser, {account: 'bob', person: 'Leo'});

  try {
    await Promise.all([onboard(mina), onboard(leo)]);
    const minaRegistration = await mina.page.evaluate(
      () => window.__TEST_HOST__.getSubmittedStatements()[0].statement,
    );
    const leoRegistration = await leo.page.evaluate(
      () => window.__TEST_HOST__.getSubmittedStatements()[0].statement,
    );

    // Leo learns Mina first, while Mina deliberately has not received Leo's
    // signed registration. The group action can therefore be produced through
    // normal UI but must be causally deferred on Mina's device.
    await leo.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), minaRegistration);
    await expect.poll(() => leo.frame.evaluate(key => {
      const state = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      return Object.values(state.users ?? {}).some((user: any) => user.name === 'Mina');
    }, stateKey)).toBe(true);

    const leoBaseline = await leo.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length);
    await leo.frame.getByRole('button', {name: 'New group'}).click();
    await leo.frame.getByPlaceholder('e.g. Weekend Trip').fill('Restart Dinner');
    await leo.frame.getByLabel('Friend name').fill('Mina');
    await leo.frame.getByRole('button', {name: 'Add friend'}).click();
    await leo.frame.getByRole('button', {name: 'Create my group'}).click();
    await expect(leo.frame.getByText('Restart Dinner', {exact: true})).toBeVisible();
    await expect.poll(() => leo.page.evaluate(
      baseline => window.__TEST_HOST__.getSubmittedStatements().length > baseline,
      leoBaseline,
    )).toBe(true);
    await expect.poll(() => leo.frame.evaluate(key => window.localStorage.getItem(key), 'chopdot-shared-action-outbox-v1')).toBeNull();
    const groupStatements = await leo.page.evaluate(
      baseline => window.__TEST_HOST__.getSubmittedStatements().slice(baseline).map(item => item.statement),
      leoBaseline,
    );
    expect(groupStatements.length).toBeGreaterThan(0);

    for (const statement of groupStatements) {
      await mina.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
    }
    await expect.poll(() => mina.frame.evaluate(key => {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw).length : 0;
    }, deferredKey)).toBe(1);
    await expect.poll(() => mina.frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.deferred)).toBe(1);
    expect(await mina.frame.getByText('Restart Dinner', {exact: true}).count()).toBe(0);

    const beforeRestart = await mina.frame.evaluate(key => JSON.parse(window.localStorage.getItem(key) ?? '[]'), deferredKey);
    expect(beforeRestart[0]?.envelope?.action?.type).toBe('CREATE_GROUP');
    const deferredEventId = beforeRestart[0]?.eventId as string;

    // Reload the entire hosted app, not only a component. The Product Account
    // and device-local storage remain, while every React ref and session
    // connection is recreated.
    await mina.page.reload();
    await expect.poll(() => mina.page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
    mina.frame = await productFrame(mina.page);
    await expect(mina.frame.getByText('Hey, Mina')).toBeVisible();
    await expect.poll(() => mina.frame.evaluate(key => {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw).length : 0;
    }, deferredKey)).toBe(1);
    await expect.poll(() => mina.frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.deferred)).toBe(1);
    expect(await mina.frame.getByText('Restart Dinner', {exact: true}).count()).toBe(0);

    await mina.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), leoRegistration);
    await expect(mina.frame.getByText('Restart Dinner', {exact: true})).toBeVisible();
    await expect.poll(() => mina.frame.evaluate(key => window.localStorage.getItem(key), deferredKey)).toBeNull();
    await expect.poll(() => mina.frame.evaluate(({key, eventId}) => {
      const ledger = JSON.parse(window.localStorage.getItem(key) ?? '[]');
      return ledger.some((record: any) => record.eventId === eventId && record.outcome === 'applied');
    }, {key: ledgerKey, eventId: deferredEventId})).toBe(true);
    await expect.poll(() => mina.frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.deferred)).toBe(0);

    await mina.frame.locator('#root').screenshot({
      path: path.join(proofDirectory, '01-restored-action-converged-mina.png'),
    });
    await writeFile(path.join(proofDirectory, 'report.json'), JSON.stringify({
      programme: 'B',
      card: 'P-032',
      scenario: 'causally early CREATE_GROUP survives full hosted-app reload',
      sender: 'Leo',
      receiver: 'Mina',
      deferredEventId,
      encryptedStatementChunks: groupStatements.length,
      beforeRestartDeferred: beforeRestart.length,
      afterRestartDeferred: 1,
      finalDeferred: 0,
      terminalOutcome: 'applied',
      visibleResult: 'Restart Dinner',
      scope: 'local official host simulator; not live .dot convergence',
    }, null, 2));
  } finally {
    await Promise.all([
      mina.page.close().catch(() => undefined),
      leo.page.close().catch(() => undefined),
    ]);
    await Promise.all([
      mina.server.close().catch(() => undefined),
      leo.server.close().catch(() => undefined),
    ]);
  }
});
