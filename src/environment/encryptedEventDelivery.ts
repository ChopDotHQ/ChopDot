import type {KeyValueStorage} from './livePayerSync.ts';
import {
  verifyProductAccountSignature,
  type AccountMessageSigner,
  type AccountMessageVerifier,
} from '../membership/groupKeyHandoff.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
const ENVELOPE_DOMAIN = 'chopdot:encrypted-delivery-envelope:v1';
const ACK_DOMAIN = 'chopdot:encrypted-delivery-ack:v1';
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const MAX_CIPHERTEXT_BYTES = MAX_PAYLOAD_BYTES + 16;
const MAX_CIPHERTEXT_BASE64URL_LENGTH = Math.ceil(MAX_CIPHERTEXT_BYTES * 4 / 3) + 4;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

export type DeliveryJson = null | boolean | number | string | DeliveryJson[] | {[key: string]: DeliveryJson};

export interface EncryptedDeliveryPayloadV1 {
  v: 1;
  kind: string;
  body: DeliveryJson;
}

export interface EncryptedDeliveryEnvelopeV1 {
  v: 1;
  alg: 'A256GCM';
  envelopeId: string;
  channelId: string;
  senderAccountPublicKeyHex: string;
  recipientAccountPublicKeyHex: string;
  keyVersion: number;
  createdAt: string;
  expiresAt: string;
  iv: string;
  ciphertext: string;
  signatureHex: string;
}

export interface EncryptedDeliveryAckV1 {
  v: 1;
  ackId: string;
  envelopeId: string;
  acknowledgingAccountPublicKeyHex: string;
  intendedSenderAccountPublicKeyHex: string;
  receivedAt: string;
  signatureHex: string;
}

export async function createEncryptedDeliveryEnvelope(input: {
  envelopeId?: string;
  channelId: string;
  senderAccountPublicKeyHex: string;
  recipientAccountPublicKeyHex: string;
  keyVersion: number;
  createdAt?: string;
  expiresAt: string;
  deliveryKey: Uint8Array;
  payload: EncryptedDeliveryPayloadV1;
  signer: AccountMessageSigner;
}): Promise<EncryptedDeliveryEnvelopeV1> {
  assertDeliveryKey(input.deliveryKey);
  const metadata = canonicalEnvelopeMetadata({
    v: 1,
    alg: 'A256GCM',
    envelopeId: input.envelopeId ?? crypto.randomUUID(),
    channelId: input.channelId,
    senderAccountPublicKeyHex: input.senderAccountPublicKeyHex,
    recipientAccountPublicKeyHex: input.recipientAccountPublicKeyHex,
    keyVersion: input.keyVersion,
    createdAt: input.createdAt ?? new Date().toISOString(),
    expiresAt: input.expiresAt,
  });
  if (Date.parse(metadata.expiresAt) <= Date.parse(metadata.createdAt)) {
    throw new Error('Encrypted delivery expiry is invalid.');
  }
  const payload = canonicalPayload(input.payload);
  const plaintext = encoder.encode(stableSerialize(payload));
  if (plaintext.byteLength > MAX_PAYLOAD_BYTES) throw new Error('Encrypted delivery payload is too large.');
  const key = await importDeliveryKey(input.deliveryKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    {name: 'AES-GCM', iv, additionalData: envelopeAad(metadata)},
    key,
    plaintext,
  ));
  const unsigned = {
    ...metadata,
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(ciphertext),
  };
  const signature = await input.signer.signBytes(envelopeSigningBytes(unsigned));
  assertSignature(signature);
  return {...unsigned, signatureHex: bytesToHex(signature)};
}

export async function openEncryptedDeliveryEnvelope(input: {
  envelope: EncryptedDeliveryEnvelopeV1;
  expectedRecipientAccountPublicKeyHex: string;
  expectedChannelId: string;
  expectedKeyVersion: number;
  deliveryKey: Uint8Array;
  now?: string;
  verifier?: AccountMessageVerifier;
}): Promise<EncryptedDeliveryPayloadV1> {
  const envelope = canonicalEnvelope(input.envelope);
  assertDeliveryKey(input.deliveryKey);
  const recipient = normalizeAccount(input.expectedRecipientAccountPublicKeyHex);
  const channelId = required(input.expectedChannelId, 'Encrypted delivery channel is invalid.');
  const now = canonicalTimestamp(input.now ?? new Date().toISOString());
  if (
    !recipient
    || envelope.recipientAccountPublicKeyHex !== recipient
    || envelope.channelId !== channelId
    || envelope.keyVersion !== input.expectedKeyVersion
  ) throw new Error('Encrypted delivery does not belong to this recipient context.');
  if (Date.parse(now) >= Date.parse(envelope.expiresAt)) throw new Error('Encrypted delivery has expired.');
  const {signatureHex, ...unsigned} = envelope;
  const verifier = input.verifier ?? verifyProductAccountSignature;
  if (!await verifier(
    envelope.senderAccountPublicKeyHex,
    envelopeSigningBytes(unsigned),
    hexToBytes(signatureHex),
  )) throw new Error('Encrypted delivery signature is invalid.');

  try {
    const key = await importDeliveryKey(input.deliveryKey);
    const plaintext = await crypto.subtle.decrypt(
      {name: 'AES-GCM', iv: fromBase64Url(envelope.iv), additionalData: envelopeAad(unsigned)},
      key,
      fromBase64Url(envelope.ciphertext),
    );
    const decoded = decoder.decode(plaintext);
    if (encoder.encode(decoded).byteLength > MAX_PAYLOAD_BYTES) throw new Error('Payload too large.');
    return canonicalPayload(JSON.parse(decoded));
  } catch (reason) {
    if (reason instanceof Error && /payload|kind|version/u.test(reason.message)) throw reason;
    throw new Error('Encrypted delivery could not be opened.');
  }
}

export async function createEncryptedDeliveryAck(input: {
  envelope: EncryptedDeliveryEnvelopeV1;
  acknowledgingAccountPublicKeyHex: string;
  receivedAt?: string;
  ackId?: string;
  signer: AccountMessageSigner;
}): Promise<EncryptedDeliveryAckV1> {
  const envelope = canonicalEnvelope(input.envelope);
  const acknowledgingAccountPublicKeyHex = normalizeAccount(input.acknowledgingAccountPublicKeyHex);
  if (acknowledgingAccountPublicKeyHex !== envelope.recipientAccountPublicKeyHex) {
    throw new Error('Only the intended recipient can acknowledge this delivery.');
  }
  const unsigned = canonicalAckUnsigned({
    v: 1,
    ackId: input.ackId ?? crypto.randomUUID(),
    envelopeId: envelope.envelopeId,
    acknowledgingAccountPublicKeyHex,
    intendedSenderAccountPublicKeyHex: envelope.senderAccountPublicKeyHex,
    receivedAt: input.receivedAt ?? new Date().toISOString(),
  });
  const signature = await input.signer.signBytes(ackSigningBytes(unsigned));
  assertSignature(signature);
  return {...unsigned, signatureHex: bytesToHex(signature)};
}

export async function verifyEncryptedDeliveryAck(
  ackValue: EncryptedDeliveryAckV1,
  envelopeValue: EncryptedDeliveryEnvelopeV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    const ack = canonicalAck(ackValue);
    const envelope = canonicalEnvelope(envelopeValue);
    if (
      ack.envelopeId !== envelope.envelopeId
      || ack.acknowledgingAccountPublicKeyHex !== envelope.recipientAccountPublicKeyHex
      || ack.intendedSenderAccountPublicKeyHex !== envelope.senderAccountPublicKeyHex
      || Date.parse(ack.receivedAt) < Date.parse(envelope.createdAt)
      || Date.parse(ack.receivedAt) >= Date.parse(envelope.expiresAt)
    ) return false;
    const {signatureHex, ...unsigned} = ack;
    return verifier(
      ack.acknowledgingAccountPublicKeyHex,
      ackSigningBytes(unsigned),
      hexToBytes(signatureHex),
    );
  } catch {
    return false;
  }
}

export function assertEncryptedDeliveryEnvelope(value: unknown): asserts value is EncryptedDeliveryEnvelopeV1 {
  canonicalEnvelope(value as EncryptedDeliveryEnvelopeV1);
}

export function assertEncryptedDeliveryAck(value: unknown): asserts value is EncryptedDeliveryAckV1 {
  canonicalAck(value as EncryptedDeliveryAckV1);
}

export interface PendingEncryptedDelivery {
  envelope: EncryptedDeliveryEnvelopeV1;
  queuedAt: string;
  attempts: number;
  nextAttemptAt: string;
  lastAttemptAt?: string;
}

interface InboxReceipt {
  envelopeId: string;
  fingerprint: string;
  receivedAt: string;
  ack: EncryptedDeliveryAckV1;
}

/**
 * Durable ciphertext-only delivery state. Decrypted payloads and delivery keys
 * never enter this store; signed domain reducers remain the only authority.
 */
export class EncryptedEventDeliveryQueue {
  private readonly outboxKey: string;
  private readonly inboxKey: string;
  private readonly ackKey: string;

  constructor(private readonly storage: KeyValueStorage, namespace = 'chopdot-encrypted-delivery-v1') {
    const canonicalNamespace = required(namespace, 'Encrypted delivery namespace is invalid.');
    this.outboxKey = `${canonicalNamespace}:outbox`;
    this.inboxKey = `${canonicalNamespace}:inbox`;
    this.ackKey = `${canonicalNamespace}:acks`;
  }

  enqueue(envelopeValue: EncryptedDeliveryEnvelopeV1, queuedAt?: string): PendingEncryptedDelivery {
    return this.enqueueMany([{envelope: envelopeValue, ...(queuedAt ? {queuedAt} : {})}])[0];
  }

  /** Validate the complete ciphertext batch before one durable outbox write. */
  enqueueMany(values: Array<{envelope: EncryptedDeliveryEnvelopeV1; queuedAt?: string}>): PendingEncryptedDelivery[] {
    if (values.length === 0) return [];
    const acknowledgedIds = new Set(this.acknowledgements().map(ack => ack.envelopeId));
    const items = this.pending();
    const next = [...items];
    const results: PendingEncryptedDelivery[] = [];
    for (const value of values) {
      const envelope = canonicalEnvelope(value.envelope);
      if (acknowledgedIds.has(envelope.envelopeId)) {
        throw new Error('Encrypted delivery is already acknowledged.');
      }
      const existing = next.find(item => item.envelope.envelopeId === envelope.envelopeId);
      if (existing) {
        if (envelopeFingerprint(existing.envelope) !== envelopeFingerprint(envelope)) {
          throw new Error('Encrypted delivery identifier is already in use.');
        }
        results.push(existing);
        continue;
      }
      if (results.some(item => item.envelope.envelopeId === envelope.envelopeId)) {
        throw new Error('Encrypted delivery identifier is already in use.');
      }
      const timestamp = canonicalTimestamp(value.queuedAt ?? envelope.createdAt);
      const item: PendingEncryptedDelivery = {envelope, queuedAt: timestamp, attempts: 0, nextAttemptAt: timestamp};
      next.push(item);
      results.push(item);
    }
    this.write(this.outboxKey, next);
    return results;
  }

  pending(): PendingEncryptedDelivery[] {
    const acknowledgedIds = new Set(this.acknowledgements().map(ack => ack.envelopeId));
    return this.rawPending().filter(item => !acknowledgedIds.has(item.envelope.envelopeId));
  }

  hasPending(envelopeId: string): boolean {
    return this.pending().some(item => item.envelope.envelopeId === required(envelopeId, 'Encrypted delivery identifier is invalid.'));
  }

  hasAcknowledged(envelopeId: string): boolean {
    return this.acknowledgements().some(item => item.envelopeId === required(envelopeId, 'Encrypted delivery identifier is invalid.'));
  }

  async flush(
    send: (envelope: EncryptedDeliveryEnvelopeV1) => Promise<unknown>,
    now = new Date().toISOString(),
  ): Promise<{attempted: string[]; acceptedByCarrier: string[]; failed: string[]; pending: string[]}> {
    const timestamp = canonicalTimestamp(now);
    const attempted: string[] = [];
    const acceptedByCarrier: string[] = [];
    const failed: string[] = [];
    const updated: PendingEncryptedDelivery[] = [];
    for (const item of this.pending()) {
      if (Date.parse(item.envelope.expiresAt) <= Date.parse(timestamp)) continue;
      if (Date.parse(item.nextAttemptAt) > Date.parse(timestamp)) {
        updated.push(item);
        continue;
      }
      attempted.push(item.envelope.envelopeId);
      let accepted = false;
      try {
        await send(item.envelope);
        accepted = true;
        acceptedByCarrier.push(item.envelope.envelopeId);
      } catch {
        failed.push(item.envelope.envelopeId);
      }
      const attempts = item.attempts + 1;
      updated.push({
        ...item,
        attempts,
        lastAttemptAt: timestamp,
        nextAttemptAt: new Date(Date.parse(timestamp) + retryBackoffMs(attempts, accepted)).toISOString(),
      });
    }
    this.write(this.outboxKey, updated);
    return {attempted, acceptedByCarrier, failed, pending: updated.map(item => item.envelope.envelopeId)};
  }

  async receive(input: {
    envelope: EncryptedDeliveryEnvelopeV1;
    expectedRecipientAccountPublicKeyHex: string;
    expectedChannelId: string;
    expectedKeyVersion: number;
    deliveryKey: Uint8Array;
    receivedAt?: string;
    signer: AccountMessageSigner;
    verifier?: AccountMessageVerifier;
    /**
     * Apply the decrypted, authenticated payload before persisting an inbox
     * receipt or signing an acknowledgement. A failed authority transition
     * therefore remains retryable and can never be acknowledged as accepted.
     */
    apply?: (payload: EncryptedDeliveryPayloadV1) => Promise<void>;
  }): Promise<
    | {outcome: 'applied'; payload: EncryptedDeliveryPayloadV1; ack: EncryptedDeliveryAckV1}
    | {outcome: 'duplicate'; ack: EncryptedDeliveryAckV1}
  > {
    const envelope = canonicalEnvelope(input.envelope);
    const fingerprint = envelopeFingerprint(envelope);
    const existing = this.inbox().find(receipt => receipt.envelopeId === envelope.envelopeId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error('Encrypted delivery identifier is already in use.');
      return {outcome: 'duplicate', ack: existing.ack};
    }
    const receivedAt = canonicalTimestamp(input.receivedAt ?? new Date().toISOString());
    const payload = await openEncryptedDeliveryEnvelope({...input, envelope, now: receivedAt});
    await input.apply?.(payload);
    const ack = await createEncryptedDeliveryAck({
      envelope,
      acknowledgingAccountPublicKeyHex: input.expectedRecipientAccountPublicKeyHex,
      receivedAt,
      signer: input.signer,
    });
    this.write(this.inboxKey, [...this.inbox(), {envelopeId: envelope.envelopeId, fingerprint, receivedAt, ack}]);
    return {outcome: 'applied', payload, ack};
  }

  async acknowledge(
    ackValue: EncryptedDeliveryAckV1,
    verifier: AccountMessageVerifier = verifyProductAccountSignature,
  ): Promise<'applied' | 'idempotent' | 'rejected'> {
    let ack: EncryptedDeliveryAckV1;
    try { ack = canonicalAck(ackValue); } catch { return 'rejected'; }
    const prior = this.acknowledgements().find(candidate => candidate.envelopeId === ack.envelopeId);
    if (prior) return stableSerialize(prior) === stableSerialize(ack) ? 'idempotent' : 'rejected';
    const pending = this.rawPending();
    const item = pending.find(candidate => candidate.envelope.envelopeId === ack.envelopeId);
    if (!item || !await verifyEncryptedDeliveryAck(ack, item.envelope, verifier)) return 'rejected';
    // Persist the signed acknowledgement before clearing the physical outbox.
    // If cleanup then fails, pending() hides the acknowledged ciphertext and a
    // recreated queue cannot resend or recreate the deterministic envelope ID.
    this.write(this.ackKey, [...this.acknowledgements(), ack]);
    this.write(this.outboxKey, pending.filter(candidate => candidate.envelope.envelopeId !== ack.envelopeId));
    return 'applied';
  }

  acknowledgements(): EncryptedDeliveryAckV1[] {
    return this.readArray(this.ackKey, canonicalAck);
  }

  private inbox(): InboxReceipt[] {
    return this.readArray(this.inboxKey, canonicalInboxReceipt);
  }

  private rawPending(): PendingEncryptedDelivery[] {
    return this.readArray(this.outboxKey, canonicalPendingDelivery);
  }

  private readArray<T>(key: string, parse: (value: unknown) => T): T[] {
    const raw = this.storage.read(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Stored value is not an array.');
      const values: T[] = [];
      for (const candidate of parsed) {
        values.push(parse(candidate));
      }
      return values;
    } catch {
      throw new Error('Encrypted delivery storage is corrupt.');
    }
  }

  private write(key: string, value: unknown): void {
    const serialized = stableSerialize(value);
    this.storage.write(key, serialized);
    if (this.storage.read(key) !== serialized) {
      throw new Error('Encrypted delivery storage write could not be verified.');
    }
  }
}

function canonicalEnvelope(value: EncryptedDeliveryEnvelopeV1): EncryptedDeliveryEnvelopeV1 {
  if (!isRecord(value) || value.v !== 1 || value.alg !== 'A256GCM') throw new Error('Encrypted delivery is invalid.');
  const metadata = canonicalEnvelopeMetadata(value);
  const iv = required(value.iv, 'Encrypted delivery IV is invalid.');
  const ciphertext = required(value.ciphertext, 'Encrypted delivery ciphertext is invalid.');
  const signatureHex = canonicalSignatureHex(value.signatureHex);
  if (ciphertext.length > MAX_CIPHERTEXT_BASE64URL_LENGTH) {
    throw new Error('Encrypted delivery ciphertext exceeds the inbound limit.');
  }
  const ciphertextBytes = fromBase64Url(ciphertext);
  if (fromBase64Url(iv).byteLength !== 12 || ciphertextBytes.byteLength < 16 || ciphertextBytes.byteLength > MAX_CIPHERTEXT_BYTES) {
    throw new Error('Encrypted delivery ciphertext is invalid.');
  }
  if (Date.parse(metadata.expiresAt) <= Date.parse(metadata.createdAt)) throw new Error('Encrypted delivery expiry is invalid.');
  return {...metadata, iv, ciphertext, signatureHex};
}

function canonicalEnvelopeMetadata(value: Pick<EncryptedDeliveryEnvelopeV1,
  'v' | 'alg' | 'envelopeId' | 'channelId' | 'senderAccountPublicKeyHex' |
  'recipientAccountPublicKeyHex' | 'keyVersion' | 'createdAt' | 'expiresAt'>) {
  const senderAccountPublicKeyHex = normalizeAccount(value.senderAccountPublicKeyHex);
  const recipientAccountPublicKeyHex = normalizeAccount(value.recipientAccountPublicKeyHex);
  if (!senderAccountPublicKeyHex || !recipientAccountPublicKeyHex) throw new Error('Encrypted delivery account is invalid.');
  if (!Number.isSafeInteger(value.keyVersion) || value.keyVersion < 1) throw new Error('Encrypted delivery key version is invalid.');
  return {
    v: 1 as const,
    alg: 'A256GCM' as const,
    envelopeId: required(value.envelopeId, 'Encrypted delivery identifier is invalid.'),
    channelId: required(value.channelId, 'Encrypted delivery channel is invalid.'),
    senderAccountPublicKeyHex,
    recipientAccountPublicKeyHex,
    keyVersion: value.keyVersion,
    createdAt: canonicalTimestamp(value.createdAt),
    expiresAt: canonicalTimestamp(value.expiresAt),
  };
}

function canonicalPayload(value: unknown): EncryptedDeliveryPayloadV1 {
  if (!isRecord(value) || value.v !== 1 || typeof value.kind !== 'string' || !value.kind.trim() || !('body' in value)) {
    throw new Error('Encrypted delivery payload is invalid.');
  }
  const candidate = {v: 1 as const, kind: value.kind.trim(), body: value.body as DeliveryJson};
  // Serialization rejects undefined, bigint, functions, cycles, and other
  // values that cannot be reproduced exactly across participant devices.
  stableSerialize(candidate);
  return JSON.parse(stableSerialize(candidate)) as EncryptedDeliveryPayloadV1;
}

function canonicalAck(value: EncryptedDeliveryAckV1): EncryptedDeliveryAckV1 {
  if (!isRecord(value) || value.v !== 1) throw new Error('Encrypted delivery acknowledgement is invalid.');
  const unsigned = canonicalAckUnsigned(value);
  return {...unsigned, signatureHex: canonicalSignatureHex(value.signatureHex)};
}

function canonicalAckUnsigned(value: Omit<EncryptedDeliveryAckV1, 'signatureHex'>) {
  const acknowledgingAccountPublicKeyHex = normalizeAccount(value.acknowledgingAccountPublicKeyHex);
  const intendedSenderAccountPublicKeyHex = normalizeAccount(value.intendedSenderAccountPublicKeyHex);
  if (!acknowledgingAccountPublicKeyHex || !intendedSenderAccountPublicKeyHex) {
    throw new Error('Encrypted delivery acknowledgement account is invalid.');
  }
  return {
    v: 1 as const,
    ackId: required(value.ackId, 'Encrypted delivery acknowledgement is invalid.'),
    envelopeId: required(value.envelopeId, 'Encrypted delivery acknowledgement is invalid.'),
    acknowledgingAccountPublicKeyHex,
    intendedSenderAccountPublicKeyHex,
    receivedAt: canonicalTimestamp(value.receivedAt),
  };
}

function canonicalPendingDelivery(value: unknown): PendingEncryptedDelivery {
  if (!isRecord(value)) throw new Error('Pending encrypted delivery is invalid.');
  const envelope = canonicalEnvelope(value.envelope as EncryptedDeliveryEnvelopeV1);
  if (!Number.isSafeInteger(value.attempts) || Number(value.attempts) < 0) throw new Error('Pending encrypted delivery is invalid.');
  return {
    envelope,
    queuedAt: canonicalTimestamp(value.queuedAt),
    attempts: Number(value.attempts),
    nextAttemptAt: canonicalTimestamp(value.nextAttemptAt),
    ...(value.lastAttemptAt ? {lastAttemptAt: canonicalTimestamp(value.lastAttemptAt)} : {}),
  };
}

function canonicalInboxReceipt(value: unknown): InboxReceipt {
  if (!isRecord(value)) throw new Error('Encrypted delivery receipt is invalid.');
  return {
    envelopeId: required(value.envelopeId as string, 'Encrypted delivery receipt is invalid.'),
    fingerprint: required(value.fingerprint as string, 'Encrypted delivery receipt is invalid.'),
    receivedAt: canonicalTimestamp(value.receivedAt as string),
    ack: canonicalAck(value.ack as EncryptedDeliveryAckV1),
  };
}

function envelopeAad(value: Pick<EncryptedDeliveryEnvelopeV1,
  'v' | 'alg' | 'envelopeId' | 'channelId' | 'senderAccountPublicKeyHex' |
  'recipientAccountPublicKeyHex' | 'keyVersion' | 'createdAt' | 'expiresAt'>): Uint8Array {
  return encoder.encode(stableSerialize([ENVELOPE_DOMAIN, canonicalEnvelopeMetadata(value)]));
}

function envelopeSigningBytes(value: Omit<EncryptedDeliveryEnvelopeV1, 'signatureHex'>): Uint8Array {
  return encoder.encode(stableSerialize([ENVELOPE_DOMAIN, value]));
}

function ackSigningBytes(value: Omit<EncryptedDeliveryAckV1, 'signatureHex'>): Uint8Array {
  return encoder.encode(stableSerialize([ACK_DOMAIN, value]));
}

function envelopeFingerprint(value: EncryptedDeliveryEnvelopeV1): string {
  return stableSerialize(canonicalEnvelope(value));
}

function retryBackoffMs(attempts: number, carrierAccepted: boolean): number {
  const base = carrierAccepted ? 5_000 : 1_000;
  return Math.min(MAX_BACKOFF_MS, base * (2 ** Math.min(attempts - 1, 8)));
}

async function importDeliveryKey(value: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', value, {name: 'AES-GCM'}, false, ['encrypt', 'decrypt']);
}

function assertDeliveryKey(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) throw new Error('A 32-byte delivery key is required.');
}

function assertSignature(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 64) throw new Error('Encrypted delivery signature is invalid.');
}

function canonicalSignatureHex(value: unknown): string {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{128}$/iu.test(value)) throw new Error('Encrypted delivery signature is invalid.');
  return value.toLowerCase();
}

function normalizeAccount(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function canonicalTimestamp(value: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error('Encrypted delivery timestamp is invalid.');
  return new Date(value).toISOString();
}

function required(value: string, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
}

function toBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url.');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  if (!/^[0-9a-f]+$/u.test(normalized) || normalized.length % 2 !== 0) throw new Error('Invalid hex.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function stableSerialize(value: unknown, seen = new Set<object>()): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('Cyclic delivery data is invalid.');
    seen.add(value);
    const serialized = `[${value.map(item => stableSerialize(item, seen)).join(',')}]`;
    seen.delete(value);
    return serialized;
  }
  if (isRecord(value)) {
    if (seen.has(value)) throw new Error('Cyclic delivery data is invalid.');
    seen.add(value);
    const serialized = `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key], seen)}`).join(',')}}`;
    seen.delete(value);
    return serialized;
  }
  throw new Error('Unsupported delivery data.');
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
