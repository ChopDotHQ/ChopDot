import {
  createAccountBoundGroupKeyEnvelope,
  openAccountBoundGroupKeyEnvelope,
  type AccountEntropyProvider,
  type GroupKeyEnvelopeMetadata,
  type GroupKeyEnvelopeV1,
} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  verifyProductAccountSignature,
  type AccountMessageSigner,
  type AccountMessageVerifier,
} from './groupKeyHandoff.ts';
import type {
  MembershipKeyEnvelopeBindingV1,
  MembershipKeyEnvelopeResolver,
} from './signedMembershipEvents.ts';

const encoder = new TextEncoder();
const REGISTRY_KEY = 'chopdot-membership-key-envelope-registry-v1';
const ACK_DOMAIN = 'chopdot:membership-key-envelope-ack:v1';

export interface MembershipKeyEnvelopeAcknowledgementV1 {
  v: 1;
  groupKeyEnvelopeId: string;
  productId: string;
  groupId: string;
  participantId: string;
  recipientAccountPublicKeyHex: string;
  keyVersion: number;
  envelopeDigest: string;
  acknowledgedAt: string;
  signatureHex: string;
}

export interface MembershipKeyEnvelopeRecordV1 {
  v: 1;
  binding: MembershipKeyEnvelopeBindingV1;
  envelope: GroupKeyEnvelopeV1;
  acknowledgement: MembershipKeyEnvelopeAcknowledgementV1;
}

/**
 * Participant-held registry for future-key rotations. A recipient first wraps
 * and re-opens the exact group key with account-derived entropy, then signs an
 * acknowledgement over the encrypted envelope digest. Organizers import those
 * records before signing a removal/role/rotation event. Reducers fail closed
 * when the exact durable record is missing or its recipient proof is invalid.
 */
export class DurableMembershipKeyEnvelopeRegistry implements MembershipKeyEnvelopeResolver {
  private readonly participantId: string;
  private readonly accountPublicKeyHex: string;

  constructor(private readonly options: {
    productId: string;
    participantId: string;
    accountPublicKeyHex: string;
    storage: KeyValueStorage;
    entropy: AccountEntropyProvider;
    verifier?: AccountMessageVerifier;
    storageKey?: string;
  }) {
    this.participantId = required(options.participantId);
    this.accountPublicKeyHex = normalizeAccount(options.accountPublicKeyHex);
    assertProductId(options.productId);
  }

  async stageRecipientBinding(input: {
    groupId: string;
    keyVersion: number;
    groupKey: Uint8Array;
    acknowledgedAt?: string;
    signer: AccountMessageSigner;
  }): Promise<MembershipKeyEnvelopeRecordV1> {
    const metadata = this.metadata({groupId: input.groupId, keyVersion: input.keyVersion});
    const envelope = await createAccountBoundGroupKeyEnvelope(metadata, input.groupKey, this.options.entropy);
    const groupKeyEnvelopeId = await membershipKeyEnvelopeId(envelope);
    const envelopeDigest = await membershipKeyEnvelopeDigest(envelope);
    const acknowledgedAt = canonicalTimestamp(input.acknowledgedAt ?? new Date().toISOString());
    const unsigned = canonicalAcknowledgementUnsigned({
      v: 1,
      groupKeyEnvelopeId,
      productId: metadata.productId,
      groupId: metadata.groupId,
      participantId: metadata.recipientId,
      recipientAccountPublicKeyHex: metadata.recipientAccountPublicKeyHex,
      keyVersion: metadata.keyVersion,
      envelopeDigest,
      acknowledgedAt,
    });
    const signature = await input.signer.signBytes(acknowledgementSigningBytes(unsigned));
    if (!(signature instanceof Uint8Array) || signature.byteLength !== 64) {
      throw new Error('Group access acknowledgement could not be signed.');
    }
    const record: MembershipKeyEnvelopeRecordV1 = {
      v: 1,
      binding: {
        participantId: metadata.recipientId,
        recipientAccountPublicKeyHex: metadata.recipientAccountPublicKeyHex,
        keyVersion: metadata.keyVersion,
        groupKeyEnvelopeId,
      },
      envelope,
      acknowledgement: {...unsigned, signatureHex: bytesToHex(signature)},
    };
    // A signature over ciphertext is not enough: the intended recipient must
    // prove that the persisted material really opens before acknowledging it.
    await this.assertLocallyDecryptable(record, input.groupKey);
    await this.persist(record);
    await this.assertLocallyDecryptable(this.requireRecord(groupKeyEnvelopeId), input.groupKey);
    return clone(record);
  }

  async importAcknowledged(recordValue: MembershipKeyEnvelopeRecordV1): Promise<void> {
    const record = await this.canonicalVerifiedRecord(recordValue);
    await this.persist(record);
  }

  export(groupKeyEnvelopeId: string): MembershipKeyEnvelopeRecordV1 | null {
    const record = this.records()[required(groupKeyEnvelopeId)];
    return record ? clone(record) : null;
  }

  async findAcknowledged(input: {
    groupId: string;
    participantId: string;
    recipientAccountPublicKeyHex: string;
    keyVersion: number;
  }): Promise<MembershipKeyEnvelopeRecordV1 | null> {
    const groupId = required(input.groupId);
    const participantId = required(input.participantId);
    const account = normalizeAccount(input.recipientAccountPublicKeyHex);
    const matches: MembershipKeyEnvelopeRecordV1[] = [];
    for (const value of Object.values(this.records())) {
      const record = await this.canonicalVerifiedRecord(value);
      if (record.envelope.groupId === groupId
        && record.binding.participantId === participantId
        && record.binding.recipientAccountPublicKeyHex === account
        && record.binding.keyVersion === input.keyVersion) matches.push(record);
    }
    if (matches.length > 1) throw new Error('Group access has conflicting acknowledged envelopes.');
    return matches[0] ? clone(matches[0]) : null;
  }

  async resolve(input: {
    groupId: string;
    keyVersion: number;
    binding: MembershipKeyEnvelopeBindingV1;
  }): Promise<boolean> {
    try {
      const binding = canonicalBinding(input.binding);
      if (binding.keyVersion !== input.keyVersion || binding.participantId.length === 0) return false;
      const record = this.requireRecord(binding.groupKeyEnvelopeId);
      await this.canonicalVerifiedRecord(record);
      if (
        stableSerialize(record.binding) !== stableSerialize(binding)
        || record.envelope.groupId !== required(input.groupId)
        || record.envelope.keyVersion !== input.keyVersion
      ) return false;
      if (
        binding.participantId === this.participantId
        && binding.recipientAccountPublicKeyHex === this.accountPublicKeyHex
      ) {
        const opened = await openAccountBoundGroupKeyEnvelope(record.envelope, this.metadata({
          groupId: input.groupId,
          keyVersion: input.keyVersion,
        }), this.options.entropy);
        try {
          if (opened.byteLength !== 32) return false;
        } finally {
          opened.fill(0);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async open(bindingValue: MembershipKeyEnvelopeBindingV1): Promise<Uint8Array> {
    const binding = canonicalBinding(bindingValue);
    if (
      binding.participantId !== this.participantId
      || binding.recipientAccountPublicKeyHex !== this.accountPublicKeyHex
    ) throw new Error('Group access does not belong to this account.');
    const record = await this.canonicalVerifiedRecord(this.requireRecord(binding.groupKeyEnvelopeId));
    return openAccountBoundGroupKeyEnvelope(record.envelope, this.metadata({
      groupId: record.envelope.groupId,
      keyVersion: binding.keyVersion,
    }), this.options.entropy);
  }

  private metadata(input: {groupId: string; keyVersion: number}): GroupKeyEnvelopeMetadata {
    return {
      productId: this.options.productId.trim().toLowerCase(),
      groupId: required(input.groupId),
      recipientId: this.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      keyVersion: input.keyVersion,
    };
  }

  private async assertLocallyDecryptable(record: MembershipKeyEnvelopeRecordV1, expectedKey: Uint8Array): Promise<void> {
    const opened = await openAccountBoundGroupKeyEnvelope(record.envelope, this.metadata({
      groupId: record.envelope.groupId,
      keyVersion: record.envelope.keyVersion,
    }), this.options.entropy);
    try {
      if (!equalBytes(opened, expectedKey)) throw new Error('Group access envelope did not preserve the intended key.');
    } finally {
      opened.fill(0);
    }
  }

  private async canonicalVerifiedRecord(value: MembershipKeyEnvelopeRecordV1): Promise<MembershipKeyEnvelopeRecordV1> {
    if (!value || value.v !== 1) throw new Error('Group access record is invalid.');
    const binding = canonicalBinding(value.binding);
    const acknowledgement = canonicalAcknowledgement(value.acknowledgement);
    const envelope = clone(value.envelope);
    const envelopeId = await membershipKeyEnvelopeId(envelope);
    const envelopeDigest = await membershipKeyEnvelopeDigest(envelope);
    if (
      binding.groupKeyEnvelopeId !== envelopeId
      || acknowledgement.groupKeyEnvelopeId !== envelopeId
      || acknowledgement.envelopeDigest !== envelopeDigest
      || acknowledgement.productId !== envelope.productId
      || acknowledgement.groupId !== envelope.groupId
      || acknowledgement.participantId !== envelope.recipientId
      || acknowledgement.recipientAccountPublicKeyHex !== envelope.recipientAccountPublicKeyHex
      || acknowledgement.keyVersion !== envelope.keyVersion
      || binding.participantId !== envelope.recipientId
      || binding.recipientAccountPublicKeyHex !== envelope.recipientAccountPublicKeyHex
      || binding.keyVersion !== envelope.keyVersion
    ) throw new Error('Group access record context is invalid.');
    const {signatureHex, ...unsigned} = acknowledgement;
    const verified = await (this.options.verifier ?? verifyProductAccountSignature)(
      acknowledgement.recipientAccountPublicKeyHex,
      acknowledgementSigningBytes(unsigned),
      hexToBytes(signatureHex),
    );
    if (!verified) throw new Error('Group access acknowledgement is invalid.');
    return {v: 1, binding, envelope, acknowledgement};
  }

  private async persist(recordValue: MembershipKeyEnvelopeRecordV1): Promise<void> {
    const record = await this.canonicalVerifiedRecord(recordValue);
    const records = this.records();
    const existing = records[record.binding.groupKeyEnvelopeId];
    if (existing && stableSerialize(existing) !== stableSerialize(record)) {
      throw new Error('Group access envelope identifier is already in use.');
    }
    this.options.storage.write(this.options.storageKey ?? REGISTRY_KEY, stableSerialize({...records, [record.binding.groupKeyEnvelopeId]: record}));
    const persisted = this.requireRecord(record.binding.groupKeyEnvelopeId);
    if (stableSerialize(persisted) !== stableSerialize(record)) throw new Error('Group access envelope could not be persisted.');
  }

  private requireRecord(groupKeyEnvelopeId: string): MembershipKeyEnvelopeRecordV1 {
    const record = this.records()[required(groupKeyEnvelopeId)];
    if (!record) throw new Error('Group access envelope is unavailable.');
    return record;
  }

  private records(): Record<string, MembershipKeyEnvelopeRecordV1> {
    const raw = this.options.storage.read(this.options.storageKey ?? REGISTRY_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) throw new Error('Invalid registry.');
      const records: Record<string, MembershipKeyEnvelopeRecordV1> = {};
      for (const [id, value] of Object.entries(parsed)) {
        if (!isRecord(value) || value.v !== 1 || !isRecord(value.binding) || !isRecord(value.envelope) || !isRecord(value.acknowledgement)) {
          throw new Error('Invalid registry record.');
        }
        records[id] = clone(value as unknown as MembershipKeyEnvelopeRecordV1);
      }
      return records;
    } catch {
      throw new Error('Group access envelope registry is corrupt.');
    }
  }
}

export async function membershipKeyEnvelopeId(envelope: GroupKeyEnvelopeV1): Promise<string> {
  return `sha256:${(await membershipKeyEnvelopeDigest(envelope)).slice(2)}`;
}

export async function membershipKeyEnvelopeDigest(envelope: GroupKeyEnvelopeV1): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(stableSerialize(envelope)));
  return bytesToHex(new Uint8Array(digest));
}

export async function membershipKeyEnvelopeRecordDigest(record: MembershipKeyEnvelopeRecordV1): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(stableSerialize(['chopdot:membership-key-envelope-record:v1', record])),
  );
  return bytesToHex(new Uint8Array(digest));
}

function canonicalBinding(value: MembershipKeyEnvelopeBindingV1): MembershipKeyEnvelopeBindingV1 {
  const participantId = required(value.participantId);
  const recipientAccountPublicKeyHex = normalizeAccount(value.recipientAccountPublicKeyHex);
  const groupKeyEnvelopeId = required(value.groupKeyEnvelopeId);
  if (!Number.isSafeInteger(value.keyVersion) || value.keyVersion < 1) throw new Error('Group access key version is invalid.');
  if (!/^sha256:[0-9a-f]{64}$/u.test(groupKeyEnvelopeId)) throw new Error('Group access envelope identifier is invalid.');
  return {participantId, recipientAccountPublicKeyHex, keyVersion: value.keyVersion, groupKeyEnvelopeId};
}

function canonicalAcknowledgement(value: MembershipKeyEnvelopeAcknowledgementV1): MembershipKeyEnvelopeAcknowledgementV1 {
  if (!value || value.v !== 1 || !/^0x[0-9a-f]{128}$/iu.test(value.signatureHex)) {
    throw new Error('Group access acknowledgement is invalid.');
  }
  return {
    ...canonicalAcknowledgementUnsigned(value),
    signatureHex: value.signatureHex.toLowerCase(),
  };
}

function canonicalAcknowledgementUnsigned(value: Omit<MembershipKeyEnvelopeAcknowledgementV1, 'signatureHex'>) {
  const productId = value.productId.trim().toLowerCase();
  assertProductId(productId);
  const groupKeyEnvelopeId = required(value.groupKeyEnvelopeId);
  const envelopeDigest = value.envelopeDigest.trim().toLowerCase();
  if (!/^sha256:[0-9a-f]{64}$/u.test(groupKeyEnvelopeId) || !/^0x[0-9a-f]{64}$/u.test(envelopeDigest)) {
    throw new Error('Group access acknowledgement digest is invalid.');
  }
  if (!Number.isSafeInteger(value.keyVersion) || value.keyVersion < 1) throw new Error('Group access acknowledgement version is invalid.');
  return {
    v: 1 as const,
    groupKeyEnvelopeId,
    productId,
    groupId: required(value.groupId),
    participantId: required(value.participantId),
    recipientAccountPublicKeyHex: normalizeAccount(value.recipientAccountPublicKeyHex),
    keyVersion: value.keyVersion,
    envelopeDigest,
    acknowledgedAt: canonicalTimestamp(value.acknowledgedAt),
  };
}

function acknowledgementSigningBytes(value: Omit<MembershipKeyEnvelopeAcknowledgementV1, 'signatureHex'>): Uint8Array {
  return encoder.encode(stableSerialize([ACK_DOMAIN, value]));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function required(value: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error('Required group access field is missing.');
  return normalized;
}

function normalizeAccount(value: string): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^0x[0-9a-f]{64}$/u.test(normalized)) throw new Error('Group access account is invalid.');
  return normalized;
}

function canonicalTimestamp(value: string): string {
  if (Number.isNaN(Date.parse(value))) throw new Error('Group access acknowledgement time is invalid.');
  return new Date(value).toISOString();
}

function assertProductId(value: string): void {
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.dot$/u.test(value.trim().toLowerCase())) {
    throw new Error('Group access product is invalid.');
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.replace(/^0x/u, '').toLowerCase();
  if (!/^[0-9a-f]{128}$/u.test(normalized)) throw new Error('Invalid acknowledgement signature.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
