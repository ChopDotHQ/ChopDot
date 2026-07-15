import {expect, test, type Browser, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type TestHostAPI,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const productUrl = 'http://127.0.0.1:4177/?developerChecks=1';
const proofDirectory = path.resolve('proof/polkadot-host-sim');
const sessionSecret = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const groupId = 'friday-crew';

function serializeHostValue(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => typeof item === 'bigint' ? item.toString() : item);
}

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
  }
}

async function openHostedProduct(
  browser: Browser,
  account: 'alice' | 'bob',
): Promise<{server: TestHostServer; page: Page}> {
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
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  await expect.poll(() => frame.evaluate(() => Boolean(window.__CHOPDOT_HOST_ACTIONS__))).toBe(true);
  return frame;
}

test('two hosted people converge through ciphertext and keep host money authority bounded', async ({browser}) => {
  await mkdir(proofDirectory, {recursive: true});
  const alice = await openHostedProduct(browser, 'alice');
  const bob = await openHostedProduct(browser, 'bob');

  try {
    const aliceFrame = await productFrame(alice.page);
    const bobFrame = await productFrame(bob.page);

    const aliceIdentity = await aliceFrame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.requestIdentity());
    const bobIdentity = await bobFrame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.requestIdentity());
    expect(aliceIdentity.productId).toBe('chopdot-shell-proof.dot');
    expect(bobIdentity.productId).toBe('chopdot-shell-proof.dot');
    expect(aliceIdentity.accountId[0]).not.toBe(bobIdentity.accountId[0]);

    await aliceFrame.evaluate(
      ({group, secret}) => window.__CHOPDOT_HOST_ACTIONS__!.connectSession(group, secret),
      {group: groupId, secret: sessionSecret},
    );
    await bobFrame.evaluate(
      ({group, secret}) => window.__CHOPDOT_HOST_ACTIONS__!.connectSession(group, secret),
      {group: groupId, secret: sessionSecret},
    );

    const event = {type: 'payment_marked_paid', actor: 'leo', amount: '40.00', currency: 'CHF'};
    expect(await aliceFrame.evaluate(value => window.__CHOPDOT_HOST_ACTIONS__!.publishSessionValue(value), event)).toBe(true);

    await expect.poll(() => alice.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length)).toBe(1);
    const submission = await alice.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements()[0].statement);
    const serializedSubmission = serializeHostValue(submission);
    expect(serializedSubmission).not.toContain('payment_marked_paid');
    expect(serializedSubmission).not.toContain('40.00');
    expect(serializedSubmission).not.toContain('leo');

    await bob.page.evaluate(statement => window.__TEST_HOST__.injectStatement(statement), submission);
    await expect.poll(() => bobFrame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.receivedSessionValues())).toContainEqual(event);

    await alice.page.evaluate(() => window.__TEST_HOST__.setPaymentBalance(100_000_000n));
    const paymentId = await aliceFrame.evaluate(
      () => window.__CHOPDOT_HOST_ACTIONS__!.requestPayment('40000000', `0x${'00'.repeat(32)}`),
    );
    await expect.poll(() => alice.page.evaluate(() => window.__TEST_HOST__.getPaymentLog().length)).toBe(1);
    const paymentLog = await alice.page.evaluate(() => window.__TEST_HOST__.getPaymentLog());
    expect(paymentLog[0].type).toBe('request');
    expect(paymentLog[0].amount).toBe(40_000_000n);
    await alice.page.evaluate(id => window.__TEST_HOST__.simulatePaymentStatus(id, {tag: 'Completed'}), paymentId);
    await expect.poll(() => aliceFrame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.observedPayments())).toContainEqual(
      expect.objectContaining({requestId: paymentId, authority: 'observed_only', status: {type: 'completed'}}),
    );

    const receipt = {
      redacted: true,
      receiptId: 'receipt-friday-crew-1',
      closedAt: '2026-07-14T15:30:00.000Z',
      currency: 'CHF',
      total: '120.00',
      memberCount: 3,
      openItemCount: 0,
    } as const;
    const receiptKey = await aliceFrame.evaluate(value => window.__CHOPDOT_HOST_ACTIONS__!.saveRedactedReceipt(value), receipt);
    const preimages = await alice.page.evaluate(() => window.__TEST_HOST__.getPreimages());
    expect(preimages).toHaveLength(1);
    expect(preimages[0].key).toBe(receiptKey);
    expect(preimages[0].fromProduct).toBe(true);
    const storedBytes = preimages[0].value instanceof Uint8Array
      ? preimages[0].value
      : Uint8Array.from(Object.values(preimages[0].value));
    const storedReceipt = JSON.parse(new TextDecoder().decode(storedBytes));
    expect(storedReceipt).toEqual(receipt);
    expect(JSON.stringify(storedReceipt)).not.toContain('Mina');
    expect(JSON.stringify(storedReceipt)).not.toContain('Leo');

    await alice.page.screenshot({path: path.join(proofDirectory, 'alice-host.png'), fullPage: true});
    await bob.page.screenshot({path: path.join(proofDirectory, 'bob-host.png'), fullPage: true});
    await writeFile(
      path.join(proofDirectory, 'report.json'),
      JSON.stringify({
        checkedAt: new Date().toISOString(),
        sdk: '@parity/host-api-test-sdk@0.10.0',
        passed: true,
        identities: [aliceIdentity.username, bobIdentity.username],
        ciphertextOnly: true,
        bobReceived: event,
        payment: {requestId: paymentId, authority: 'observed_only'},
        receipt: {key: receiptKey, redacted: true, retrieved: true},
        liveBoundary: 'Host simulation is not a substitute for Polkadot Mobile login or live Statement Store/payment execution.',
      }, null, 2),
    );
  } finally {
    await alice.page.close();
    await bob.page.close();
    await alice.server.close();
    await bob.server.close();
  }
});
