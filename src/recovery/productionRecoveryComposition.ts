import {canonicalJson, sha256Hex} from '../core/canonical.ts';
import type {
  CheckpointArchive,
  LaterEventSource,
  RecoveryLocatorStore,
} from './groupRecovery.ts';
import {GroupRecoveryService} from './groupRecovery.ts';
import type {CanonicalVerifier} from '../core/moneyEventKernel.ts';
import type {Bytes32, ContractAddress, GenesisHash, RecoveryHeadIndexPort} from './recoveryHeadIndex.ts';
import {
  RecoveryHeadLocatorGuard,
  type RecoveryLocatorReferenceResolver,
} from './recoveryLocatorHeadGuard.ts';

export interface RecoveryIdentityContextV1 {
  groupId: string;
  participantId: string;
  accountPublicKeyHex: string;
}

export interface RecoveryOwnerAddressDeriver {
  derive(input: {
    genesisHash: GenesisHash;
    accountPublicKeyHex: string;
  }): Promise<ContractAddress>;
}

/**
 * Public-beta composition: unlike the reusable replay service, this factory
 * has no headless/fallback branch. The official account-to-owner derivation
 * and exact genesis are required before recovery can be published or read.
 */
export async function createProductionGroupRecovery(input: {
  context: RecoveryIdentityContextV1;
  port: RecoveryHeadIndexPort;
  ownerAddresses: RecoveryOwnerAddressDeriver;
  archive: CheckpointArchive;
  locators: RecoveryLocatorStore;
  locatorReferences: RecoveryLocatorReferenceResolver;
  laterEvents: LaterEventSource;
  verifyEvent: CanonicalVerifier;
  verifyCheckpoint: CanonicalVerifier;
}): Promise<{
  service: GroupRecoveryService;
  ownerAddress: ContractAddress;
  stream: Bytes32;
  guard: RecoveryHeadLocatorGuard;
}> {
  const context = canonicalContext(input.context);
  const ownerAddress = normalizeOwnerAddress(await input.ownerAddresses.derive({
    genesisHash: input.port.genesisHash,
    accountPublicKeyHex: context.accountPublicKeyHex,
  }));
  const stream = await deriveRecoveryHeadStream(input.port.genesisHash, context);
  const guard = new RecoveryHeadLocatorGuard({
    port: input.port,
    ownerAddress,
    stream,
    context,
    locatorReferences: input.locatorReferences,
  });
  const service = new GroupRecoveryService({
    archive: input.archive,
    locators: input.locators,
    laterEvents: input.laterEvents,
    verifyEvent: input.verifyEvent,
    verifyCheckpoint: input.verifyCheckpoint,
    head: guard,
  });
  return {service, ownerAddress, stream, guard};
}

export async function deriveRecoveryHeadStream(
  genesisHashValue: string,
  contextValue: RecoveryIdentityContextV1,
): Promise<Bytes32> {
  const genesisHash = normalizeGenesisHash(genesisHashValue);
  const context = canonicalContext(contextValue);
  return (await sha256Hex(canonicalJson([
    'chopdot:recovery-head-stream:v1',
    genesisHash,
    context.accountPublicKeyHex,
    context.groupId,
    context.participantId,
  ]))).toLowerCase() as Bytes32;
}

function canonicalContext(value: RecoveryIdentityContextV1): RecoveryIdentityContextV1 {
  const groupId = value.groupId.trim();
  const participantId = value.participantId.trim();
  const accountPublicKeyHex = value.accountPublicKeyHex.trim().toLowerCase();
  if (!groupId || !participantId || !/^0x[0-9a-f]{64}$/u.test(accountPublicKeyHex)) {
    throw new Error('Production recovery identity context is invalid.');
  }
  return {groupId, participantId, accountPublicKeyHex};
}

function normalizeGenesisHash(value: string): GenesisHash {
  if (!/^0x[0-9a-f]{64}$/iu.test(value)) throw new Error('Production recovery genesis is invalid.');
  return value.toLowerCase() as GenesisHash;
}

function normalizeOwnerAddress(value: string): ContractAddress {
  if (!/^0x[0-9a-f]{40}$/iu.test(value)) throw new Error('Production recovery owner binding is invalid.');
  return value.toLowerCase() as ContractAddress;
}
