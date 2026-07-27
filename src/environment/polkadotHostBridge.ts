import type {AccountsProvider, HostPaymentStatusSubscribeItem, PaymentManager, PreimageManager} from '@parity/product-sdk-host';
import type {ReceivedStatement, StatementStoreClient, Unsubscribable} from '@parity/product-sdk-statement-store';
import {accountIdFromBytes} from '@parity/product-sdk-address';
import {
  assertEncryptedSessionPacket,
  sessionRoutingKey,
  sessionRoutingName,
  type EncryptedSessionPacket,
} from './encryptedSession.ts';

export type HostCapabilityState = 'available' | 'needs_login' | 'unavailable' | 'error';

export interface HostCapability {
  state: HostCapabilityState;
  detail?: string;
}

export interface PolkadotHostCapabilityReport {
  checkedAt: string;
  productId: string;
  insideContainer: boolean;
  identity: HostCapability;
  sharedSession: HostCapability;
  payments: HostCapability;
  receiptArchive: HostCapability;
}

export interface PolkadotHostIdentity {
  username: string;
  productId: string;
  publicKey: Uint8Array;
  accountId: [string, number];
}

export interface RedactedReceiptPacket {
  redacted: true;
  receiptId: string;
  closedAt: string;
  currency: string;
  total: string;
  memberCount: number;
  openItemCount: number;
}

export interface ObservedHostPayment {
  requestId: string;
  // product-sdk-host >=0.12 dropped the `PaymentStatus` alias in favour of the
  // truapi tagged union: {tag: 'Processing' | 'Completed' | 'Failed'}.
  status: HostPaymentStatusSubscribeItem;
  authority: 'observed_only';
}

// Duplicated from hostSessionSync.publicKeyHex rather than imported: that module
// imports PolkadotHostBridge, so sharing the helper would create a cycle. The
// literal return type is required by the host SDK's HexString parameters.
function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

type ResultAsyncLike<T> = {
  match<A, B = A>(ok: (value: T) => A, error: (reason: unknown) => B): Promise<A | B>;
};

type ProductAccount = {
  publicKey: Uint8Array;
  dotNsIdentifier: string;
  derivationIndex: number;
};

type AccountsProviderLike = Pick<AccountsProvider, 'requestLogin' | 'getUserId' | 'getProductAccount'>;
type PaymentManagerLike = Pick<PaymentManager, 'requestPayment' | 'subscribePaymentStatus'>;
type PreimageManagerLike = Pick<PreimageManager, 'submit'>;

export interface HostSdkFacade {
  isInsideContainer(): Promise<boolean>;
  getAccountsProvider(): Promise<AccountsProviderLike | null>;
  getPaymentManager(): Promise<PaymentManagerLike | null>;
  getPreimageManager(): Promise<PreimageManagerLike | null>;
  getStatementStore(): Promise<unknown | null>;
  createStatementStoreClient(appName: string): StatementStoreClient;
}

async function loadOfficialSdk(): Promise<HostSdkFacade> {
  const [host, statements] = await Promise.all([
    import('@parity/product-sdk-host'),
    import('@parity/product-sdk-statement-store'),
  ]);

  return {
    isInsideContainer: host.isInsideContainer,
    getAccountsProvider: host.getAccountsProvider,
    getPaymentManager: host.getPaymentManager,
    getPreimageManager: host.getPreimageManager,
    getStatementStore: host.getStatementStore,
    createStatementStoreClient: appName => new statements.StatementStoreClient({appName, defaultTtlSeconds: 300}),
  };
}

function errorDetail(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'name' in reason) return String(reason.name);
  return 'Host request failed.';
}

async function matchResult<T>(result: ResultAsyncLike<T>): Promise<{ok: true; value: T} | {ok: false; error: string}> {
  return result.match(
    value => ({ok: true as const, value}),
    reason => ({ok: false as const, error: errorDetail(reason)}),
  );
}

export class PolkadotHostBridge {
  readonly productId: string;
  private readonly sdkLoader: () => Promise<HostSdkFacade>;

  constructor({
    productId = 'chopdot-shell-proof.dot',
    sdkLoader = loadOfficialSdk,
  }: {productId?: string; sdkLoader?: () => Promise<HostSdkFacade>} = {}) {
    this.productId = productId;
    this.sdkLoader = sdkLoader;
  }

  async probe(): Promise<PolkadotHostCapabilityReport> {
    const checkedAt = new Date().toISOString();
    try {
      const sdk = await this.sdkLoader();
      const insideContainer = await sdk.isInsideContainer();
      if (!insideContainer) {
        const unavailable = {state: 'unavailable' as const, detail: 'Open inside a compatible Polkadot host.'};
        return {
          checkedAt,
          productId: this.productId,
          insideContainer: false,
          identity: unavailable,
          sharedSession: unavailable,
          payments: unavailable,
          receiptArchive: unavailable,
        };
      }

      const [accounts, statementStore, payments, receiptArchive] = await Promise.all([
        sdk.getAccountsProvider(),
        sdk.getStatementStore(),
        sdk.getPaymentManager(),
        sdk.getPreimageManager(),
      ]);

      let identity: HostCapability = {state: 'unavailable'};
      if (accounts) {
        const user = await matchResult(accounts.getUserId() as ResultAsyncLike<{primaryUsername: string}>);
        identity = user.ok
          ? {state: 'available'}
          : {state: 'needs_login', detail: 'Host access has not been granted.'};
      }

      return {
        checkedAt,
        productId: this.productId,
        insideContainer: true,
        identity,
        sharedSession: statementStore ? {state: 'available'} : {state: 'unavailable'},
        payments: payments ? {state: 'available'} : {state: 'unavailable'},
        receiptArchive: receiptArchive ? {state: 'available'} : {state: 'unavailable'},
      };
    } catch (reason) {
      const failure = {state: 'error' as const, detail: errorDetail(reason)};
      return {
        checkedAt,
        productId: this.productId,
        insideContainer: false,
        identity: failure,
        sharedSession: failure,
        payments: failure,
        receiptArchive: failure,
      };
    }
  }

  async requestIdentity(): Promise<PolkadotHostIdentity> {
    const sdk = await this.sdkLoader();
    if (!(await sdk.isInsideContainer())) throw new Error('Polkadot host is unavailable.');
    const accounts = await sdk.getAccountsProvider();
    if (!accounts) throw new Error('Host identity is unavailable.');

    const login = await matchResult(accounts.requestLogin('Use ChopDot on this device.') as ResultAsyncLike<string>);
    if ('error' in login) throw new Error(login.error);
    if (login.value === 'rejected') throw new Error('Host access was not granted.');

    const [user, account] = await Promise.all([
      matchResult(accounts.getUserId() as ResultAsyncLike<{primaryUsername: string}>),
      matchResult(accounts.getProductAccount(this.productId, 0) as ResultAsyncLike<ProductAccount>),
    ]);
    if ('error' in user) throw new Error(user.error);
    if ('error' in account) throw new Error(account.error);

    const prefix = 42;
    return {
      username: user.value.primaryUsername,
      productId: this.productId,
      publicKey: account.value.publicKey,
      accountId: [accountIdFromBytes(account.value.publicKey, prefix), prefix],
    };
  }

  async openSessionChannel({
    identity,
    groupId,
    secret,
    onPacket,
  }: {
    identity: PolkadotHostIdentity;
    groupId: string;
    secret: string;
    onPacket: (packet: EncryptedSessionPacket, signerHex?: string) => void;
  }): Promise<{
    publish(packet: EncryptedSessionPacket): Promise<boolean>;
    close(): void;
  }> {
    const sdk = await this.sdkLoader();
    if (!(await sdk.getStatementStore())) throw new Error('Shared session is unavailable.');
    const client = sdk.createStatementStoreClient('chopdot-shell-proof');
    await client.connect({mode: 'host', accountId: identity.accountId});

    const topic = await sessionRoutingName(groupId, secret);
    const decryptionKey = await sessionRoutingKey(groupId, secret);
    const subscription: Unsubscribable = client.subscribe<EncryptedSessionPacket>(
      (statement: ReceivedStatement<EncryptedSessionPacket>) => {
        assertEncryptedSessionPacket(statement.data);
        onPacket(statement.data, statement.signerHex);
      },
      {topic2: topic},
    );

    return {
      publish: async packet => {
        assertEncryptedSessionPacket(packet);
        // Session events are append-only. A shared channel would apply
        // last-write-wins semantics and suppress concurrent participant events.
        //
        // statement-store >=0.5 resolves to Result<void, StatementStoreError>.
        // Collapse it here so the rest of the shell keeps its boolean contract.
        const result = await client.publish(packet, {topic2: topic, decryptionKey, ttlSeconds: 300});
        return result.ok;
      },
      close: () => {
        subscription.unsubscribe();
        client.destroy();
      },
    };
  }

  async requestPayment({
    amount,
    destination,
    onStatus,
  }: {
    amount: bigint;
    destination: Uint8Array;
    onStatus: (payment: ObservedHostPayment) => void;
  }): Promise<{requestId: string; close(): void}> {
    if (amount <= 0n) throw new Error('Payment amount must be positive.');
    if (destination.byteLength !== 32) throw new Error('Payment destination must be 32 bytes.');
    const sdk = await this.sdkLoader();
    const manager = await sdk.getPaymentManager();
    if (!manager) throw new Error('Host payments are unavailable.');
    // product-sdk-host >=0.12 takes the destination as a hex string, not raw bytes.
    const {id} = await manager.requestPayment(amount, bytesToHex(destination));
    const subscription = manager.subscribePaymentStatus(id, status => {
      onStatus({requestId: id, status, authority: 'observed_only'});
    });
    return {requestId: id, close: () => subscription.unsubscribe()};
  }

  async saveRedactedReceipt(receipt: RedactedReceiptPacket): Promise<`0x${string}`> {
    if (receipt.redacted !== true) throw new Error('Only redacted receipts can be archived.');
    const sdk = await this.sdkLoader();
    const manager = await sdk.getPreimageManager();
    if (!manager) throw new Error('Receipt archive is unavailable.');
    const payload = new TextEncoder().encode(JSON.stringify(receipt));
    return manager.submit(payload);
  }
}
