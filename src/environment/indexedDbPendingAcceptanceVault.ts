import {assertSignedMembershipEvent} from '../membership/signedMembershipEvents.ts';
import type {
  PendingAcceptanceRecord,
  PendingAcceptanceVault,
} from '../membership/trustedContactInvitationCoordinator.ts';

const STORE = 'pending-acceptances';

/**
 * Device-local durable vault for the non-extractable ECDH private key created
 * during acceptance. IndexedDB structured clone retains CryptoKey without
 * serializing or exporting its key material.
 */
export class IndexedDbPendingAcceptanceVault implements PendingAcceptanceVault {
  constructor(private readonly dbName = 'chopdot-membership-v1') {}

  async load(invitationId: string): Promise<PendingAcceptanceRecord | null> {
    const value = await this.request('readonly', store => store.get(required(invitationId)));
    return isPendingRecord(value) ? value : null;
  }

  async save(invitationId: string, record: PendingAcceptanceRecord): Promise<void> {
    const id = required(invitationId);
    if (!isPendingRecord(record) || record.event.event.type !== 'INVITATION_ACCEPTED'
      || record.event.event.acceptance.invitationId !== id) {
      throw new Error('Pending invitation acceptance is invalid.');
    }
    await this.request('readwrite', store => store.put(record, id));
    if (!await this.load(id)) throw new Error('Pending invitation acceptance could not be persisted.');
  }

  async remove(invitationId: string): Promise<void> {
    await this.request('readwrite', store => store.delete(required(invitationId)));
  }

  private async request(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
    if (typeof indexedDB === 'undefined') throw new Error('Durable pending acceptance storage is unavailable.');
    const database = await openDatabase(this.dbName);
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE, mode);
        const request = operation(transaction.objectStore(STORE));
        request.onerror = () => reject(request.error ?? new Error('Pending acceptance storage failed.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Pending acceptance storage failed.'));
        transaction.onerror = () => reject(transaction.error ?? new Error('Pending acceptance storage failed.'));
        transaction.oncomplete = () => resolve(request.result);
      });
    } finally {
      database.close();
    }
  }
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Pending acceptance storage is unavailable.'));
  });
}

function isPendingRecord(value: unknown): value is PendingAcceptanceRecord {
  if (!isRecord(value) || typeof value.roomId !== 'string' || !value.roomId.trim() || !isRecord(value.pending)) return false;
  try { assertSignedMembershipEvent(value.event); } catch { return false; }
  const key = value.pending.recipientPrivateKey;
  const acceptance = value.pending.acceptance;
  return isRecord(acceptance)
    && typeof CryptoKey !== 'undefined'
    && key instanceof CryptoKey
    && key.type === 'private'
    && key.extractable === false
    && key.algorithm.name === 'ECDH'
    && key.usages.includes('deriveBits')
    && value.event.event.type === 'INVITATION_ACCEPTED'
    && value.event.event.acceptance.invitationId === acceptance.invitationId;
}

function required(value: string): string {
  const result = value.trim();
  if (!result) throw new Error('Invitation identifier is required.');
  return result;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
