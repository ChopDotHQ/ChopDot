import assert from 'node:assert/strict';
import test from 'node:test';
import type {HostSdkFacade} from './polkadotHostBridge.ts';
import {PolkadotHostBridge} from './polkadotHostBridge.ts';

function resultOk<T>(value: T) {
  return {match: async <A>(ok: (input: T) => A) => ok(value)};
}

function resultErr(reason: unknown) {
  return {match: async <A, B>(_ok: (input: never) => A, error: (input: unknown) => B) => error(reason)};
}

function fakeSdk(overrides: Partial<HostSdkFacade> = {}): HostSdkFacade {
  return {
    isInsideContainer: async () => true,
    getAccountsProvider: async () => ({
      requestLogin: () => resultOk('success') as never,
      getUserId: () => resultOk({primaryUsername: 'mina'}) as never,
      getProductAccount: () => resultOk({
        publicKey: new Uint8Array(32).fill(7),
        dotNsIdentifier: 'chopdot-shell-proof.dot',
        derivationIndex: 0,
      }) as never,
    }),
    getPaymentManager: async () => null,
    getPreimageManager: async () => null,
    getStatementStore: async () => null,
    createStatementStoreClient: () => { throw new Error('not used'); },
    ...overrides,
  };
}

test('probe is fail-visible outside a host', async () => {
  const bridge = new PolkadotHostBridge({sdkLoader: async () => fakeSdk({isInsideContainer: async () => false})});
  const report = await bridge.probe();
  assert.equal(report.insideContainer, false);
  assert.equal(report.identity.state, 'unavailable');
  assert.equal(report.sharedSession.state, 'unavailable');
});

test('probe reports login as needed without prompting', async () => {
  let loginRequests = 0;
  const sdk = fakeSdk({
    getAccountsProvider: async () => ({
      requestLogin: () => { loginRequests += 1; return resultOk('success') as never; },
      getUserId: () => resultErr(new Error('not connected')) as never,
      getProductAccount: () => resultErr(new Error('not connected')) as never,
    }),
  });
  const report = await new PolkadotHostBridge({sdkLoader: async () => sdk}).probe();
  assert.equal(report.identity.state, 'needs_login');
  assert.equal(loginRequests, 0);
});

test('identity request uses the product-scoped account', async () => {
  let requestedProduct = '';
  const sdk = fakeSdk({
    getAccountsProvider: async () => ({
      requestLogin: () => resultOk('success') as never,
      getUserId: () => resultOk({primaryUsername: 'mina'}) as never,
      getProductAccount: (productId: string) => {
        requestedProduct = productId;
        return resultOk({publicKey: new Uint8Array(32).fill(3), dotNsIdentifier: productId, derivationIndex: 0}) as never;
      },
    }),
  });
  const identity = await new PolkadotHostBridge({sdkLoader: async () => sdk}).requestIdentity();
  assert.equal(requestedProduct, 'chopdot-shell-proof.dot');
  assert.equal(identity.accountId[1], 42);
});

test('completed host payment remains observed only', async () => {
  const observed: string[] = [];
  const sdk = fakeSdk({
    getPaymentManager: async () => ({
      requestPayment: async () => ({id: 'payment-1'}),
      subscribePaymentStatus: (_id, callback) => {
        callback({tag: 'Completed'});
        return {unsubscribe() {}, onInterrupt() {}} as never;
      },
    }),
  });
  await new PolkadotHostBridge({sdkLoader: async () => sdk}).requestPayment({
    amount: 10n,
    destination: new Uint8Array(32),
    onStatus: payment => observed.push(`${payment.status.tag}:${payment.authority}`),
  });
  assert.deepEqual(observed, ['Completed:observed_only']);
});

test('shared session publishes append-only events without a last-write-wins channel', async () => {
  const publishOptions: unknown[] = [];
  const client = {
    connect: async () => undefined,
    subscribe: () => ({unsubscribe() {}}),
    publish: async (_packet: unknown, options: unknown) => {
      publishOptions.push(options);
      return true;
    },
    destroy() {},
  };
  const sdk = fakeSdk({
    getStatementStore: async () => ({}),
    createStatementStoreClient: () => client as never,
  });
  const bridge = new PolkadotHostBridge({sdkLoader: async () => sdk});
  const session = await bridge.openSessionChannel({
    identity: {
      username: 'mina',
      productId: 'chopdot-shell-proof.dot',
      publicKey: new Uint8Array(32).fill(3),
      accountId: ['5FakeAccount', 42],
    },
    groupId: 'friday-crew',
    secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    onPacket: () => undefined,
  });

  await session.publish({v: 1, kid: 'kid', iv: 'iv', ct: 'ciphertext'});

  assert.equal(publishOptions.length, 1);
  assert.equal('channel' in (publishOptions[0] as object), false);
  assert.equal(typeof (publishOptions[0] as {topic2?: unknown}).topic2, 'string');
  session.close();
});

test('receipt archive accepts only explicitly redacted packets', async () => {
  const bridge = new PolkadotHostBridge({sdkLoader: async () => fakeSdk()});
  await assert.rejects(() => bridge.saveRedactedReceipt({
    redacted: false,
    receiptId: 'r1',
    closedAt: new Date().toISOString(),
    currency: 'CHF',
    total: '120.00',
    memberCount: 3,
    openItemCount: 0,
  } as never));
});
