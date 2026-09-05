import assert from 'node:assert/strict';
import test from 'node:test';
import type {HostSdkFacade} from './polkadotHostBridge.ts';
import {inferPolkadotProductId, PolkadotHostBridge} from './polkadotHostBridge.ts';

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
    requestResourceAllocation: async () => ({ok: true, value: ['Allocated']}),
    deriveEntropy: async context => ({ok: true, value: new Uint8Array(32).fill(context[0] ?? 0)}),
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

test('simultaneous identity consumers share one host approval ceremony', async () => {
  let loginRequests = 0;
  let releaseLogin!: () => void;
  const loginGate = new Promise<void>(resolve => { releaseLogin = resolve; });
  const sdk = fakeSdk({
    getAccountsProvider: async () => ({
      requestLogin: () => ({
        match: async <A>(ok: (input: string) => A) => {
          loginRequests += 1;
          await loginGate;
          return ok('success');
        },
      }) as never,
      getUserId: () => resultOk({primaryUsername: 'mina'}) as never,
      getProductAccount: () => resultOk({
        publicKey: new Uint8Array(32).fill(9),
        dotNsIdentifier: 'chopdot-shell-proof.dot',
        derivationIndex: 0,
      }) as never,
    }),
  });
  const first = new PolkadotHostBridge({sdkLoader: async () => sdk}).requestIdentity();
  const second = new PolkadotHostBridge({sdkLoader: async () => sdk}).requestIdentity();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(loginRequests, 1);
  releaseLogin();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.accountId[0], b.accountId[0]);
});

test('identity signs bytes with the product-scoped account', async () => {
  let signerProduct = '';
  const sdk = fakeSdk({
    getAccountsProvider: async () => ({
      requestLogin: () => resultOk('success') as never,
      getUserId: () => resultOk({primaryUsername: 'mina'}) as never,
      getProductAccount: () => resultOk({
        publicKey: new Uint8Array(32).fill(3),
        dotNsIdentifier: 'chopdot-shell-proof.dot',
        derivationIndex: 0,
      }) as never,
      getProductAccountSigner: account => {
        signerProduct = account.dotNsIdentifier;
        return {signBytes: async data => new Uint8Array([...data].reverse())};
      },
    }),
  });
  const identity = await new PolkadotHostBridge({sdkLoader: async () => sdk}).requestIdentity();
  assert.deepEqual(await identity.signBytes?.(new Uint8Array([1, 2, 3])), new Uint8Array([3, 2, 1]));
  assert.equal(signerProduct, 'chopdot-shell-proof.dot');
});

test('product identity follows the deployed native and devnet host', () => {
  assert.equal(inferPolkadotProductId('app.chopdotproof02.dot'), 'chopdotproof02.dot');
  assert.equal(inferPolkadotProductId('chopdotproof02.dot'), 'chopdotproof02.dot');
  assert.equal(inferPolkadotProductId('chopdotproof02.app.dev-dot.li'), 'chopdotproof02.dot');
  assert.equal(inferPolkadotProductId('chopdotproof02.dev-dot.li'), 'chopdotproof02.dot');
  assert.equal(inferPolkadotProductId('chopdot-shell-proof.app.paseo.li'), 'chopdot-shell-proof.dot');
  assert.equal(inferPolkadotProductId('localhost'), 'chopdot-shell-proof.dot');
});

test('identity request can use the product id derived from the live preview', async () => {
  let requestedProduct = '';
  const sdk = fakeSdk({
    getAccountsProvider: async () => ({
      requestLogin: () => resultOk('success') as never,
      getUserId: () => resultOk({primaryUsername: 'mina'}) as never,
      getProductAccount: (productId: string) => {
        requestedProduct = productId;
        return resultOk({publicKey: new Uint8Array(32).fill(4), dotNsIdentifier: productId, derivationIndex: 0}) as never;
      },
    }),
  });
  const bridge = new PolkadotHostBridge({
    productId: inferPolkadotProductId('app.chopdotproof02.dot'),
    sdkLoader: async () => sdk,
  });

  const identity = await bridge.requestIdentity();

  assert.equal(requestedProduct, 'chopdotproof02.dot');
  assert.equal(identity.productId, 'chopdotproof02.dot');
});

test('account recovery entropy is delegated to the host and copied', async () => {
  const seen: number[][] = [];
  const source = new Uint8Array(32).fill(11);
  const bridge = new PolkadotHostBridge({
    sdkLoader: async () => fakeSdk({
      deriveEntropy: async context => {
        seen.push(Array.from(context));
        return {ok: true, value: source};
      },
    }),
  });

  const derived = await bridge.deriveAccountEntropy(new Uint8Array([4, 5, 6]));
  source[0] = 99;

  assert.deepEqual(seen, [[4, 5, 6]]);
  assert.equal(derived.byteLength, 32);
  assert.equal(derived[0], 11);
});

test('account recovery rejects an overlong context before calling the host', async () => {
  let derivations = 0;
  const bridge = new PolkadotHostBridge({
    sdkLoader: async () => fakeSdk({
      deriveEntropy: async () => {
        derivations += 1;
        return {ok: true, value: new Uint8Array(32)};
      },
    }),
  });

  await assert.rejects(
    () => bridge.deriveAccountEntropy(new Uint8Array(33)),
    /between 1 and 32 bytes/u,
  );
  assert.equal(derivations, 0);
});

test('account recovery entropy fails closed outside the host', async () => {
  let derivations = 0;
  const bridge = new PolkadotHostBridge({
    sdkLoader: async () => fakeSdk({
      isInsideContainer: async () => false,
      deriveEntropy: async () => {
        derivations += 1;
        return {ok: true, value: new Uint8Array(32)};
      },
    }),
  });

  await assert.rejects(
    () => bridge.deriveAccountEntropy(new Uint8Array([1])),
    /Account recovery is unavailable/u,
  );
  assert.equal(derivations, 0);
});

test('account recovery entropy exposes no host error detail and creates no fallback', async () => {
  const bridge = new PolkadotHostBridge({
    sdkLoader: async () => fakeSdk({
      deriveEntropy: async () => ({ok: false, error: new Error('wallet seed leaked in provider message')}),
    }),
  });

  await assert.rejects(
    () => bridge.deriveAccountEntropy(new Uint8Array([1])),
    error => error instanceof Error
      && error.message === 'Account recovery is unavailable.'
      && !error.message.includes('wallet seed'),
  );
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
  let allocationRequests = 0;
  const client = {
    connect: async () => undefined,
    subscribe: () => ({unsubscribe() {}}),
    publish: async (_packet: unknown, options: unknown) => {
      publishOptions.push(options);
      return {ok: true, value: undefined};
    },
    destroy() {},
  };
  const sdk = fakeSdk({
    getStatementStore: async () => ({}),
    requestResourceAllocation: async resources => {
      allocationRequests += 1;
      assert.deepEqual(resources, [{tag: 'StatementStoreAllowance', value: undefined}]);
      return {ok: true, value: ['Allocated']};
    },
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

  assert.equal(await session.preparePublish(), true);
  await session.publish({v: 1, kid: 'kid', iv: 'iv', ct: 'ciphertext'});

  assert.equal(allocationRequests, 1);
  assert.equal(publishOptions.length, 1);
  assert.equal('channel' in (publishOptions[0] as object), false);
  assert.equal(typeof (publishOptions[0] as {topic2?: unknown}).topic2, 'string');
  session.close();
});

test('shared session can preflight posting allowance and fails closed when rejected', async () => {
  let allocationRequests = 0;
  let publishRequests = 0;
  const client = {
    connect: async () => undefined,
    subscribe: () => ({unsubscribe() {}}),
    publish: async () => {
      publishRequests += 1;
      return {ok: true, value: undefined};
    },
    destroy() {},
  };
  const sdk = fakeSdk({
    getStatementStore: async () => ({}),
    requestResourceAllocation: async () => {
      allocationRequests += 1;
      return {ok: true, value: ['Rejected']};
    },
    createStatementStoreClient: () => client as never,
  });
  const session = await new PolkadotHostBridge({sdkLoader: async () => sdk}).openSessionChannel({
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

  assert.equal(allocationRequests, 0);
  assert.equal(await session.preparePublish(), false);
  assert.equal(allocationRequests, 1);
  assert.equal(publishRequests, 0);
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
