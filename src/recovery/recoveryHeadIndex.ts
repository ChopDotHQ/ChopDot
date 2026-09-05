export type GenesisHash = `0x${string}`;
export type ContractAddress = `0x${string}`;
export type Bytes32 = `0x${string}`;
export type TransactionHash = `0x${string}`;

const UINT64_MAX = (1n << 64n) - 1n;
const ZERO_BYTES32 = `0x${'00'.repeat(32)}`;

/**
 * This ABI is intentionally smaller than a recovery protocol. The contract is
 * only an account-owned compare-and-swap pointer. Signed ChopEventV1 records,
 * encrypted checkpoints, and their deterministic replay remain authoritative.
 */
export const RECOVERY_HEAD_INDEX_ABI = [
  {
    type: 'function',
    name: 'readHead',
    stateMutability: 'view',
    inputs: [
      {name: 'owner', type: 'address'},
      {name: 'stream', type: 'bytes32'},
    ],
    outputs: [
      {name: 'sequence', type: 'uint64'},
      {name: 'digest', type: 'bytes32'},
    ],
  },
  {
    type: 'function',
    name: 'advanceHead',
    stateMutability: 'nonpayable',
    inputs: [
      {name: 'stream', type: 'bytes32'},
      {name: 'expectedSequence', type: 'uint64'},
      {name: 'expectedDigest', type: 'bytes32'},
      {name: 'nextDigest', type: 'bytes32'},
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'HeadAdvanced',
    anonymous: false,
    inputs: [
      {name: 'owner', type: 'address', indexed: true},
      {name: 'stream', type: 'bytes32', indexed: true},
      {name: 'sequence', type: 'uint64', indexed: false},
      {name: 'digest', type: 'bytes32', indexed: false},
    ],
  },
  {type: 'error', name: 'EmptyStream', inputs: []},
  {type: 'error', name: 'EmptyDigest', inputs: []},
  {
    type: 'error',
    name: 'HeadMismatch',
    inputs: [
      {name: 'actualSequence', type: 'uint64'},
      {name: 'actualDigest', type: 'bytes32'},
    ],
  },
  {type: 'error', name: 'SequenceExhausted', inputs: []},
] as const;

export interface RecoveryHeadIndexDeployment {
  genesisHash: string;
  address: string;
}

export type RecoveryHeadIndexDeploymentMap = Readonly<Record<GenesisHash, ContractAddress>>;

/**
 * The release integrator injects audited deployment outputs here. Keeping the
 * constructor data-only prevents a test or stale documentation address from
 * silently becoming a live recovery dependency.
 */
export function createRecoveryHeadIndexDeploymentMap(
  deployments: readonly RecoveryHeadIndexDeployment[],
): RecoveryHeadIndexDeploymentMap {
  const entries: Array<[GenesisHash, ContractAddress]> = [];
  const seen = new Set<string>();
  for (const deployment of deployments) {
    const genesisHash = normalizeGenesisHash(deployment.genesisHash);
    if (seen.has(genesisHash)) throw new Error('Recovery head deployment has a duplicate genesis hash.');
    seen.add(genesisHash);
    entries.push([genesisHash, normalizeContractAddress(deployment.address)]);
  }
  return Object.freeze(Object.fromEntries(entries)) as RecoveryHeadIndexDeploymentMap;
}

export function resolveRecoveryHeadIndexAddress(
  deployments: RecoveryHeadIndexDeploymentMap,
  genesisHash: string,
): ContractAddress {
  const normalized = normalizeGenesisHash(genesisHash);
  const address = deployments[normalized];
  if (!address) throw new Error(`Recovery head contract is not configured for genesis ${normalized}.`);
  return address;
}

export interface RecoveryHead {
  sequence: bigint;
  digest: Bytes32;
}

export interface RecoveryHeadIndexContractRequest {
  genesisHash: GenesisHash;
  address: ContractAddress;
  abi: typeof RECOVERY_HEAD_INDEX_ABI;
  functionName: 'readHead' | 'advanceHead';
  args: readonly unknown[];
}

export interface RecoveryHeadIndexTransport {
  readContract(request: RecoveryHeadIndexContractRequest): Promise<unknown>;
  writeContract(request: RecoveryHeadIndexContractRequest): Promise<unknown>;
}

export interface RecoveryHeadIndexPort {
  readonly genesisHash: GenesisHash;
  readonly address: ContractAddress;
  readHead(owner: string, stream: string): Promise<RecoveryHead>;
  advanceHead(input: {
    stream: string;
    expectedSequence: bigint;
    expectedDigest: string;
    nextDigest: string;
  }): Promise<{transactionHash: TransactionHash}>;
}

export function createRecoveryHeadIndexPort(input: {
  genesisHash: string;
  deployments: RecoveryHeadIndexDeploymentMap;
  transport: RecoveryHeadIndexTransport;
}): RecoveryHeadIndexPort {
  const genesisHash = normalizeGenesisHash(input.genesisHash);
  const address = resolveRecoveryHeadIndexAddress(input.deployments, genesisHash);

  return Object.freeze({
    genesisHash,
    address,
    async readHead(ownerValue: string, streamValue: string): Promise<RecoveryHead> {
      const owner = normalizeOwnerAddress(ownerValue);
      const stream = normalizeNonZeroBytes32(streamValue, 'Recovery head stream');
      const result = await input.transport.readContract({
        genesisHash,
        address,
        abi: RECOVERY_HEAD_INDEX_ABI,
        functionName: 'readHead',
        args: [owner, stream],
      });
      return parseHead(result);
    },
    async advanceHead(update: {
      stream: string;
      expectedSequence: bigint;
      expectedDigest: string;
      nextDigest: string;
    }): Promise<{transactionHash: TransactionHash}> {
      const stream = normalizeNonZeroBytes32(update.stream, 'Recovery head stream');
      const expectedSequence = normalizeExpectedSequence(update.expectedSequence);
      const expectedDigest = normalizeBytes32(update.expectedDigest, 'Recovery head expected digest');
      const nextDigest = normalizeNonZeroBytes32(update.nextDigest, 'Recovery head next digest');
      const result = await input.transport.writeContract({
        genesisHash,
        address,
        abi: RECOVERY_HEAD_INDEX_ABI,
        functionName: 'advanceHead',
        args: [stream, expectedSequence, expectedDigest, nextDigest],
      });
      return {transactionHash: parseTransactionHash(result)};
    },
  });
}

function parseHead(value: unknown): RecoveryHead {
  const tuple = Array.isArray(value) ? value : null;
  const record = isRecord(value) ? value : null;
  const sequenceValue = tuple?.[0] ?? record?.sequence;
  const digestValue = tuple?.[1] ?? record?.digest;
  const sequence = typeof sequenceValue === 'bigint'
    ? sequenceValue
    : typeof sequenceValue === 'number' && Number.isSafeInteger(sequenceValue)
      ? BigInt(sequenceValue)
      : typeof sequenceValue === 'string' && /^(?:0|[1-9][0-9]*)$/u.test(sequenceValue)
        ? BigInt(sequenceValue)
        : null;
  if (sequence === null || sequence < 0n || sequence > UINT64_MAX) {
    throw new Error('Recovery head response sequence is invalid.');
  }
  return {sequence, digest: normalizeBytes32(digestValue, 'Recovery head response digest')};
}

function parseTransactionHash(value: unknown): TransactionHash {
  if (!isRecord(value)) throw new Error('Recovery head write result is invalid.');
  return normalizeBytes32(value.transactionHash, 'Recovery head transaction hash');
}

function normalizeGenesisHash(value: unknown): GenesisHash {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{64}$/iu.test(value)) {
    throw new Error('Recovery head genesis hash is invalid.');
  }
  return value.toLowerCase() as GenesisHash;
}

function normalizeContractAddress(value: unknown): ContractAddress {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{40}$/iu.test(value)) {
    throw new Error('Recovery head contract address is invalid.');
  }
  return value.toLowerCase() as ContractAddress;
}

function normalizeOwnerAddress(value: unknown): ContractAddress {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{40}$/iu.test(value)) {
    throw new Error('Recovery head owner address is invalid.');
  }
  return value.toLowerCase() as ContractAddress;
}

function normalizeBytes32(value: unknown, label: string): Bytes32 {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{64}$/iu.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value.toLowerCase() as Bytes32;
}

function normalizeNonZeroBytes32(value: unknown, label: string): Bytes32 {
  const normalized = normalizeBytes32(value, label);
  if (normalized === ZERO_BYTES32) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function normalizeExpectedSequence(value: bigint): bigint {
  if (typeof value !== 'bigint' || value < 0n || value >= UINT64_MAX) {
    throw new Error('Recovery head expected sequence is invalid.');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
