import type {
  AccountsProvider,
  AllocatableResource,
  AllocationOutcome,
  HostPaymentStatusSubscribeItem,
  PaymentManager,
  PreimageManager,
} from '@parity/product-sdk-host';
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
  signBytes?(data: Uint8Array): Promise<Uint8Array>;
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

type AccountsProviderLike = Pick<AccountsProvider, 'requestLogin' | 'getUserId' | 'getProductAccount'> & {
  getProductAccountSigner?(account: ProductAccount): {signBytes(data: Uint8Array): Promise<Uint8Array>};
};
type PaymentManagerLike = Pick<PaymentManager, 'requestPayment' | 'subscribePaymentStatus'>;
type PreimageManagerLike = Pick<PreimageManager, 'submit'>;

export interface HostSdkFacade {
  isInsideContainer(): Promise<boolean>;
  getAccountsProvider(): Promise<AccountsProviderLike | null>;
  getPaymentManager(): Promise<PaymentManagerLike | null>;
  getPreimageManager(): Promise<PreimageManagerLike | null>;
  getStatementStore(): Promise<unknown | null>;
  requestResourceAllocation(resources: AllocatableResource[]): Promise<HostSdkResult<AllocationOutcome[]>>;
  deriveEntropy(context: Uint8Array): Promise<HostSdkResult<Uint8Array>>;
  createStatementStoreClient(appName: string): StatementStoreClient;
}

type HostSdkResult<T> = {ok: true; value: T} | {ok: false; error: unknown};

const FALLBACK_PRODUCT_ID = 'chopdot-shell-proof.dot';
const identityRequests = new Map<string, Promise<PolkadotHostIdentity>>();

export function inferPolkadotProductId(hostname?: string): string {
  const currentHostname = hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname);
  const normalized = currentHostname.trim().toLowerCase().replace(/\.$/u, '');
  const devnetSuffixes = ['.app.dev-dot.li', '.dev-dot.li', '.app.paseo.li', '.paseo.li'];

  for (const suffix of devnetSuffixes) {
    if (normalized.endsWith(suffix)) {
      const label = normalized.slice(0, -suffix.length);
      return label && /^[a-z0-9-]+$/u.test(label) ? `${label}.dot` : FALLBACK_PRODUCT_ID;
    }
  }

  const nativeHostname = normalized.startsWith('app.') ? normalized.slice(4) : normalized;
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.dot$/u.test(nativeHostname)
    ? nativeHostname
    : FALLBACK_PRODUCT_ID;
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
    requestResourceAllocation: host.requestResourceAllocation,
    deriveEntropy: async context => {
      const result = await host.deriveEntropy(context);
      if (result.ok) return {ok: true, value: result.value};
      return {ok: false, error: 'Host entropy derivation failed.'};
    },
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
    productId = inferPolkadotProductId(),
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
    const inFlight = identityRequests.get(this.productId);
    if (inFlight) return inFlight;
    const request = this.requestIdentityOnce();
    identityRequests.set(this.productId, request);
    try {
      return await request;
    } finally {
      if (identityRequests.get(this.productId) === request) identityRequests.delete(this.productId);
    }
  }

  /**
   * Returns deterministic, account-bound recovery material from the host.
   * The host keeps the account secret; ChopDot supplies only a domain-separated
   * public context and fails closed when the capability is unavailable.
   */
  async deriveAccountEntropy(context: Uint8Array): Promise<Uint8Array> {
    if (context.byteLength === 0) throw new Error('Account recovery context is required.');
    const sdk = await this.sdkLoader();
    if (!(await sdk.isInsideContainer())) throw new Error('Account recovery is unavailable.');
    const result = await sdk.deriveEntropy(new Uint8Array(context));
    if (!result.ok || result.value.byteLength < 32) {
      throw new Error('Account recovery is unavailable.');
    }
    return new Uint8Array(result.value);
  }

  private async requestIdentityOnce(): Promise<PolkadotHostIdentity> {
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
      signBytes: async data => {
        if (!accounts.getProductAccountSigner) throw new Error('Product-account signing is unavailable.');
        return accounts.getProductAccountSigner(account.value).signBytes(data);
      },
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
    preparePublish(): Promise<boolean>;
    publish(packet: EncryptedSessionPacket, channelName?: string): Promise<boolean>;
    close(): void;
  }> {
    const sdk = await this.sdkLoader();
    if (!(await sdk.getStatementStore())) throw new Error('Shared session is unavailable.');
    const client = sdk.createStatementStoreClient('chopdot-shell-proof');
    await client.connect({mode: 'host', accountId: identity.accountId});
    let allocationRequest: Promise<boolean> | null = null;

    const ensureStatementStoreAllowance = async (): Promise<boolean> => {
      allocationRequest ??= sdk.requestResourceAllocation([
        {tag: 'StatementStoreAllowance', value: undefined},
      ]).then(result => result.ok && result.value[0] === 'Allocated');
      const allocated = await allocationRequest;
      if (!allocated) allocationRequest = null;
      return allocated;
    };

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
      preparePublish: ensureStatementStoreAllowance,
      publish: async (packet, channelName) => {
        assertEncryptedSessionPacket(packet);
        if (!(await ensureStatementStoreAllowance())) return false;
        // Ordinary session events remain append-only. A caller may opt into a
        // request-scoped channel for deterministic compact chunks so retries
        // replace the same chunk instead of consuming the per-user quota twice.
        //
        // statement-store >=0.5 resolves to Result<void, StatementStoreError>.
        // Collapse it here so the rest of the shell keeps its boolean contract.
        const result = await client.publish(packet, {
          ...(channelName ? {channel: channelName} : {}),
          topic2: topic,
          decryptionKey,
          ttlSeconds: 300,
        });
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
