import {
  createAccountBoundGroupKeyEnvelope,
  openAccountBoundGroupKeyEnvelope,
  type AccountEntropyProvider,
  type GroupKeyEnvelopeMetadata,
  type GroupKeyEnvelopeV1,
} from './accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from './livePayerSync.ts';
import type {ProtectedGroupKeySink} from '../membership/trustedContactInvitationCoordinator.ts';

const STORAGE_KEY = 'chopdot-account-bound-group-keys-v1';

interface StoredProtectedGroupKey {
  groupKeyEnvelopeId: string;
  envelope: GroupKeyEnvelopeV1;
}

/** Stores only account-entropy-wrapped group keys; plaintext never enters storage. */
export class AccountBoundProtectedGroupKeySink implements ProtectedGroupKeySink {
  constructor(private readonly options: {
    productId: string;
    storage: KeyValueStorage;
    entropy: AccountEntropyProvider;
  }) {}

  async save(input: Parameters<ProtectedGroupKeySink['save']>[0]): Promise<void> {
    const metadata = this.metadata(input);
    const record: StoredProtectedGroupKey = {
      groupKeyEnvelopeId: required(input.groupKeyEnvelopeId),
      envelope: await createAccountBoundGroupKeyEnvelope(metadata, input.groupKey, this.options.entropy),
    };
    const records = this.records();
    const id = recordId(metadata, record.groupKeyEnvelopeId);
    const existing = records[id];
    if (existing) {
      if (!await this.canOpen(existing, metadata)) throw new Error('Stored group access is invalid.');
      return;
    }
    const updated = {...records, [id]: record};
    this.options.storage.write(STORAGE_KEY, JSON.stringify(updated));
    const persisted = this.records()[id];
    if (!persisted || !await this.canOpen(persisted, metadata)) throw new Error('Group access could not be persisted.');
  }

  async has(input: Parameters<NonNullable<ProtectedGroupKeySink['has']>>[0]): Promise<boolean> {
    try {
      const metadata = this.metadata(input);
      const record = this.records()[recordId(metadata, required(input.groupKeyEnvelopeId))];
      return Boolean(record && await this.canOpen(record, metadata));
    } catch {
      return false;
    }
  }

  private metadata(input: {
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    keyVersion: number;
  }): GroupKeyEnvelopeMetadata {
    return {
      productId: this.options.productId,
      groupId: input.groupId,
      recipientId: input.participantId,
      recipientAccountPublicKeyHex: input.accountPublicKeyHex,
      keyVersion: input.keyVersion,
    };
  }

  private async canOpen(record: StoredProtectedGroupKey, metadata: GroupKeyEnvelopeMetadata): Promise<boolean> {
    try {
      const key = await openAccountBoundGroupKeyEnvelope(record.envelope, metadata, this.options.entropy);
      return key.byteLength === 32;
    } catch { return false; }
  }

  private records(): Record<string, StoredProtectedGroupKey> {
    const raw = this.options.storage.read(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) return {};
      const records: Record<string, StoredProtectedGroupKey> = {};
      for (const [id, value] of Object.entries(parsed)) {
        if (isStoredRecord(value)) records[id] = value;
      }
      return records;
    } catch { return {}; }
  }
}

function recordId(metadata: GroupKeyEnvelopeMetadata, envelopeId: string): string {
  return [metadata.groupId, metadata.recipientId, metadata.recipientAccountPublicKeyHex.toLowerCase(), metadata.keyVersion, envelopeId].join(':');
}

function isStoredRecord(value: unknown): value is StoredProtectedGroupKey {
  return isRecord(value) && typeof value.groupKeyEnvelopeId === 'string' && isRecord(value.envelope);
}

function required(value: string): string {
  const result = value.trim();
  if (!result) throw new Error('Group access identifier is required.');
  return result;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
