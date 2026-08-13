import {
  canonicalJson,
  bytesToHex,
  cloneJson,
  hexToBytes,
  isRecord,
  sha256Hex,
} from '../core/canonical.ts';
import {
  canonicalStateHash,
  projectCanonicalEvents,
  type CanonicalEventV1,
  type CanonicalGroupStateV1,
  type CanonicalSigner,
  type CanonicalVerifier,
} from '../core/moneyEventKernel.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
const MAX_CHECKPOINT_EVENTS = 4096;
const MAX_CHECKPOINT_CIPHERTEXT_BYTES = 1024 * 1024;

export interface EncryptedGroupCheckpointV1 {
  v: 1;
  alg: 'A256GCM';
  groupId: string;
  issuerId: string;
  issuerAccountPublicKeyHex: string;
  keyVersion: number;
  projectionVersion: number;
  sourceEventIds: string[];
  frontierHash: string;
  stateHash: string;
  createdAt: string;
  iv: string;
  ciphertext: string;
  signatureHex: string;
}

export interface OpenedGroupCheckpointV1 {
  checkpoint: EncryptedGroupCheckpointV1;
  acceptedEvents: CanonicalEventV1[];
  state: CanonicalGroupStateV1;
  stateHash: string;
}

export async function createEncryptedGroupCheckpoint(input: {
  acceptedEvents: CanonicalEventV1[];
  groupKey: Uint8Array;
  keyVersion: number;
  issuerId: string;
  issuerAccountPublicKeyHex: string;
  createdAt: string;
  signer: CanonicalSigner;
  verifyEvent: CanonicalVerifier;
}): Promise<EncryptedGroupCheckpointV1> {
  assertGroupKey(input.groupKey);
  assertKeyVersion(input.keyVersion);
  assertIso(input.createdAt);
  if (input.acceptedEvents.length === 0 || input.acceptedEvents.length > MAX_CHECKPOINT_EVENTS) {
    throw new Error('Checkpoint event capacity is invalid.');
  }
  const projected = await projectCanonicalEvents(input.acceptedEvents, input.verifyEvent);
  if (projected.rejected.length || projected.conflicts.length || projected.state.version !== input.acceptedEvents.length) {
    throw new Error('Checkpoint source events do not form one accepted authority frontier.');
  }
  const issuer = projected.state.members[input.issuerId];
  if (
    projected.state.organizerId !== input.issuerId
    || issuer?.role !== 'organizer'
    || issuer.accountPublicKeyHex !== input.issuerAccountPublicKeyHex
  ) throw new Error('Only the account-bound organizer may issue a checkpoint.');

  const sourceEventIds = [...projected.state.eventIds];
  const frontierHash = await checkpointFrontierHash(input.acceptedEvents);
  const metadata = {
    v: 1 as const,
    alg: 'A256GCM' as const,
    groupId: projected.state.groupId,
    issuerId: input.issuerId,
    issuerAccountPublicKeyHex: input.issuerAccountPublicKeyHex,
    keyVersion: input.keyVersion,
    projectionVersion: projected.state.version,
    sourceEventIds,
    frontierHash,
    stateHash: projected.stateHash,
    createdAt: input.createdAt,
  };
  const plaintext = encoder.encode(canonicalJson({v: 1, acceptedEvents: input.acceptedEvents}));
  if (plaintext.byteLength > MAX_CHECKPOINT_CIPHERTEXT_BYTES) throw new Error('Checkpoint exceeds the supported capacity.');
  const key = await importGroupKey(input.groupKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = checkpointAad(metadata);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad}, key, plaintext));
  const unsigned = {...metadata, iv: toBase64Url(iv), ciphertext: toBase64Url(encrypted)};
  const signature = await input.signer.sign(checkpointSigningBytes(unsigned));
  if (!(signature instanceof Uint8Array) || signature.byteLength < 16) throw new Error('Checkpoint signature is invalid.');
  return {...unsigned, signatureHex: bytesToHex(signature)};
}

export async function openEncryptedGroupCheckpoint(input: {
  checkpoint: EncryptedGroupCheckpointV1;
  expectedGroupId: string;
  expectedRecipientAccountPublicKeyHex: string;
  minimumKeyVersion: number;
  groupKey: Uint8Array;
  verifyCheckpoint: CanonicalVerifier;
  verifyEvent: CanonicalVerifier;
}): Promise<OpenedGroupCheckpointV1> {
  const checkpoint = cloneJson(input.checkpoint);
  assertCheckpoint(checkpoint);
  assertGroupKey(input.groupKey);
  if (checkpoint.groupId !== input.expectedGroupId) throw new Error('Checkpoint belongs to another group.');
  if (checkpoint.keyVersion < input.minimumKeyVersion) throw new Error('Checkpoint key version is stale.');
  const {signatureHex, ...unsigned} = checkpoint;
  const signed = await input.verifyCheckpoint(
    checkpointSigningBytes(unsigned),
    hexToBytes(signatureHex),
    checkpoint.issuerAccountPublicKeyHex,
  );
  if (!signed) throw new Error('Checkpoint signature is invalid.');

  let payload: unknown;
  try {
    const key = await importGroupKey(input.groupKey);
    const plaintext = await crypto.subtle.decrypt(
      {name: 'AES-GCM', iv: fromBase64Url(checkpoint.iv), additionalData: checkpointAad(unsigned)},
      key,
      fromBase64Url(checkpoint.ciphertext),
    );
    payload = JSON.parse(decoder.decode(plaintext));
  } catch {
    throw new Error('Checkpoint could not be opened.');
  }
  if (!isRecord(payload) || payload.v !== 1 || !Array.isArray(payload.acceptedEvents)) {
    throw new Error('Checkpoint payload is invalid.');
  }
  const acceptedEvents = cloneJson(payload.acceptedEvents) as CanonicalEventV1[];
  if (acceptedEvents.length === 0 || acceptedEvents.length > MAX_CHECKPOINT_EVENTS) throw new Error('Checkpoint event capacity is invalid.');
  const projected = await projectCanonicalEvents(acceptedEvents, input.verifyEvent);
  if (projected.rejected.length || projected.conflicts.length || projected.state.version !== acceptedEvents.length) {
    throw new Error('Checkpoint authority events are invalid.');
  }
  const issuer = projected.state.members[checkpoint.issuerId];
  const recipient = Object.values(projected.state.members).find(member => member.accountPublicKeyHex === input.expectedRecipientAccountPublicKeyHex);
  if (!recipient) throw new Error('Checkpoint is not accessible to this group member.');
  if (
    projected.state.groupId !== checkpoint.groupId
    || projected.state.organizerId !== checkpoint.issuerId
    || issuer?.accountPublicKeyHex !== checkpoint.issuerAccountPublicKeyHex
    || issuer.role !== 'organizer'
    || projected.state.version !== checkpoint.projectionVersion
    || canonicalJson(projected.state.eventIds) !== canonicalJson(checkpoint.sourceEventIds)
    || projected.stateHash !== checkpoint.stateHash
    || await checkpointFrontierHash(acceptedEvents) !== checkpoint.frontierHash
    || await canonicalStateHash(projected.state) !== checkpoint.stateHash
  ) throw new Error('Checkpoint does not match its verified authority frontier.');
  return {checkpoint, acceptedEvents, state: projected.state, stateHash: projected.stateHash};
}

export async function checkpointFrontierHash(events: CanonicalEventV1[]): Promise<string> {
  return sha256Hex(canonicalJson(events.map(event => ({
    eventId: event.eventId,
    payloadHash: event.payloadHash,
    signatureHex: event.signatureHex,
  }))));
}

export function checkpointSigningBytes(checkpoint: Omit<EncryptedGroupCheckpointV1, 'signatureHex'>): Uint8Array {
  return encoder.encode(canonicalJson(['chopdot:encrypted-group-checkpoint:v1', checkpoint]));
}

function checkpointAad(checkpoint: Pick<EncryptedGroupCheckpointV1,
  'v' | 'alg' | 'groupId' | 'issuerId' | 'issuerAccountPublicKeyHex' | 'keyVersion'
  | 'projectionVersion' | 'sourceEventIds' | 'frontierHash' | 'stateHash' | 'createdAt'>): Uint8Array {
  const metadata = {
    v: checkpoint.v,
    alg: checkpoint.alg,
    groupId: checkpoint.groupId,
    issuerId: checkpoint.issuerId,
    issuerAccountPublicKeyHex: checkpoint.issuerAccountPublicKeyHex,
    keyVersion: checkpoint.keyVersion,
    projectionVersion: checkpoint.projectionVersion,
    sourceEventIds: checkpoint.sourceEventIds,
    frontierHash: checkpoint.frontierHash,
    stateHash: checkpoint.stateHash,
    createdAt: checkpoint.createdAt,
  };
  return encoder.encode(canonicalJson(['chopdot:encrypted-group-checkpoint:aad:v1', metadata]));
}

function assertCheckpoint(value: EncryptedGroupCheckpointV1): void {
  if (
    !isRecord(value)
    || value.v !== 1
    || value.alg !== 'A256GCM'
    || typeof value.groupId !== 'string'
    || !value.groupId
    || typeof value.issuerId !== 'string'
    || !value.issuerId
    || typeof value.issuerAccountPublicKeyHex !== 'string'
    || !/^0x[0-9a-f]{64}$/iu.test(value.issuerAccountPublicKeyHex)
    || !Number.isSafeInteger(value.projectionVersion)
    || value.projectionVersion < 1
    || !Array.isArray(value.sourceEventIds)
    || value.sourceEventIds.length !== value.projectionVersion
    || new Set(value.sourceEventIds).size !== value.sourceEventIds.length
    || typeof value.frontierHash !== 'string'
    || typeof value.stateHash !== 'string'
    || typeof value.iv !== 'string'
    || typeof value.ciphertext !== 'string'
    || typeof value.signatureHex !== 'string'
  ) throw new Error('Checkpoint is invalid.');
  assertKeyVersion(value.keyVersion);
  assertIso(value.createdAt);
  if (fromBase64Url(value.iv).byteLength !== 12) throw new Error('Checkpoint IV is invalid.');
  const ciphertextBytes = fromBase64Url(value.ciphertext);
  if (ciphertextBytes.byteLength < 17 || ciphertextBytes.byteLength > MAX_CHECKPOINT_CIPHERTEXT_BYTES + 16) {
    throw new Error('Checkpoint ciphertext capacity is invalid.');
  }
  hexToBytes(value.signatureHex);
}

function assertGroupKey(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) throw new Error('A 32-byte group key is required.');
}
function assertKeyVersion(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Checkpoint key version is invalid.');
}
function assertIso(value: string): void {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error('Checkpoint timestamp is invalid.');
}
async function importGroupKey(value: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new Uint8Array(value), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url.');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
