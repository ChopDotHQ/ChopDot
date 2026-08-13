import {canonicalJson, bytesToHex, cloneJson, hexToBytes, sha256Hex} from '../core/canonical.ts';
import {
  projectCanonicalEvents,
  type CanonicalEventV1,
  type CanonicalProjectionResult,
  type CanonicalSigner,
  type CanonicalVerifier,
} from '../core/moneyEventKernel.ts';
import {
  openAccountBoundGroupKeyEnvelope,
  type AccountEntropyProvider,
  type GroupKeyEnvelopeMetadata,
  type GroupKeyEnvelopeV1,
} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  checkpointSigningBytes,
  createEncryptedGroupCheckpoint,
  openEncryptedGroupCheckpoint,
  type EncryptedGroupCheckpointV1,
} from './encryptedGroupCheckpoint.ts';

const encoder = new TextEncoder();

export interface RecoveryLocatorV1 {
  v: 1;
  groupId: string;
  participantId: string;
  accountPublicKeyHex: string;
  keyVersion: number;
  checkpointRef: string;
  checkpointVersion: number;
  checkpointStateHash: string;
  frontierHash: string;
  publishedAt: string;
  issuerAccountPublicKeyHex: string;
  signatureHex: string;
}

export interface CheckpointArchive {
  put(checkpoint: EncryptedGroupCheckpointV1): Promise<string>;
  get(ref: string): Promise<EncryptedGroupCheckpointV1 | null>;
}

export interface RecoveryLocatorStore {
  put(locator: RecoveryLocatorV1): Promise<void>;
  get(groupId: string, participantId: string, accountPublicKeyHex: string): Promise<RecoveryLocatorV1 | null>;
}

export interface LaterEventSource {
  listAfter(groupId: string, version: number): Promise<CanonicalEventV1[]>;
}

export class GroupRecoveryService {
  constructor(private readonly edges: {
    archive: CheckpointArchive;
    locators: RecoveryLocatorStore;
    laterEvents: LaterEventSource;
    verifyEvent: CanonicalVerifier;
    verifyCheckpoint: CanonicalVerifier;
  }) {}

  async publish(input: {
    acceptedEvents: CanonicalEventV1[];
    groupKey: Uint8Array;
    keyVersion: number;
    issuerId: string;
    issuerAccountPublicKeyHex: string;
    recipientId: string;
    recipientAccountPublicKeyHex: string;
    createdAt: string;
    signer: CanonicalSigner;
  }): Promise<{checkpoint: EncryptedGroupCheckpointV1; locator: RecoveryLocatorV1}> {
    const checkpoint = await createEncryptedGroupCheckpoint({...input, verifyEvent: this.edges.verifyEvent});
    const checkpointRef = await this.edges.archive.put(checkpoint);
    const unsigned = {
      v: 1 as const,
      groupId: checkpoint.groupId,
      participantId: input.recipientId,
      accountPublicKeyHex: input.recipientAccountPublicKeyHex,
      keyVersion: checkpoint.keyVersion,
      checkpointRef,
      checkpointVersion: checkpoint.projectionVersion,
      checkpointStateHash: checkpoint.stateHash,
      frontierHash: checkpoint.frontierHash,
      publishedAt: input.createdAt,
      issuerAccountPublicKeyHex: input.issuerAccountPublicKeyHex,
    };
    const signature = await input.signer.sign(locatorSigningBytes(unsigned));
    const locator: RecoveryLocatorV1 = {...unsigned, signatureHex: bytesToHex(signature)};
    await this.edges.locators.put(locator);
    return {checkpoint, locator};
  }

  async recover(input: {
    productId: string;
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    minimumKeyVersion: number;
    keyEnvelope: GroupKeyEnvelopeV1;
    entropy: AccountEntropyProvider;
  }): Promise<CanonicalProjectionResult & {locator: RecoveryLocatorV1}> {
    const locator = await this.edges.locators.get(input.groupId, input.participantId, input.accountPublicKeyHex);
    if (!locator) throw new Error('No recovery record is available for this group.');
    assertLocator(locator);
    if (
      locator.groupId !== input.groupId
      || locator.participantId !== input.participantId
      || locator.accountPublicKeyHex !== input.accountPublicKeyHex
      || locator.keyVersion < input.minimumKeyVersion
    ) throw new Error('Recovery record does not match this account.');
    const {signatureHex, ...unsignedLocator} = locator;
    const locatorValid = await this.edges.verifyCheckpoint(
      locatorSigningBytes(unsignedLocator),
      hexToBytes(signatureHex),
      locator.issuerAccountPublicKeyHex,
    );
    if (!locatorValid) throw new Error('Recovery record signature is invalid.');

    const metadata: GroupKeyEnvelopeMetadata = {
      productId: input.productId,
      groupId: input.groupId,
      recipientId: input.participantId,
      recipientAccountPublicKeyHex: input.accountPublicKeyHex,
      keyVersion: locator.keyVersion,
    };
    const groupKey = await openAccountBoundGroupKeyEnvelope(input.keyEnvelope, metadata, input.entropy);
    const checkpoint = await this.edges.archive.get(locator.checkpointRef);
    if (!checkpoint) throw new Error('Recovery archive is unavailable.');
    const opened = await openEncryptedGroupCheckpoint({
      checkpoint,
      expectedGroupId: input.groupId,
      expectedRecipientAccountPublicKeyHex: input.accountPublicKeyHex,
      minimumKeyVersion: input.minimumKeyVersion,
      groupKey,
      verifyCheckpoint: this.edges.verifyCheckpoint,
      verifyEvent: this.edges.verifyEvent,
    });
    if (
      opened.checkpoint.projectionVersion !== locator.checkpointVersion
      || opened.stateHash !== locator.checkpointStateHash
      || opened.checkpoint.frontierHash !== locator.frontierHash
    ) throw new Error('Recovery locator does not match the archived checkpoint.');
    const later = await this.edges.laterEvents.listAfter(input.groupId, opened.state.version);
    const projected = await projectCanonicalEvents(later, this.edges.verifyEvent, opened.state);
    if (projected.rejected.length || projected.conflicts.length) throw new Error('Later group events could not be recovered safely.');
    return {...projected, locator};
  }
}

export class MemoryCheckpointArchive implements CheckpointArchive {
  private readonly rows = new Map<string, EncryptedGroupCheckpointV1>();
  async put(checkpoint: EncryptedGroupCheckpointV1): Promise<string> {
    const ref = `sha256:${(await sha256Hex(canonicalJson(checkpoint))).slice(2)}`;
    this.rows.set(ref, cloneJson(checkpoint));
    return ref;
  }
  async get(ref: string): Promise<EncryptedGroupCheckpointV1 | null> {
    const value = this.rows.get(ref);
    return value ? cloneJson(value) : null;
  }
  replace(ref: string, checkpoint: EncryptedGroupCheckpointV1): void {this.rows.set(ref, cloneJson(checkpoint))}
}

export class MemoryRecoveryLocatorStore implements RecoveryLocatorStore {
  private readonly rows = new Map<string, RecoveryLocatorV1>();
  async put(locator: RecoveryLocatorV1): Promise<void> {
    const key = locatorKey(locator.groupId, locator.participantId, locator.accountPublicKeyHex);
    const existing = this.rows.get(key);
    if (existing && existing.checkpointVersion > locator.checkpointVersion) throw new Error('Recovery locator rollback rejected.');
    if (existing && existing.keyVersion > locator.keyVersion) throw new Error('Recovery key rollback rejected.');
    this.rows.set(key, cloneJson(locator));
  }
  async get(groupId: string, participantId: string, accountPublicKeyHex: string): Promise<RecoveryLocatorV1 | null> {
    const row = this.rows.get(locatorKey(groupId, participantId, accountPublicKeyHex));
    return row ? cloneJson(row) : null;
  }
  replace(locator: RecoveryLocatorV1): void {
    this.rows.set(locatorKey(locator.groupId, locator.participantId, locator.accountPublicKeyHex), cloneJson(locator));
  }
}

export class KeyValueCheckpointArchive implements CheckpointArchive {
  constructor(private readonly storage: KeyValueStorage, private readonly namespace = 'chopdot-checkpoint-archive-v1') {}
  async put(checkpoint: EncryptedGroupCheckpointV1): Promise<string> {
    const ref = `sha256:${(await sha256Hex(canonicalJson(checkpoint))).slice(2)}`;
    this.storage.write(`${this.namespace}:${ref}`, JSON.stringify(checkpoint));
    const persisted = await this.get(ref);
    if (!persisted || canonicalJson(persisted) !== canonicalJson(checkpoint)) throw new Error('Checkpoint archive did not persist the record.');
    return ref;
  }
  async get(ref: string): Promise<EncryptedGroupCheckpointV1 | null> {
    const raw = this.storage.read(`${this.namespace}:${ref}`);
    if (!raw) return null;
    try {return cloneJson(JSON.parse(raw)) as EncryptedGroupCheckpointV1} catch {return null}
  }
}

export class KeyValueRecoveryLocatorStore implements RecoveryLocatorStore {
  constructor(private readonly storage: KeyValueStorage, private readonly namespace = 'chopdot-recovery-locators-v1') {}
  async put(locator: RecoveryLocatorV1): Promise<void> {
    const key = `${this.namespace}:${locatorKey(locator.groupId, locator.participantId, locator.accountPublicKeyHex)}`;
    const existing = await this.get(locator.groupId, locator.participantId, locator.accountPublicKeyHex);
    if (existing && (existing.checkpointVersion > locator.checkpointVersion || existing.keyVersion > locator.keyVersion)) {
      throw new Error('Recovery locator rollback rejected.');
    }
    this.storage.write(key, JSON.stringify(locator));
    const persisted = await this.get(locator.groupId, locator.participantId, locator.accountPublicKeyHex);
    if (!persisted || canonicalJson(persisted) !== canonicalJson(locator)) throw new Error('Recovery locator did not persist the record.');
  }
  async get(groupId: string, participantId: string, accountPublicKeyHex: string): Promise<RecoveryLocatorV1 | null> {
    const raw = this.storage.read(`${this.namespace}:${locatorKey(groupId, participantId, accountPublicKeyHex)}`);
    if (!raw) return null;
    try {return cloneJson(JSON.parse(raw)) as RecoveryLocatorV1} catch {return null}
  }
}

export class CanonicalEventStore {
  private readonly eventsKey: string;
  private readonly compactedKey: string;
  constructor(private readonly storage: KeyValueStorage, namespace = 'chopdot-canonical-events-v1') {
    this.eventsKey = `${namespace}:events`;
    this.compactedKey = `${namespace}:compacted`;
  }
  append(event: CanonicalEventV1): void {
    const compacted = this.compacted();
    if (compacted?.eventIds.includes(event.eventId)) throw new Error('Compacted event replay rejected.');
    const events = this.list();
    const existing = events.find(row => row.eventId === event.eventId);
    if (existing) {
      if (canonicalJson(existing) === canonicalJson(event)) return;
      throw new Error('Canonical event ID conflict.');
    }
    this.storage.write(this.eventsKey, JSON.stringify([...events, cloneJson(event)]));
  }
  list(): CanonicalEventV1[] {
    const raw = this.storage.read(this.eventsKey);
    if (!raw) return [];
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? cloneJson(value) : [];
    } catch {return []}
  }
  compact(input: {checkpointRef: string; checkpoint: EncryptedGroupCheckpointV1}): void {
    const events = this.list();
    const prefix = events.slice(0, input.checkpoint.projectionVersion).map(event => event.eventId);
    if (canonicalJson(prefix) !== canonicalJson(input.checkpoint.sourceEventIds)) throw new Error('Checkpoint is not the accepted local prefix.');
    this.storage.write(this.compactedKey, JSON.stringify({
      v: 1,
      checkpointRef: input.checkpointRef,
      stateHash: input.checkpoint.stateHash,
      frontierHash: input.checkpoint.frontierHash,
      eventIds: input.checkpoint.sourceEventIds,
    }));
    this.storage.write(this.eventsKey, JSON.stringify(events.slice(input.checkpoint.projectionVersion)));
  }
  compacted(): null | {v: 1; checkpointRef: string; stateHash: string; frontierHash: string; eventIds: string[]} {
    const raw = this.storage.read(this.compactedKey);
    if (!raw) return null;
    try {
      const row = JSON.parse(raw);
      return row?.v === 1 && Array.isArray(row.eventIds) ? row : null;
    } catch {return null}
  }
}

export class ArrayLaterEventSource implements LaterEventSource {
  constructor(private readonly events: CanonicalEventV1[]) {}
  async listAfter(groupId: string, version: number): Promise<CanonicalEventV1[]> {
    return cloneJson(this.events.filter(event => event.groupId === groupId && event.expectedVersion >= version));
  }
}

export function locatorSigningBytes(locator: Omit<RecoveryLocatorV1, 'signatureHex'>): Uint8Array {
  return encoder.encode(canonicalJson(['chopdot:recovery-locator:v1', locator]));
}

function assertLocator(value: RecoveryLocatorV1): void {
  if (
    value.v !== 1
    || !value.groupId
    || !value.participantId
    || !/^0x[0-9a-f]{64}$/iu.test(value.accountPublicKeyHex)
    || !/^0x[0-9a-f]{64}$/iu.test(value.issuerAccountPublicKeyHex)
    || !Number.isSafeInteger(value.keyVersion)
    || value.keyVersion < 1
    || !Number.isSafeInteger(value.checkpointVersion)
    || value.checkpointVersion < 1
    || !value.checkpointRef.startsWith('sha256:')
    || Number.isNaN(Date.parse(value.publishedAt))
  ) throw new Error('Recovery locator is invalid.');
}

function locatorKey(groupId: string, participantId: string, account: string): string {
  return `${groupId}\u0000${participantId}\u0000${account.toLowerCase()}`;
}
