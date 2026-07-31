import {expect, test, type Browser, type Page} from '@playwright/test';
import {createTestHostServer, PASEO_ASSET_HUB, type TestHostAPI, type TestHostServer} from '@parity/host-api-test-sdk';

const productUrl = 'http://127.0.0.1:4177/?developerChecks=1';
const MAX_USER_TOTAL = 1024;

declare global { interface Window { __TEST_HOST__: TestHostAPI } }

function dataBytes(s: unknown): number {
  const d = (s as {data?: unknown}).data;
  if (d instanceof Uint8Array) return d.byteLength;
  if (d && typeof d === 'object') return Object.keys(d).length;
  return 0;
}

async function open(browser: Browser, account: 'alice'): Promise<{server: TestHostServer; page: Page}> {
  const server = await createTestHostServer({
    productUrl, accounts: [account],
    productAccounts: {'chopdot-shell-proof.dot/0': account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage();
  await page.goto(server.url);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
  return {server, page};
}

test('what one real ADD_EXPENSE costs on the statement store', async ({browser}) => {
  const a = await open(browser, 'alice');
  try {
    await expect(a.page.locator('iframe')).toHaveCount(1);
    const frame = a.page.frames().find(f => f !== a.page.mainFrame())!;
    await expect.poll(() => frame.evaluate(() => Boolean(window.__CHOPDOT_HOST_ACTIONS__))).toBe(true);
    await frame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.requestIdentity());
    await frame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.connectSession('friday-crew', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'));

    // Reproduce hostSessionSync's real publish: serialize the envelope, split at
    // CHUNK_TEXT_LENGTH=120, wrap each part in an EncryptedActionChunk, publish
    // each separately. The developer hook does one raw publish and does not
    // chunk, so measuring through it understates the real cost.
    const CHUNK_TEXT_LENGTH = 120;
    const envelope = {
      v: 1,
      eventId: crypto.randomUUID(),
      actorUserId: crypto.randomUUID(),
      actorPublicKeyHex: '0x' + 'a1b2c3d4'.repeat(8),
      occurredAt: new Date().toISOString(),
      action: {
        type: 'ADD_EXPENSE',
        payload: {
          expense: {id: crypto.randomUUID(), groupId: crypto.randomUUID(), description: 'Dinner at La Cabrera',
            amount: 184.5, currency: 'PAS', paidByUserId: crypto.randomUUID(), date: new Date().toISOString()},
          splits: Array.from({length: 3}, () => ({id: crypto.randomUUID(), expenseId: crypto.randomUUID(),
            userId: crypto.randomUUID(), amount: 61.5, status: 'open'})),
        },
      },
    };
    const serialized = JSON.stringify(envelope);
    const parts = Array.from({length: Math.ceil(serialized.length / CHUNK_TEXT_LENGTH)},
      (_, i) => serialized.slice(i * CHUNK_TEXT_LENGTH, (i + 1) * CHUNK_TEXT_LENGTH));

    const before = await a.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length);
    let allAccepted = true;
    for (const [index, part] of parts.entries()) {
      const chunk = {kind: 'chopdot-action-chunk', messageId: envelope.eventId, index, total: parts.length, part};
      const ok = await frame.evaluate(v => window.__CHOPDOT_HOST_ACTIONS__!.publishSessionValue(v), chunk);
      if (!ok) allAccepted = false;
    }
    await a.page.waitForTimeout(2500);
    const all = await a.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().map(s => s.statement));
    const produced = all.slice(before);
    const wire = produced.map(dataBytes).reduce((x, y) => x + y, 0);

    console.log('\n--- one ADD_EXPENSE (3 splits) through the REAL chunked path ---');
    console.log(`envelope serialized  ${serialized.length} B`);
    console.log(`chunks               ${parts.length}  (CHUNK_TEXT_LENGTH ${CHUNK_TEXT_LENGTH})`);
    console.log(`statements emitted   ${produced.length}`);
    console.log(`every chunk accepted ${allAccepted}`);
    console.log(`total wire bytes     ${wire}`);
    console.log(`MAX_USER_TOTAL       ${MAX_USER_TOTAL}`);
    console.log(`verdict              ${wire <= MAX_USER_TOTAL ? 'FITS' : `EXCEEDS by ${(wire / MAX_USER_TOTAL).toFixed(1)}x`}`);

  } finally {
    await a.server.close();
  }
});
