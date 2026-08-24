import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  assertSignedMembershipEvent,
  membershipEventFingerprint,
  type SignedMembershipEventV1,
} from './signedMembershipEvents.ts';
import {
  verifyProductAccountSignature,
  type AccountMessageSigner,
  type AccountMessageVerifier,
} from './groupKeyHandoff.ts';
import {
  membershipKeyEnvelopeRecordDigest,
  type MembershipKeyEnvelopeRecordV1,
} from './membershipKeyEnvelopeRegistry.ts';

const OUTBOX_KEY = 'chopdot-membership-delivery-outbox-v1';

export type MembershipDeliveryTarget = {
  kind: 'chat_room';
  roomId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
};

export interface MembershipDeliveryAcknowledgementV1 {
  v: 1;
  deliveryId: string;
  eventId: string;
  eventDigest: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  receivedAt: string;
  signatureHex: string;
}

export interface MembershipDeliveryAcknowledgementV2 {
  v: 2;
  deliveryId: string;
  eventId: string;
  eventDigest: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  receivedAt: string;
  invitationId: string;
  groupId: string;
  keyVersion: number;
  groupKeyEnvelopeRecordDigest: string;
  /** Encrypted account-bound record. It never contains the plaintext group key. */
  groupKeyEnvelopeRecord: MembershipKeyEnvelopeRecordV1;
  signatureHex: string;
}

export type MembershipDeliveryAcknowledgement =
  | MembershipDeliveryAcknowledgementV1
  | MembershipDeliveryAcknowledgementV2;

export interface PendingMembershipDelivery {
  deliveryId: string;
  target: MembershipDeliveryTarget;
  event: SignedMembershipEventV1;
  queuedAt: string;
}

export class MembershipDeliveryOutbox {
  private readonly acknowledgementKey: string;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = OUTBOX_KEY,
  ) {
    this.acknowledgementKey = `${storageKey}:acks`;
  }

  enqueue(input: {
    target: MembershipDeliveryTarget;
    event: SignedMembershipEventV1;
    queuedAt?: string;
  }): PendingMembershipDelivery {
    assertSignedMembershipEvent(input.event);
    const target = canonicalTarget(input.target);
    const deliveryId = `${target.kind}:${target.roomId}:${input.event.eventId}`;
    if (this.hasAcknowledged(deliveryId)) throw new Error('Invitation delivery is already acknowledged.');
    const items = this.list();
    const existing = items.find(item => item.deliveryId === deliveryId);
    if (existing) {
      if (membershipEventFingerprint(existing.event) !== membershipEventFingerprint(input.event)) {
        throw new Error('Invitation delivery identifier already belongs to another action.');
      }
      return existing;
    }
    const pending: PendingMembershipDelivery = {
      deliveryId,
      target,
      event: input.event,
      queuedAt: input.queuedAt ?? new Date().toISOString(),
    };
    if (!isPendingMembershipDelivery(pending)) throw new Error('Invitation could not be queued.');
    items.push(pending);
    this.writeAll(items);
    const persisted = this.list().find(item => item.deliveryId === deliveryId);
    if (!persisted) throw new Error('Invitation could not be queued.');
    return persisted;
  }

  list(): PendingMembershipDelivery[] {
    const acknowledged = new Set(this.acknowledgements().map(value => value.deliveryId));
    return this.rawList().filter(item => !acknowledged.has(item.deliveryId));
  }

  acknowledgements(): MembershipDeliveryAcknowledgement[] {
    const stored = this.storage.read(this.acknowledgementKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Membership acknowledgements are not an array.');
      const firstByDelivery = new Map<string, MembershipDeliveryAcknowledgement>();
      for (const candidate of parsed) {
        assertMembershipDeliveryAcknowledgementShape(candidate);
        const acknowledgement = structuredClone(candidate);
        const existing = firstByDelivery.get(acknowledgement.deliveryId);
        if (existing && JSON.stringify(existing) !== JSON.stringify(acknowledgement)) {
          throw new Error('Membership acknowledgements contain a conflicting delivery identifier.');
        }
        if (!existing) firstByDelivery.set(acknowledgement.deliveryId, acknowledgement);
      }
      return [...firstByDelivery.values()];
    } catch {
      throw new Error('Membership delivery acknowledgements are corrupt.');
    }
  }

  hasAcknowledged(deliveryIdValue: string): boolean {
    const deliveryId = deliveryIdValue.trim();
    return Boolean(deliveryId && this.acknowledgements().some(value => value.deliveryId === deliveryId));
  }

  private rawList(): PendingMembershipDelivery[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Membership outbox is not an array.');
      const firstById = new Map<string, PendingMembershipDelivery>();
      for (const candidate of parsed) {
        if (!isPendingMembershipDelivery(candidate)) throw new Error('Membership outbox contains an invalid delivery.');
        const existing = firstById.get(candidate.deliveryId);
        if (existing && membershipEventFingerprint(existing.event) !== membershipEventFingerprint(candidate.event)) {
          throw new Error('Membership outbox contains a conflicting delivery identifier.');
        }
        if (!existing) firstById.set(candidate.deliveryId, candidate);
      }
      return Array.from(firstById.values());
    } catch {
      throw new Error('Membership delivery outbox is corrupt.');
    }
  }

  async flush(
    deliver: (item: PendingMembershipDelivery) => Promise<MembershipDeliveryAcknowledgement | null | undefined>,
    verifier: AccountMessageVerifier = verifyProductAccountSignature,
  ): Promise<{delivered: string[]; pending: string[]}> {
    const snapshot = this.list();
    const delivered = new Set<string>();
    for (const item of snapshot) {
      try {
        const acknowledgement = await deliver(item);
        if (acknowledgement && await verifyMembershipDeliveryAcknowledgement(item, acknowledgement, verifier)) {
          this.rememberAcknowledgement(acknowledgement);
          delivered.add(item.deliveryId);
        }
      } catch {
        // Retry truth remains in the outbox.
      }
    }
    const acknowledgedIds = new Set(this.acknowledgements().map(value => value.deliveryId));
    const retained = this.rawList().filter(item => !delivered.has(item.deliveryId) && !acknowledgedIds.has(item.deliveryId));
    this.writeAll(retained);
    const pending = this.list();
    return {
      delivered: Array.from(delivered),
      pending: pending.map(item => item.deliveryId),
    };
  }

  async acknowledge(
    acknowledgement: MembershipDeliveryAcknowledgement,
    verifier: AccountMessageVerifier = verifyProductAccountSignature,
  ): Promise<boolean> {
    const existing = this.acknowledgements().find(candidate => candidate.deliveryId === acknowledgement.deliveryId);
    if (existing) return JSON.stringify(existing) === JSON.stringify(acknowledgement);
    const item = this.rawList().find(candidate => candidate.deliveryId === acknowledgement.deliveryId);
    if (!item || !await verifyMembershipDeliveryAcknowledgement(item, acknowledgement, verifier)) return false;
    this.rememberAcknowledgement(acknowledgement);
    this.writeAll(this.rawList().filter(candidate => candidate.deliveryId !== item.deliveryId));
    return true;
  }

  clear(): void {
    this.storage.remove(this.storageKey);
    this.storage.remove(this.acknowledgementKey);
  }

  private writeAll(items: PendingMembershipDelivery[]): void {
    if (items.length === 0) {
      this.storage.remove(this.storageKey);
      if (this.storage.read(this.storageKey) !== null) throw new Error('Membership delivery cleanup could not be verified.');
      return;
    }
    const serialized = JSON.stringify(items);
    this.storage.write(this.storageKey, serialized);
    if (this.storage.read(this.storageKey) !== serialized) throw new Error('Membership delivery write could not be verified.');
  }

  private rememberAcknowledgement(value: MembershipDeliveryAcknowledgement): void {
    assertMembershipDeliveryAcknowledgementShape(value);
    const rows = this.acknowledgements();
    const existing = rows.find(candidate => candidate.deliveryId === value.deliveryId);
    if (existing) return;
    const serialized = JSON.stringify([...rows, structuredClone(value)]);
    this.storage.write(this.acknowledgementKey, serialized);
    if (this.storage.read(this.acknowledgementKey) !== serialized) {
      throw new Error('Membership delivery acknowledgement write could not be verified.');
    }
  }
}

function canonicalTarget(target: MembershipDeliveryTarget): MembershipDeliveryTarget {
  if (target.kind !== 'chat_room' || !target.roomId.trim()) throw new Error('Choose a conversation first.');
  const recipientId = target.recipientId.trim();
  const recipientAccountPublicKeyHex = target.recipientAccountPublicKeyHex.trim().toLowerCase();
  if (!recipientId || !/^0x[0-9a-f]{64}$/u.test(recipientAccountPublicKeyHex)) {
    throw new Error('Invitation recipient is invalid.');
  }
  return {kind: 'chat_room', roomId: target.roomId.trim(), recipientId, recipientAccountPublicKeyHex};
}

function isPendingMembershipDelivery(value: unknown): value is PendingMembershipDelivery {
  if (!isRecord(value) || !isRecord(value.target)) return false;
  try {
    const target = canonicalTarget(value.target as MembershipDeliveryTarget);
    assertSignedMembershipEvent(value.event);
    return typeof value.deliveryId === 'string'
      && value.deliveryId === `${target.kind}:${target.roomId}:${value.event.eventId}`
      && typeof value.queuedAt === 'string'
      && !Number.isNaN(Date.parse(value.queuedAt));
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface CreateMembershipDeliveryAcknowledgementInput {
  deliveryId: string;
  event: SignedMembershipEventV1;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  receivedAt?: string;
  signer: AccountMessageSigner;
}

export function createMembershipDeliveryAcknowledgement(
  input: CreateMembershipDeliveryAcknowledgementInput & {groupKeyEnvelopeRecord: MembershipKeyEnvelopeRecordV1},
): Promise<MembershipDeliveryAcknowledgementV2>;
export function createMembershipDeliveryAcknowledgement(
  input: CreateMembershipDeliveryAcknowledgementInput & {groupKeyEnvelopeRecord?: undefined},
): Promise<MembershipDeliveryAcknowledgementV1>;
export async function createMembershipDeliveryAcknowledgement(
  input: CreateMembershipDeliveryAcknowledgementInput & {groupKeyEnvelopeRecord?: MembershipKeyEnvelopeRecordV1},
): Promise<MembershipDeliveryAcknowledgement> {
  if (input.groupKeyEnvelopeRecord) {
    if (input.event.event.type !== 'MEMBERSHIP_GRANTED') {
      throw new Error('Only a membership grant can acknowledge durable group access.');
    }
    const handoff = input.event.event.handoff;
    const record = structuredClone(input.groupKeyEnvelopeRecord);
    const unsigned = await canonicalAcknowledgementUnsignedV2({
      v: 2,
      deliveryId: input.deliveryId,
      eventId: input.event.eventId,
      eventDigest: await eventDigest(input.event),
      recipientId: input.recipientId,
      recipientAccountPublicKeyHex: input.recipientAccountPublicKeyHex,
      receivedAt: input.receivedAt ?? new Date().toISOString(),
      invitationId: handoff.invitationId,
      groupId: handoff.groupId,
      keyVersion: handoff.keyVersion,
      groupKeyEnvelopeRecordDigest: await membershipKeyEnvelopeRecordDigest(record),
      groupKeyEnvelopeRecord: record,
    });
    if (!v2RecordMatchesGrant(unsigned, input.event)) {
      throw new Error('Acknowledged group access does not match this membership grant.');
    }
    const signature = await input.signer.signBytes(acknowledgementSigningBytes(unsigned));
    assertSignature(signature);
    return {...unsigned, signatureHex: bytesToHex(signature)};
  }
  const unsigned = canonicalAcknowledgementUnsignedV1({
    v: 1,
    deliveryId: input.deliveryId,
    eventId: input.event.eventId,
    eventDigest: await eventDigest(input.event),
    recipientId: input.recipientId,
    recipientAccountPublicKeyHex: input.recipientAccountPublicKeyHex,
    receivedAt: input.receivedAt ?? new Date().toISOString(),
  });
  const signature = await input.signer.signBytes(acknowledgementSigningBytes(unsigned));
  assertSignature(signature);
  return {...unsigned, signatureHex: bytesToHex(signature)};
}

export async function verifyMembershipDeliveryAcknowledgement(
  item: PendingMembershipDelivery,
  value: MembershipDeliveryAcknowledgement,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    assertMembershipDeliveryAcknowledgementShape(value);
    const {signatureHex: _signatureHex, ...withoutSignature} = value;
    const unsigned = value.v === 2
      ? await canonicalAcknowledgementUnsignedV2(withoutSignature as Omit<MembershipDeliveryAcknowledgementV2, 'signatureHex'>)
      : canonicalAcknowledgementUnsignedV1(withoutSignature as Omit<MembershipDeliveryAcknowledgementV1, 'signatureHex'>);
    if (
      unsigned.deliveryId !== item.deliveryId
      || unsigned.eventId !== item.event.eventId
      || unsigned.eventDigest !== await eventDigest(item.event)
      || unsigned.recipientId !== item.target.recipientId
      || unsigned.recipientAccountPublicKeyHex !== item.target.recipientAccountPublicKeyHex
    ) return false;
    if (unsigned.v === 2 && !v2RecordMatchesGrant(unsigned, item.event)) return false;
    return verifier(
      unsigned.recipientAccountPublicKeyHex,
      acknowledgementSigningBytes(unsigned),
      hexToBytes(value.signatureHex),
    );
  } catch {
    return false;
  }
}

function canonicalAcknowledgementUnsignedV1(
  value: Omit<MembershipDeliveryAcknowledgementV1, 'signatureHex'>,
): Omit<MembershipDeliveryAcknowledgementV1, 'signatureHex'> {
  assertExactKeys(value, ['v', 'deliveryId', 'eventId', 'eventDigest', 'recipientId', 'recipientAccountPublicKeyHex', 'receivedAt']);
  const deliveryId = value.deliveryId.trim();
  const eventId = value.eventId.trim();
  const eventDigestValue = value.eventDigest.trim().toLowerCase();
  const recipientId = value.recipientId.trim();
  const recipientAccountPublicKeyHex = value.recipientAccountPublicKeyHex.trim().toLowerCase();
  if (
    value.v !== 1 || !deliveryId || !eventId || !recipientId
    || !/^0x[0-9a-f]{64}$/u.test(eventDigestValue)
    || !/^0x[0-9a-f]{64}$/u.test(recipientAccountPublicKeyHex)
    || Number.isNaN(Date.parse(value.receivedAt))
  ) throw new Error('Membership delivery acknowledgement is invalid.');
  return {
    v: 1,
    deliveryId,
    eventId,
    eventDigest: eventDigestValue,
    recipientId,
    recipientAccountPublicKeyHex,
    receivedAt: new Date(value.receivedAt).toISOString(),
  };
}

async function canonicalAcknowledgementUnsignedV2(
  value: Omit<MembershipDeliveryAcknowledgementV2, 'signatureHex'>,
): Promise<Omit<MembershipDeliveryAcknowledgementV2, 'signatureHex'>> {
  assertExactKeys(value, [
    'v', 'deliveryId', 'eventId', 'eventDigest', 'recipientId', 'recipientAccountPublicKeyHex',
    'receivedAt', 'invitationId', 'groupId', 'keyVersion', 'groupKeyEnvelopeRecordDigest',
    'groupKeyEnvelopeRecord',
  ]);
  const common = canonicalAcknowledgementCommon(value);
  const invitationId = value.invitationId.trim();
  const groupId = value.groupId.trim();
  const digest = value.groupKeyEnvelopeRecordDigest.trim().toLowerCase();
  const record = structuredClone(value.groupKeyEnvelopeRecord);
  if (value.v !== 2 || !invitationId || !groupId || !Number.isSafeInteger(value.keyVersion) || value.keyVersion < 1
    || !/^0x[0-9a-f]{64}$/u.test(digest)
    || digest !== await membershipKeyEnvelopeRecordDigest(record)) {
    throw new Error('Membership delivery acknowledgement is invalid.');
  }
  return {
    v: 2,
    ...common,
    invitationId,
    groupId,
    keyVersion: value.keyVersion,
    groupKeyEnvelopeRecordDigest: digest,
    groupKeyEnvelopeRecord: record,
  };
}

function canonicalAcknowledgementCommon(value: {
  deliveryId: string;
  eventId: string;
  eventDigest: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  receivedAt: string;
}) {
  const deliveryId = value.deliveryId.trim();
  const eventId = value.eventId.trim();
  const eventDigestValue = value.eventDigest.trim().toLowerCase();
  const recipientId = value.recipientId.trim();
  const recipientAccountPublicKeyHex = value.recipientAccountPublicKeyHex.trim().toLowerCase();
  if (!deliveryId || !eventId || !recipientId
    || !/^0x[0-9a-f]{64}$/u.test(eventDigestValue)
    || !/^0x[0-9a-f]{64}$/u.test(recipientAccountPublicKeyHex)
    || Number.isNaN(Date.parse(value.receivedAt))) {
    throw new Error('Membership delivery acknowledgement is invalid.');
  }
  return {
    deliveryId,
    eventId,
    eventDigest: eventDigestValue,
    recipientId,
    recipientAccountPublicKeyHex,
    receivedAt: new Date(value.receivedAt).toISOString(),
  };
}

function v2RecordMatchesGrant(
  value: Omit<MembershipDeliveryAcknowledgementV2, 'signatureHex'>,
  event: SignedMembershipEventV1,
): boolean {
  if (event.event.type !== 'MEMBERSHIP_GRANTED') return false;
  const handoff = event.event.handoff;
  const record = value.groupKeyEnvelopeRecord;
  return value.invitationId === handoff.invitationId
    && value.groupId === handoff.groupId
    && value.keyVersion === handoff.keyVersion
    && value.recipientId === handoff.recipientId
    && value.recipientAccountPublicKeyHex === handoff.recipientAccountPublicKeyHex
    && record?.v === 1
    && record.binding?.participantId === handoff.recipientId
    && record.binding?.recipientAccountPublicKeyHex === handoff.recipientAccountPublicKeyHex
    && record.binding?.keyVersion === handoff.keyVersion
    && record.envelope?.groupId === handoff.groupId
    && record.envelope?.recipientId === handoff.recipientId
    && record.envelope?.recipientAccountPublicKeyHex === handoff.recipientAccountPublicKeyHex
    && record.envelope?.keyVersion === handoff.keyVersion
    && record.acknowledgement?.groupKeyEnvelopeId === record.binding.groupKeyEnvelopeId;
}

export function assertMembershipDeliveryAcknowledgementShape(
  value: unknown,
): asserts value is MembershipDeliveryAcknowledgement {
  if (!isRecord(value) || ![1, 2].includes(value.v) || !/^0x[0-9a-f]{128}$/iu.test(String(value.signatureHex))) {
    throw new Error('Membership delivery acknowledgement is invalid.');
  }
  if (value.v === 1) {
    assertExactKeys(value, ['v', 'deliveryId', 'eventId', 'eventDigest', 'recipientId', 'recipientAccountPublicKeyHex', 'receivedAt', 'signatureHex']);
    return;
  }
  assertExactKeys(value, [
    'v', 'deliveryId', 'eventId', 'eventDigest', 'recipientId', 'recipientAccountPublicKeyHex',
    'receivedAt', 'invitationId', 'groupId', 'keyVersion', 'groupKeyEnvelopeRecordDigest',
    'groupKeyEnvelopeRecord', 'signatureHex',
  ]);
}

async function eventDigest(event: SignedMembershipEventV1): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(membershipEventFingerprint(event)));
  return bytesToHex(new Uint8Array(digest));
}

function acknowledgementSigningBytes(
  value: Omit<MembershipDeliveryAcknowledgement, 'signatureHex'>,
): Uint8Array {
  return new TextEncoder().encode(JSON.stringify([`chopdot:membership-delivery-ack:v${value.v}`, value]));
}

function assertSignature(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 64) {
    throw new Error('Membership delivery acknowledgement could not be signed.');
  }
}

function assertExactKeys(value: unknown, keys: string[]): void {
  if (!isRecord(value)) throw new Error('Membership delivery acknowledgement is invalid.');
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error('Membership delivery acknowledgement is invalid.');
  }
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.replace(/^0x/u, '').toLowerCase();
  if (!/^[0-9a-f]{128}$/u.test(normalized)) throw new Error('Invalid acknowledgement signature.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}
