import {expect, test, type Frame} from '@playwright/test';
import {createTestHostServer, PASEO_ASSET_HUB, type TestHostAPI} from '@parity/host-api-test-sdk';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const productUrl = 'http://127.0.0.1:4177/?developerChecks=1';
const outboxKey = 'chopdot-shared-action-outbox-v1';
const ledgerKey = 'chopdot-processed-shared-events-v1';
const stateKey = 'chopdot-portable-shell-state-v1';
const proofDirectory = path.resolve('proof/general-shared-action-delivery');

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
  }
}

function productFrame(page: import('@playwright/test').Page): Frame {
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  return frame;
}

test('a direct-entry organizer migrates safely and publishes through the stored group connection', async ({browser}) => {
  test.setTimeout(120_000);
  const server = await createTestHostServer({
    productUrl,
    accounts: ['alice'],
    productAccounts: {'chopdot-shell-proof.dot/0': 'alice'},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage({viewport: {width: 430, height: 932}});

  try {
    await mkdir(proofDirectory, {recursive: true});
    await page.goto(server.url);
    await expect.poll(
      () => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus()),
      {timeout: 20_000},
    ).toBe('connected');
    await expect(page.locator('iframe')).toHaveCount(1);
    let frame = productFrame(page);
    await frame.getByRole('button', {name: 'Continue as guest'}).click();
    await frame.getByPlaceholder('Display name').fill('Mina');
    await frame.getByRole('button', {name: 'Continue as Mina'}).click();
    await frame.getByRole('button', {name: 'New group'}).click();
    await frame.getByPlaceholder('e.g. Weekend Trip').fill('Zurich Dinner');
    await frame.getByLabel('Friend name').fill('Leo');
    await frame.getByRole('button', {name: 'Add friend'}).click();
    await frame.getByRole('button', {name: 'Create my group'}).click();
    await frame.getByRole('button', {name: 'Add spend'}).click();
    await frame.getByRole('button', {name: 'Enter amount instead'}).click();
    await frame.getByPlaceholder('0.00').fill('120');
    await frame.getByPlaceholder('e.g. Dinner at Gusto').fill('Dinner');
    await frame.getByRole('button', {name: 'Review split'}).click();
    await frame.getByRole('button', {name: 'Save spend'}).click();
    const localIdentity = await frame.evaluate(key => {
      const state = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      return {currentUserId: state.currentUserId as string, groupId: Object.keys(state.groups ?? {})[0] as string};
    }, stateKey);
    expect(localIdentity.currentUserId).not.toMatch(/^u-host-/u);
    await frame.getByRole('button', {name: 'Settle up'}).click();
    await frame.getByRole('button', {name: 'Send link to Leo'}).click();
    await expect(frame.getByRole('button', {name: 'Share link again with Leo'})).toBeVisible();

    await expect.poll(() => frame.evaluate(key => {
      const state = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      return String(state.currentUserId ?? '');
    }, stateKey)).toMatch(/^u-host-/u);
    const migrated = await frame.evaluate(({key, oldId, groupId}) => {
      const state = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      const currentUserId = state.currentUserId as string;
      const group = state.groups[groupId];
      const expense = Object.values(state.expenses as Record<string, {groupId: string; paidByUserId: string}>).find(item => item.groupId === groupId);
      const ownSplit = Object.values(state.splits as Record<string, {userId: string}>).find(item => item.userId === currentUserId);
      return {
        currentUserId,
        oldUserExists: Boolean(state.users[oldId]),
        accountPublicKeyHex: state.users[currentUserId]?.accountPublicKeyHex as string | undefined,
        groupMemberIds: group.memberIds as string[],
        expenseOwner: expense?.paidByUserId,
        hasOwnSplit: Boolean(ownSplit),
      };
    }, {key: stateKey, oldId: localIdentity.currentUserId, groupId: localIdentity.groupId});
    expect(migrated.oldUserExists).toBe(false);
    expect(migrated.accountPublicKeyHex).toMatch(/^0x[0-9a-f]{64}$/u);
    expect(migrated.groupMemberIds).toContain(migrated.currentUserId);
    expect(migrated.expenseOwner).toBe(migrated.currentUserId);
    expect(migrated.hasOwnSplit).toBe(true);
    try {
      await expect.poll(() => frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.status)).toBe('ready');
    } catch (error) {
      const diagnostic = await frame.evaluate(({outbox, state}) => ({
        observer: window.__CHOPDOT_SESSION_OBSERVER__,
        outbox: window.localStorage.getItem(outbox),
        state: window.localStorage.getItem(state),
      }), {outbox: outboxKey, state: stateKey});
      const hostStatements = await page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements());
      throw new Error(`Identity registration did not become ready: ${JSON.stringify({diagnostic, submitted: hostStatements.length})}`, {cause: error});
    }
    await expect.poll(() => frame.evaluate(key => window.localStorage.getItem(key), outboxKey)).toBeNull();

    // Reload the same direct-entry URL. The next action must use the live
    // session persisted on the group, not query parameters or a copied return.
    await page.goto(server.url);
    await expect.poll(
      () => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus()),
      {timeout: 20_000},
    ).toBe('connected');
    await expect(page.locator('iframe')).toHaveCount(1);
    frame = productFrame(page);
    await expect(frame.getByText('Hey, Mina')).toBeVisible();
    await expect.poll(() => frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.status)).toBe('ready');
    await expect.poll(() => frame.evaluate(key => {
      const state = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      return state.currentUserId;
    }, stateKey)).toBe(migrated.currentUserId);

    const baseline = await page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length);
    await frame.getByText('Zurich Dinner', {exact: true}).click();
    await frame.getByRole('button', {name: 'Add expense'}).click();
    await frame.getByRole('button', {name: 'Enter amount instead'}).click();
    await frame.getByPlaceholder('0.00').fill('30');
    await frame.getByPlaceholder('e.g. Dinner at Gusto').fill('Coffee');
    await frame.getByRole('button', {name: 'Review split'}).click();
    await frame.getByRole('button', {name: 'Save spend'}).click();

    await expect.poll(() => page.evaluate(
      count => window.__TEST_HOST__.getSubmittedStatements().length > count,
      baseline,
    )).toBe(true);
    await expect.poll(() => frame.evaluate(key => window.localStorage.getItem(key), outboxKey)).toBeNull();
    const ledger = await frame.evaluate(key => JSON.parse(window.localStorage.getItem(key) ?? '[]'), ledgerKey);
    expect(ledger).toEqual(expect.arrayContaining([expect.objectContaining({outcome: 'local'})]));
    await frame.locator('#root').screenshot({path: path.join(proofDirectory, '02-product-account-migration-delivered.png')});
  } finally {
    await page.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
});
