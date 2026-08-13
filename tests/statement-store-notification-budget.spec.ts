import {expect, test, type Browser, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type TestHostAPI,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {
  decodeCompactSessionNotification,
  encodeCompactSessionNotification,
  type CompactSessionNotification,
} from '../src/environment/hostSessionSync';

/**
 * G4 spike, notification scope only.
 *
 * The open question is not whether the host Statement Store can deliver — the
 * existing host-sim already proves Alice publishes and Bob receives, encrypted.
 * It is whether a ChopDot "Leo paid" notification fits the real limits:
 *
 *   MAX_STATEMENT_SIZE  = 512   bytes per statement
 *   MAX_USER_TOTAL      = 1024  bytes TOTAL per user
 *   DEFAULT_TTL_SECONDS = 30
 *
 * A per-member "latest status" on a stable channel is the sanctioned use of
 * last-write-wins channels (ADR 0005 reserves channels for replaceable
 * snapshots such as presence or latest status, and forbids them for
 * append-only money events). This measures whether that fits.
 */

const MAX_STATEMENT_SIZE = 512;
const MAX_USER_TOTAL = 1024;

const productUrl = 'http://127.0.0.1:4177/?developerChecks=1';
const proofFile = path.resolve(
  process.env.CHOPDOT_STATEMENT_BUDGET_REPORT
    ?? 'proof/statement-notification-budget/report.json',
);
const proofDirectory = path.dirname(proofFile);
const sessionSecret = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const groupId = 'friday-crew';

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
  }
}

function serialize(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => typeof v === 'bigint' ? v.toString() : v);
}

/**
 * Byte length of a statement's `data` payload — the field MAX_STATEMENT_SIZE
 * governs. `data` arrives as a Uint8Array, which crosses the Playwright bridge
 * as an index-keyed object; JSON-serializing that inflates it ~16x and is NOT
 * the wire size.
 */
function dataBytes(statement: unknown): number {
  const data = (statement as {data?: unknown}).data;
  if (data instanceof Uint8Array) return data.byteLength;
  if (data && typeof data === 'object') return Object.keys(data).length;
  if (typeof data === 'string') return Buffer.byteLength(data, 'utf8');
  throw new Error('statement has no measurable data payload');
}

async function openHostedProduct(browser: Browser, account: 'alice' | 'bob'):
Promise<{server: TestHostServer; page: Page}> {
  const server = await createTestHostServer({
    productUrl,
    accounts: [account],
    productAccounts: {'chopdot-shell-proof.dot/0': account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage();
  await page.goto(server.url);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
  return {server, page};
}

async function productFrame(page: Page) {
  await expect(page.locator('iframe')).toHaveCount(1);
  const frame = page.frames().find(c => c !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  await expect.poll(() => frame.evaluate(() => Boolean(window.__CHOPDOT_HOST_ACTIONS__))).toBe(true);
  return frame;
}

test('a ChopDot paid-notification fits the Statement Store budget', async ({browser}) => {
  await mkdir(proofDirectory, {recursive: true});
  const alice = await openHostedProduct(browser, 'alice');
  const bob = await openHostedProduct(browser, 'bob');

  try {
    const aliceFrame = await productFrame(alice.page);
    const bobFrame = await productFrame(bob.page);

    // Identity must be established before a session can connect.
    for (const frame of [aliceFrame, bobFrame]) {
      await frame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.requestIdentity());
    }

    for (const frame of [aliceFrame, bobFrame]) {
      await frame.evaluate(
        ({group, secret}) => window.__CHOPDOT_HOST_ACTIONS__!.connectSession(group, secret),
        {group: groupId, secret: sessionSecret},
      );
    }

    // Compact "latest status" for one member: version, group, actor, action
    // code, split, epoch seconds. Ids are 22-char base64url of 16 raw bytes.
    const id = () => Buffer.from(crypto.randomUUID().replace(/-/g, ''), 'hex').toString('base64url');
    const notification: CompactSessionNotification = {
      v: 1,
      g: id(),
      u: id(),
      c: 3,
      s: id(),
      t: Math.floor(Date.now() / 1000),
    };
    const compactNotification = encodeCompactSessionNotification(notification);

    expect(await aliceFrame.evaluate(
      value => window.__CHOPDOT_HOST_ACTIONS__!.publishSessionValue(value), compactNotification,
    )).toBe(true);

    await expect.poll(() => alice.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length)).toBe(1);
    const first = await alice.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements()[0].statement);
    const oneStatement = dataBytes(first);

    // The payload must be ciphertext on the wire.
    const wire = serialize(first);
    expect(wire).not.toContain(String(notification.u));
    expect(wire).not.toContain(String(notification.s));

    // Publish more to see how the per-user total accumulates.
    const sizes = [oneStatement];
    for (let i = 0; i < 4; i++) {
      await aliceFrame.evaluate(
        value => window.__CHOPDOT_HOST_ACTIONS__!.publishSessionValue(value),
        encodeCompactSessionNotification({...notification, c: 4 + i, t: Math.floor(Date.now() / 1000) + i}),
      );
      await expect.poll(() => alice.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length)).toBe(i + 2);
      const all = await alice.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().map(s => s.statement));
      sizes.push(dataBytes(all[all.length - 1]));
    }

    const cumulative = sizes.reduce((a, b) => a + b, 0);
    const fitsPerUser = Math.floor(MAX_USER_TOTAL / oneStatement);

    // Delivery still works for the notification shape.
    await bob.page.evaluate(s => window.__TEST_HOST__.injectStatement(s), first);
    await expect.poll(async () => {
      const values = await bobFrame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.receivedSessionValues());
      return values.map(decodeCompactSessionNotification).filter(Boolean);
    }).toContainEqual(notification);

    const report = {
      generatedAt: new Date().toISOString(),
      limits: {MAX_STATEMENT_SIZE, MAX_USER_TOTAL},
      notificationPayloadBytes: Buffer.byteLength(compactNotification, 'utf8'),
      encryptedDataPayloadBytes: oneStatement,
      fitsSingleStatement: oneStatement <= MAX_STATEMENT_SIZE,
      concurrentStatementsPerUser: fitsPerUser,
      fiveStatementsCumulativeBytes: cumulative,
      exceedsUserTotalAtFive: cumulative > MAX_USER_TOTAL,
      encryptedOnWire: true,
      deliveredToSecondAccount: true,
      note: 'Host simulation. Not a substitute for a real Polkadot host container, and the sim does not enforce MAX_USER_TOTAL — the per-user figure is derived from measured size, not observed rejection.',
    };
    await writeFile(proofFile, `${JSON.stringify(report, null, 2)}\n`);

    console.log('\n--- statement store notification budget ---');
    console.log(`payload (plain)        ${report.notificationPayloadBytes} B`);
    console.log(`encrypted data payload ${oneStatement} B   limit ${MAX_STATEMENT_SIZE}  ${report.fitsSingleStatement ? 'FITS' : 'TOO BIG'}`);
    console.log(`concurrent per user    ${fitsPerUser}       (MAX_USER_TOTAL ${MAX_USER_TOTAL})`);
    console.log(`5 statements total     ${cumulative} B  ${report.exceedsUserTotalAtFive ? 'exceeds per-user total' : 'within per-user total'}`);
    console.log(`encrypted on wire      yes`);
    console.log(`delivered to bob       yes`);

    expect(oneStatement).toBeLessThanOrEqual(MAX_STATEMENT_SIZE);
    expect(cumulative).toBeLessThanOrEqual(MAX_USER_TOTAL);
  } finally {
    await alice.server.close();
    await bob.server.close();
  }
});
