import type {SharedActionEnvelope} from './hostSessionSync.ts';
import {assertSharedActionEnvelope} from './hostSessionSync.ts';
import type {KeyValueStorage} from './livePayerSync.ts';

const ACCEPTED_EVENT_JOURNAL_KEY = 'chopdot-accepted-event-journal-v1';
const encoder = new TextEncoder();

export interface VerifiedEventProofMetadata {
  status: 'verified';
  source: 'statement-store' | 'product-account';
  signerHex: string;
  proof: {
    kind: 'statement-store-sr25519' | 'product-account-sr25519';
    bytesHex: string;
  };
  verifiedAt: string;
}

export interface AcceptedEventRecordV1 {
  v: 1;
  eventId: string;
  envelope: SharedActionEnvelope;
  verification: VerifiedEventProofMetadata;
  acceptedAt: string;
}

export interface AcceptedEventJournalRestore {
  records: AcceptedEventRecordV1[];
  rejectedRows: number;
}

export interface AcceptedEventFrontierV1 {
  v: 1;
  count: number;
  orderedEventIds: string[];
  recordHashes: string[];
  frontierHash: string;
}

/** Raised when an event ID is reused with different accepted content or signer. */
export class AcceptedEventConflictError extends Error {
  constructor(eventId: string) {
    super(`Accepted event ID conflicts with its first persisted content: ${eventId}`);
    this.name = 'AcceptedEventConflictError';
  }
}

/** Raised when storage does not retain a record the journal just wrote. */
export class AcceptedEventPersistenceError extends Error {
  constructor(eventId: string) {
    super(`Accepted event could not be persisted: ${eventId}`);
    this.name = 'AcceptedEventPersistenceError';
  }
}

/**
 * Append-only storage for shared events after their signer/proof has already
 * been verified by the caller. The journal records authority evidence; it does
 * not validate signatures itself and it never stores or derives a projection.
 *
 * There is deliberately no delete or compaction API. A later checkpoint slice
 * may introduce compaction only behind a separately verified frontier.
 */
export class AcceptedEventJournal {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = ACCEPTED_EVENT_JOURNAL_KEY,
  ) {}

  appendVerified(input: {
    envelope: SharedActionEnvelope;
    verification: VerifiedEventProofMetadata;
    acceptedAt?: string;
  }): AcceptedEventRecordV1 {
    const envelope = cloneJson(input.envelope);
    assertSharedActionEnvelope(envelope);
    const verification = normalizeVerification(input.verification);
    const acceptedAt = input.acceptedAt ?? new Date().toISOString();
    assertIsoDate(acceptedAt, 'Accepted event timestamp');

    const restored = this.restore();
    const existing = restored.records.find(record => record.eventId === envelope.eventId);
    if (existing) {
      if (sameAcceptedIdentity(existing, envelope, verification.signerHex)) return existing;
      throw new AcceptedEventConflictError(envelope.eventId);
    }

    const record: AcceptedEventRecordV1 = {
      v: 1,
      eventId: envelope.eventId,
      envelope,
      verification,
      acceptedAt,
    };
    const next = [...restored.records, record];
    this.storage.write(this.storageKey, JSON.stringify(next));

    const persisted = this.restore().records.find(candidate => candidate.eventId === record.eventId);
    if (!persisted || canonicalAcceptedRecord(persisted) !== canonicalAcceptedRecord(record)) {
      throw new AcceptedEventPersistenceError(record.eventId);
    }
    return persisted;
  }

  list(): AcceptedEventRecordV1[] {
    return this.restore().records;
  }

  restore(): AcceptedEventJournalRestore {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return {records: [], rejectedRows: 0};

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return {records: [], rejectedRows: 1};
    }
    if (!Array.isArray(parsed)) return {records: [], rejectedRows: 1};

    const records: AcceptedEventRecordV1[] = [];
    const firstByEventId = new Map<string, AcceptedEventRecordV1>();
    let rejectedRows = 0;
    for (const row of parsed) {
      let record: AcceptedEventRecordV1;
      try {
        record = normalizeAcceptedRecord(row);
      } catch {
        rejectedRows += 1;
        continue;
      }

      const existing = firstByEventId.get(record.eventId);
      if (existing) {
        if (canonicalAcceptedRecord(existing) !== canonicalAcceptedRecord(record)) rejectedRows += 1;
        continue;
      }
      firstByEventId.set(record.eventId, record);
      records.push(record);
    }
    return {records, rejectedRows};
  }

  async frontier(): Promise<AcceptedEventFrontierV1> {
    const entries = await Promise.all(this.list().map(async record => ({
      eventId: record.eventId,
      occurredAt: record.envelope.occurredAt,
      signerHex: record.verification.signerHex,
      recordHash: await sha256Hex(canonicalFrontierRecord(record)),
    })));
    entries.sort((left, right) =>
      left.occurredAt.localeCompare(right.occurredAt)
      || left.eventId.localeCompare(right.eventId)
      || left.signerHex.localeCompare(right.signerHex)
      || left.recordHash.localeCompare(right.recordHash),
    );
    const orderedEventIds = entries.map(entry => entry.eventId);
    const recordHashes = entries.map(entry => entry.recordHash);
    const frontierHash = await sha256Hex(stableSerialize({
      v: 1,
      records: entries.map(entry => ({eventId: entry.eventId, recordHash: entry.recordHash})),
    }));
    return {v: 1, count: entries.length, orderedEventIds, recordHashes, frontierHash};
  }
}

function normalizeAcceptedRecord(value: unknown): AcceptedEventRecordV1 {
  if (!isRecord(value) || value.v !== 1 || typeof value.eventId !== 'string' || !value.eventId) {
    throw new Error('Invalid accepted event record.');
  }
  const envelope = cloneJson(value.envelope);
  assertSharedActionEnvelope(envelope);
  if (value.eventId !== envelope.eventId) throw new Error('Accepted event ID mismatch.');
  const verification = normalizeVerification(value.verification);
  if (typeof value.acceptedAt !== 'string') throw new Error('Accepted event timestamp required.');
  assertIsoDate(value.acceptedAt, 'Accepted event timestamp');
  return {v: 1, eventId: envelope.eventId, envelope, verification, acceptedAt: value.acceptedAt};
}

function normalizeVerification(value: unknown): VerifiedEventProofMetadata {
  if (
    !isRecord(value)
    || value.status !== 'verified'
    || !['statement-store', 'product-account'].includes(String(value.source))
    || typeof value.signerHex !== 'string'
    || !isRecord(value.proof)
    || !['statement-store-sr25519', 'product-account-sr25519'].includes(String(value.proof.kind))
    || typeof value.proof.bytesHex !== 'string'
    || typeof value.verifiedAt !== 'string'
  ) throw new Error('Verified event proof metadata required.');

  const signerHex = normalizePublicKey(value.signerHex);
  if (!signerHex) throw new Error('Verified event signer must be a 32-byte public key.');
  const bytesHex = normalizeProofBytes(value.proof.bytesHex);
  if (!bytesHex) throw new Error('Verified event proof bytes required.');
  assertIsoDate(value.verifiedAt, 'Proof verification timestamp');
  return {
    status: 'verified',
    source: value.source as VerifiedEventProofMetadata['source'],
    signerHex,
    proof: {
      kind: value.proof.kind as VerifiedEventProofMetadata['proof']['kind'],
      bytesHex,
    },
    verifiedAt: value.verifiedAt,
  };
}

function sameAcceptedIdentity(
  existing: AcceptedEventRecordV1,
  envelope: SharedActionEnvelope,
  signerHex: string,
): boolean {
  return stableSerialize(existing.envelope) === stableSerialize(envelope)
    && existing.verification.signerHex === signerHex;
}

function canonicalAcceptedRecord(record: AcceptedEventRecordV1): string {
  return stableSerialize(record);
}

/** Local receipt time and transport proof bytes do not change event authority. */
function canonicalFrontierRecord(record: AcceptedEventRecordV1): string {
  return stableSerialize({envelope: record.envelope, signerHex: record.verification.signerHex});
}

function normalizePublicKey(value: string): string {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  return /^[0-9a-f]{64}$/u.test(normalized) ? `0x${normalized}` : '';
}

function normalizeProofBytes(value: string): string {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  return normalized.length > 0 && normalized.length % 2 === 0 && /^[0-9a-f]+$/u.test(normalized)
    ? `0x${normalized}`
    : '';
}

function assertIsoDate(value: string, label: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error(`${label} is invalid.`);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical event data must contain finite numbers.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => item === undefined ? 'null' : stableSerialize(item)).join(',')}]`;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(',')}}`;
  }
  throw new Error('Canonical event data must be JSON-compatible.');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return `0x${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
