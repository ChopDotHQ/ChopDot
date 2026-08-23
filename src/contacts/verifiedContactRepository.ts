import type {HostLocalStorage} from '@parity/product-sdk-host';
import type {AccountMessageVerifier} from '../membership/groupKeyHandoff.ts';
import {
  verifyContactRecord,
  type VerifiedContactRecordV1,
} from './verifiedContact.ts';

const STORAGE_PREFIX = 'chopdot:verified-contacts:v1';

export interface AsyncJsonStorage {
  readJSON(key: string): Promise<unknown>;
  writeJSON(key: string, value: unknown): Promise<void>;
  clear(key: string): Promise<void>;
}

export class HostLocalStorageJsonStorage implements AsyncJsonStorage {
  constructor(private readonly storage: Pick<HostLocalStorage, 'readJSON' | 'writeJSON' | 'clear'>) {}

  readJSON(key: string): Promise<unknown> {
    return this.storage.readJSON(key);
  }

  writeJSON(key: string, value: unknown): Promise<void> {
    return this.storage.writeJSON(key, value);
  }

  clear(key: string): Promise<void> {
    return this.storage.clear(key);
  }
}

export class VerifiedContactRepository {
  constructor(
    private readonly storage: AsyncJsonStorage,
    private readonly verifier?: AccountMessageVerifier,
  ) {}

  async save(record: VerifiedContactRecordV1): Promise<void> {
    if (!await verifyContactRecord(record, this.verifier)) {
      throw new Error('Verified contact record is invalid.');
    }
    const current = await this.list(record.localAccountPublicKeyHex);
    const existing = current.find(candidate => candidate.recordId === record.recordId);
    if (existing) {
      if (stableSerialize(existing) !== stableSerialize(record)) {
        throw new Error('Verified contact identifier is already in use.');
      }
      return;
    }
    const remoteConflict = current.find(candidate =>
      candidate.remoteParticipantId === record.remoteParticipantId
      || candidate.remoteAccountPublicKeyHex === record.remoteAccountPublicKeyHex,
    );
    if (remoteConflict) throw new Error('This person is already bound to another verified contact.');
    const next = [...current, structuredClone(record)]
      .sort((left, right) => left.recordId.localeCompare(right.recordId));
    await this.storage.writeJSON(storageKey(record.localAccountPublicKeyHex), next);
    const persisted = await this.list(record.localAccountPublicKeyHex);
    if (!persisted.some(candidate => stableSerialize(candidate) === stableSerialize(record))) {
      throw new Error('Verified contact could not be stored safely.');
    }
  }

  async list(localAccountPublicKeyHex: string): Promise<VerifiedContactRecordV1[]> {
    const account = normalizeAccount(localAccountPublicKeyHex);
    if (!account) throw new Error('Current Product Account is invalid.');
    const stored = await this.storage.readJSON(storageKey(account));
    if (!Array.isArray(stored)) return [];
    const firstById = new Map<string, VerifiedContactRecordV1>();
    for (const candidate of stored) {
      const record = candidate as VerifiedContactRecordV1;
      if (record.localAccountPublicKeyHex !== account) continue;
      if (!await verifyContactRecord(record, this.verifier)) continue;
      if (!firstById.has(record.recordId)) firstById.set(record.recordId, structuredClone(record));
    }
    return [...firstById.values()].sort((left, right) => left.recordId.localeCompare(right.recordId));
  }

  async findByRemoteParticipant(
    localAccountPublicKeyHex: string,
    remoteParticipantId: string,
  ): Promise<VerifiedContactRecordV1 | null> {
    const id = remoteParticipantId.trim();
    if (!id) return null;
    return (await this.list(localAccountPublicKeyHex))
      .find(record => record.remoteParticipantId === id) ?? null;
  }

  async clear(localAccountPublicKeyHex: string): Promise<void> {
    const account = normalizeAccount(localAccountPublicKeyHex);
    if (!account) throw new Error('Current Product Account is invalid.');
    await this.storage.clear(storageKey(account));
  }
}

function storageKey(accountPublicKeyHex: string): string {
  const account = normalizeAccount(accountPublicKeyHex);
  if (!account) throw new Error('Current Product Account is invalid.');
  return `${STORAGE_PREFIX}:${account}`;
}

function normalizeAccount(value: string): string {
  const account = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^0x[0-9a-f]{64}$/u.test(account) ? account : '';
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

