import {accountIdFromBytes, deriveH160} from '@parity/product-sdk-address';
import {
  getAccountsProvider,
  getHostProvider,
  isChainSupported,
  type AccountsProvider,
  type ProductAccount,
} from '@parity/product-sdk-host';
import {ensureAccountMapped, submitAndWatch} from '@parity/product-sdk-tx';
import {Binary, createClient, type PolkadotSigner} from 'polkadot-api';
import {
  createRecoveryHeadIndexDeploymentMap,
  createRecoveryHeadIndexPort,
  type Bytes32,
  type ContractAddress,
  type GenesisHash,
  type RecoveryHeadIndexDeployment,
  type RecoveryHeadIndexPort,
  type RecoveryHeadIndexTransport,
} from './recoveryHeadIndex.ts';

const READ_HEAD_SELECTOR = '635f4200';
const ADVANCE_HEAD_SELECTOR = '1a97482d';
const MAX_U64 = (1n << 64n) - 1n;
const MAX_DRY_RUN = 18_446_744_073_709_551_615n;
const MIN_STORAGE_DEPOSIT = 2_000_000_000_000n;

interface RuntimeReleaseManifestV3 {
  schema: 'chopdot.release.v3';
  recoveryHeadIndex: {
    targetGeneses: Record<string, string>;
    deployments: Record<string, {
      assetHubGenesis: string;
      address: string;
      pvmBytecodeSha256: string;
      readbackBytecodeSha256: string;
    }>;
  };
}

export interface ProductionRecoveryHeadRuntime {
  genesisHash: GenesisHash;
  ownerAddress: ContractAddress;
  accountPublicKeyHex: `0x${string}`;
  port: RecoveryHeadIndexPort;
  close(): void;
}

type UnsafeReviveApi = {
  apis: {
    ReviveApi: {
      call(
        origin: string,
        destination: string,
        value: bigint,
        weightLimit: {ref_time: bigint; proof_size: bigint},
        storageDepositLimit: bigint,
        data: unknown,
      ): Promise<unknown>;
    };
  };
  query: {Revive: {OriginalAccount: {getValue(address: string): Promise<unknown>}}};
  tx: {
    Revive: {
      map_account(): unknown;
      call(input: {
        dest: string;
        value: bigint;
        weight_limit: {ref_time: bigint; proof_size: bigint};
        storage_deposit_limit: bigint;
        data: unknown;
      }): unknown;
    };
  };
};

interface ProductAccountSession {
  account: ProductAccount;
  signer: PolkadotSigner;
}

export async function loadRuntimeReleaseManifest(
  url = new URL('./release.json', document.baseURI).toString(),
  fetcher: typeof fetch = fetch,
): Promise<RuntimeReleaseManifestV3> {
  const response = await fetcher(url, {cache: 'no-store', credentials: 'same-origin'});
  if (!response.ok) throw new Error('The signed recovery release manifest is unavailable.');
  const value = await response.json() as unknown;
  assertReleaseManifest(value);
  return value;
}

export function recoveryDeploymentsFromRelease(
  release: RuntimeReleaseManifestV3,
): RecoveryHeadIndexDeployment[] {
  const deployments: RecoveryHeadIndexDeployment[] = [];
  for (const [environment, record] of Object.entries(release.recoveryHeadIndex.deployments)) {
    const expectedGenesis = release.recoveryHeadIndex.targetGeneses[environment]?.toLowerCase();
    if (!expectedGenesis || record.assetHubGenesis.toLowerCase() !== expectedGenesis) {
      throw new Error(`Recovery deployment ${environment} does not match its exact target genesis.`);
    }
    if (record.pvmBytecodeSha256 !== record.readbackBytecodeSha256) {
      throw new Error(`Recovery deployment ${environment} does not match the frozen PVM bytecode.`);
    }
    deployments.push({genesisHash: expectedGenesis, address: record.address});
  }
  if (deployments.length === 0) throw new Error('Recovery is not deployed for this release.');
  return deployments;
}

export async function selectSupportedRecoveryDeployment(input: {
  deployments: readonly RecoveryHeadIndexDeployment[];
  supports?: (genesisHash: GenesisHash) => Promise<boolean>;
}): Promise<RecoveryHeadIndexDeployment> {
  const supports = input.supports ?? (async genesisHash => {
    const result = await isChainSupported(genesisHash);
    return result.ok && result.value;
  });
  const supported: RecoveryHeadIndexDeployment[] = [];
  for (const deployment of input.deployments) {
    const genesisHash = normalizeGenesis(deployment.genesisHash);
    if (await supports(genesisHash)) supported.push({...deployment, genesisHash});
  }
  if (supported.length !== 1) {
    throw new Error(supported.length === 0
      ? 'This host does not support a recovery network from the frozen release.'
      : 'The host recovery network is ambiguous; no contract call was made.');
  }
  return supported[0];
}

export async function composeProductionRecoveryHeadRuntime(input: {
  productId: string;
  release?: RuntimeReleaseManifestV3;
  requestLogin?: boolean;
}): Promise<ProductionRecoveryHeadRuntime> {
  const release = input.release ?? await loadRuntimeReleaseManifest();
  const deployments = recoveryDeploymentsFromRelease(release);
  const selected = await selectSupportedRecoveryDeployment({deployments});
  const genesisHash = normalizeGenesis(selected.genesisHash);
  const accounts = await getAccountsProvider();
  if (!accounts) throw new Error('Recovery requires a compatible Polkadot host.');
  if (input.requestLogin !== false) await requireAcceptedLogin(accounts);
  const session = await productAccountSession(accounts, input.productId);
  const provider = await getHostProvider(genesisHash);
  if (!provider) throw new Error('The selected recovery network is unavailable in this host.');
  const client = createClient(provider);
  const api = client.getUnsafeApi() as unknown as UnsafeReviveApi;
  const accountPublicKeyHex = bytesToHex(session.account.publicKey);
  const ownerAddress = deriveH160(session.account.publicKey).toLowerCase() as ContractAddress;
  const transport = createPapiRecoveryHeadIndexTransport({
    api,
    signer: session.signer,
    accountId: accountIdFromBytes(session.account.publicKey, 42),
    ownerAddress,
  });
  const port = createRecoveryHeadIndexPort({
    genesisHash,
    deployments: createRecoveryHeadIndexDeploymentMap(deployments),
    transport,
  });
  return {
    genesisHash,
    ownerAddress,
    accountPublicKeyHex,
    port,
    close: () => client.destroy(),
  };
}

export function createPapiRecoveryHeadIndexTransport(input: {
  api: UnsafeReviveApi;
  signer: PolkadotSigner;
  accountId: string;
  ownerAddress: ContractAddress;
}): RecoveryHeadIndexTransport {
  async function dryRun(address: ContractAddress, data: `0x${string}`) {
    const raw = await input.api.apis.ReviveApi.call(
      input.accountId,
      address,
      0n,
      {ref_time: MAX_DRY_RUN, proof_size: MAX_DRY_RUN},
      MAX_DRY_RUN,
      Binary.fromHex(data),
    );
    return parseDryRun(raw);
  }
  return {
    async readContract(request) {
      assertRequestContext(request, 'readHead');
      const [owner, stream] = request.args;
      const data = encodeReadHead(owner, stream);
      const result = await dryRun(request.address, data);
      return decodeReadHead(result.data);
    },
    async writeContract(request) {
      assertRequestContext(request, 'advanceHead');
      const [stream, expectedSequence, expectedDigest, nextDigest] = request.args;
      const data = encodeAdvanceHead(stream, expectedSequence, expectedDigest, nextDigest);
      await ensureAccountMapped(
        input.accountId,
        input.signer,
        {
          addressIsMapped: async () => {
            const original = await input.api.query.Revive.OriginalAccount.getValue(input.ownerAddress);
            return original !== null && original !== undefined;
          },
        },
        input.api as never,
        {timeoutMs: 120_000},
      );
      const prepared = await dryRun(request.address, data);
      const transaction = input.api.tx.Revive.call({
        dest: request.address,
        value: 0n,
        weight_limit: prepared.weightRequired,
        storage_deposit_limit: maxBigInt(MIN_STORAGE_DEPOSIT, prepared.storageDeposit * 12n / 10n),
        data: Binary.fromHex(data),
      });
      const result = await submitAndWatch(transaction as never, input.signer, {
        waitFor: 'finalized',
        timeoutMs: 300_000,
      });
      if (!result.ok || !/^0x[0-9a-f]{64}$/iu.test(result.txHash)) {
        throw new Error('Recovery head update did not finalize successfully.');
      }
      return {transactionHash: result.txHash.toLowerCase()};
    },
  };
}

export function encodeReadHead(ownerValue: unknown, streamValue: unknown): `0x${string}` {
  const owner = normalizeAddress(ownerValue).slice(2);
  const stream = normalizeBytes32(streamValue, 'Recovery stream').slice(2);
  return `0x${READ_HEAD_SELECTOR}${owner.padStart(64, '0')}${stream}`;
}

export function encodeAdvanceHead(
  streamValue: unknown,
  sequenceValue: unknown,
  expectedDigestValue: unknown,
  nextDigestValue: unknown,
): `0x${string}` {
  const stream = normalizeBytes32(streamValue, 'Recovery stream').slice(2);
  if (typeof sequenceValue !== 'bigint' || sequenceValue < 0n || sequenceValue > MAX_U64) {
    throw new Error('Recovery sequence is invalid.');
  }
  const sequence = sequenceValue.toString(16).padStart(64, '0');
  const expected = normalizeBytes32(expectedDigestValue, 'Expected recovery digest').slice(2);
  const next = normalizeBytes32(nextDigestValue, 'Next recovery digest').slice(2);
  return `0x${ADVANCE_HEAD_SELECTOR}${stream}${sequence}${expected}${next}`;
}

export function decodeReadHead(value: unknown): [bigint, Bytes32] {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{128}$/iu.test(value)) {
    throw new Error('Recovery head returned malformed ABI data.');
  }
  const sequence = BigInt(`0x${value.slice(2, 66)}`);
  if (sequence > MAX_U64) throw new Error('Recovery head sequence exceeds uint64.');
  return [sequence, `0x${value.slice(66).toLowerCase()}` as Bytes32];
}

function parseDryRun(raw: unknown): {
  data: `0x${string}`;
  weightRequired: {ref_time: bigint; proof_size: bigint};
  storageDeposit: bigint;
} {
  const row = record(raw);
  const result = record(row.result);
  const ok = record(result.success ?? result.ok ?? result.value?.success ?? result.value?.ok);
  const flags = asBigInt(ok.flags ?? 0n, 'Recovery dry-run flags');
  const data = binaryHex(ok.data);
  if (!data || (flags & 1n) === 1n || result.error || result.err) {
    throw new Error('Recovery contract dry-run reverted; nothing was submitted.');
  }
  const weight = record(row.weight_required ?? row.weight_consumed);
  const weightRequired = {
    ref_time: asBigInt(weight.ref_time ?? weight.refTime ?? weight.reference_time ?? weight.referenceTime, 'Recovery dry-run reference weight'),
    proof_size: asBigInt(weight.proof_size ?? weight.proofSize, 'Recovery dry-run proof weight'),
  };
  const storage = row.storage_deposit;
  const storageRow = recordOrNull(storage);
  const storageDeposit = asBigInt(storageRow?.charge ?? storageRow?.value ?? storage ?? 0n, 'Recovery dry-run storage deposit');
  return {data, weightRequired, storageDeposit};
}

function assertReleaseManifest(value: unknown): asserts value is RuntimeReleaseManifestV3 {
  const row = record(value);
  const recovery = record(row.recoveryHeadIndex);
  if (row.schema !== 'chopdot.release.v3' || !isStringRecord(recovery.targetGeneses) || !isRecordRecord(recovery.deployments)) {
    throw new Error('The recovery release manifest is invalid.');
  }
}

function assertRequestContext(request: {functionName: string; genesisHash: string; address: string}, expected: string): void {
  if (request.functionName !== expected) throw new Error('Recovery contract function is not allowed.');
  normalizeGenesis(request.genesisHash);
  normalizeAddress(request.address);
}

async function requireAcceptedLogin(accounts: AccountsProvider): Promise<void> {
  const result = await accounts.requestLogin('Restore or protect your ChopDot groups.').match(
    value => ({ok: true as const, value}),
    () => ({ok: false as const}),
  );
  const loginValue: unknown = result.ok ? result.value : null;
  if (!result.ok || loginValue === 'rejected') throw new Error('Host account access was not granted.');
}

async function productAccountSession(accounts: AccountsProvider, productId: string): Promise<ProductAccountSession> {
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.dot$/u.test(productId)) throw new Error('Recovery product identity is invalid.');
  const account = await accounts.getProductAccount(productId, 0).match(
    value => value,
    () => null,
  );
  if (!account || account.publicKey.byteLength !== 32) throw new Error('Recovery product account is unavailable.');
  return {account, signer: accounts.getProductAccountSigner(account)};
}

function normalizeGenesis(value: unknown): GenesisHash {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{64}$/iu.test(value)) throw new Error('Recovery genesis is invalid.');
  return value.toLowerCase() as GenesisHash;
}

function normalizeAddress(value: unknown): ContractAddress {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{40}$/iu.test(value)) throw new Error('Recovery address is invalid.');
  return value.toLowerCase() as ContractAddress;
}

function normalizeBytes32(value: unknown, label: string): Bytes32 {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{64}$/iu.test(value)) throw new Error(`${label} is invalid.`);
  return value.toLowerCase() as Bytes32;
}

function bytesToHex(value: Uint8Array): `0x${string}` {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function binaryHex(value: unknown): `0x${string}` | null {
  if (typeof value === 'string' && /^0x[0-9a-f]*$/iu.test(value)) return value.toLowerCase() as `0x${string}`;
  if (value && typeof value === 'object' && 'asHex' in value && typeof value.asHex === 'function') {
    return binaryHex(value.asHex());
  }
  return null;
}

function asBigInt(value: unknown, label: string): bigint {
  if (typeof value === 'bigint' && value >= 0n) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === 'string' && /^(?:0|[1-9][0-9]*)$/u.test(value)) return BigInt(value);
  throw new Error(`${label} is invalid.`);
}

function maxBigInt(left: bigint, right: bigint): bigint {return left > right ? left : right}

function record(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Recovery runtime response is invalid.');
  return value as Record<string, any>;
}

function recordOrNull(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every(row => typeof row === 'string'));
}

function isRecordRecord(value: unknown): value is Record<string, Record<string, unknown>> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every(row => Boolean(row && typeof row === 'object' && !Array.isArray(row))));
}
