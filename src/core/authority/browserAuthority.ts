import {cryptoWaitReady, signatureVerify} from '@polkadot/util-crypto';
import {bytesToHex, hexToBytes} from '../canonical.ts';
import type {CanonicalVerifier} from '../moneyEventKernel.ts';
import type {
  AuthorityIdentity, AuthorityIdentityResolver, AuthorityJournalStore,
  CanonicalAuthorityEventEnvelopeV1, PersistedAuthorityGroupV1,
} from './productionAuthority.ts';

const JOURNALS = 'journals';
const KEYS = 'keys';
const DELIVERIES = 'authority-deliveries';
const LEGACY_ASSESSMENTS = 'legacy-assessments';
const JOURNAL_KEY_ID = 'journal-encryption-key';
export const AUTHORITY_STORAGE_RESET_STORES = [JOURNALS, DELIVERIES, LEGACY_ASSESSMENTS, KEYS] as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface EncryptedJournalV1 {
  v: 1;
  frontierHash: string;
  ivHex: string;
  ciphertextHex: string;
}

interface DeviceAuthorityKeyV1 {
  v: 1;
  participantId: string;
  publicKeyHex: string;
  privateKey: CryptoKey;
}

export interface PendingAuthorityDeliveryV1 {
  v: 1;
  deliveryId: string;
  groupId: string;
  eventId: string;
  session: {roomId: string; secret: string};
  envelope: CanonicalAuthorityEventEnvelopeV1;
  recipientIds: string[];
  acknowledgedRecipientIds: string[];
  queuedAt: string;
}

export interface PendingAuthorityInboxV1 {
  v: 1;
  inboxId: string;
  envelope: CanonicalAuthorityEventEnvelopeV1;
  session: {roomId: string; secret: string};
  status: 'pending' | 'applied' | 'rejected';
  receivedAt: string;
}

/**
 * Encrypted replay storage. The AES key and participant signing keys are
 * non-extractable CryptoKeys held by the browser origin and structured-cloned
 * by IndexedDB; raw private key material is never serialized by ChopDot.
 */
export class IndexedDbAuthorityJournalStore implements AuthorityJournalStore {
  constructor(private readonly dbName = 'chopdot-authority-v1') {}

  async listGroupIds(): Promise<string[]> {
    const values = await request(this.dbName, JOURNALS, 'readonly', store => store.getAllKeys());
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
  }

  async read(groupId: string): Promise<PersistedAuthorityGroupV1 | null> {
    const encrypted = await request(this.dbName, JOURNALS, 'readonly', store => store.get(required(groupId))) as EncryptedJournalV1 | undefined;
    if (!encrypted) return null;
    if (encrypted.v !== 1 || typeof encrypted.ivHex !== 'string' || typeof encrypted.ciphertextHex !== 'string') {
      throw new Error('Encrypted authority journal is invalid.');
    }
    const key = await this.encryptionKey();
    try {
      const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: hexToBytes(encrypted.ivHex)}, key, hexToBytes(encrypted.ciphertextHex));
      return JSON.parse(decoder.decode(plaintext)) as PersistedAuthorityGroupV1;
    } catch {
      throw new Error(`Authority journal ${groupId} could not be decrypted or authenticated.`);
    }
  }

  async compareAndSwap(groupId: string, expectedFrontierHash: string | null, value: PersistedAuthorityGroupV1): Promise<boolean> {
    if (value.groupId !== required(groupId)) throw new Error('Authority journal group does not match its storage key.');
    const key = await this.encryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, encoder.encode(JSON.stringify(value)));
    const encrypted: EncryptedJournalV1 = {v: 1, frontierHash: value.frontierHash, ivHex: bytesToHex(iv), ciphertextHex: bytesToHex(new Uint8Array(ciphertext))};
    return compareAndSwapRequest(this.dbName, groupId, expectedFrontierHash, encrypted);
  }

  async clear(): Promise<void> {
    for (const storeName of AUTHORITY_STORAGE_RESET_STORES) {
      await request(this.dbName, storeName, 'readwrite', store => store.clear());
    }
  }

  async enqueueAuthorityDelivery(input: Omit<PendingAuthorityDeliveryV1, 'v' | 'deliveryId' | 'acknowledgedRecipientIds' | 'queuedAt'> & {queuedAt?: string}): Promise<PendingAuthorityDeliveryV1 | null> {
    const recipients = [...new Set(input.recipientIds.map(required))].sort();
    if (recipients.length === 0) return null;
    const deliveryId = `outbox:${required(input.groupId)}:${required(input.eventId)}:${required(input.session.roomId)}`;
    const existing = await this.readEncryptedValue<PendingAuthorityDeliveryV1>(deliveryId);
    if (existing) return existing;
    const value: PendingAuthorityDeliveryV1 = {
      v: 1, deliveryId, groupId: input.groupId, eventId: input.eventId,
      session: structuredClone(input.session), envelope: structuredClone(input.envelope),
      recipientIds: recipients, acknowledgedRecipientIds: [], queuedAt: input.queuedAt ?? new Date().toISOString(),
    };
    await this.writeEncryptedValue(deliveryId, value);
    return value;
  }

  async listAuthorityDeliveries(): Promise<PendingAuthorityDeliveryV1[]> {
    const keys = await request(this.dbName, DELIVERIES, 'readonly', store => store.getAllKeys());
    const ids = Array.isArray(keys) ? keys.filter((value): value is string => typeof value === 'string' && value.startsWith('outbox:')) : [];
    return (await Promise.all(ids.sort().map(id => this.readEncryptedValue<PendingAuthorityDeliveryV1>(id))))
      .filter((value): value is PendingAuthorityDeliveryV1 => Boolean(value));
  }

  async acknowledgeAuthorityDelivery(eventId: string, participantId: string): Promise<boolean> {
    const matches = (await this.listAuthorityDeliveries()).filter(item => item.eventId === eventId);
    let changed = false;
    for (const item of matches) {
      if (!item.recipientIds.includes(participantId)) continue;
      const acknowledgements = [...new Set([...item.acknowledgedRecipientIds, participantId])].sort();
      if (acknowledgements.length === item.recipientIds.length) {
        await request(this.dbName, DELIVERIES, 'readwrite', store => store.delete(item.deliveryId));
      } else {
        await this.writeEncryptedValue(item.deliveryId, {...item, acknowledgedRecipientIds: acknowledgements});
      }
      changed = true;
    }
    return changed;
  }

  async rememberAuthorityInbox(envelope: CanonicalAuthorityEventEnvelopeV1, session: {roomId: string; secret: string}, receivedAt = new Date().toISOString()): Promise<PendingAuthorityInboxV1> {
    const inboxId = `inbox:${envelope.event.groupId}:${envelope.event.eventId}`;
    const existing = await this.readEncryptedValue<PendingAuthorityInboxV1>(inboxId);
    if (existing) {
      if (JSON.stringify(existing.envelope) !== JSON.stringify(envelope)) throw new Error('Authority inbox event identifier is already in use.');
      return existing;
    }
    const value: PendingAuthorityInboxV1 = {v: 1, inboxId, envelope: structuredClone(envelope), session: structuredClone(session), status: 'pending', receivedAt};
    await this.writeEncryptedValue(inboxId, value);
    return value;
  }

  async listPendingAuthorityInbox(): Promise<PendingAuthorityInboxV1[]> {
    const keys = await request(this.dbName, DELIVERIES, 'readonly', store => store.getAllKeys());
    const ids = Array.isArray(keys) ? keys.filter((value): value is string => typeof value === 'string' && value.startsWith('inbox:')) : [];
    const values = await Promise.all(ids.sort().map(id => this.readEncryptedValue<PendingAuthorityInboxV1>(id)));
    return values.filter((value): value is PendingAuthorityInboxV1 => Boolean(value && value.status === 'pending'));
  }

  async markAuthorityInboxTerminal(inboxId: string, status: 'applied' | 'rejected'): Promise<void> {
    const value = await this.readEncryptedValue<PendingAuthorityInboxV1>(inboxId);
    if (value?.status === 'pending') await this.writeEncryptedValue(inboxId, {...value, status});
  }

  async writeProtectedValue(reference: string, value: unknown): Promise<void> {
    await this.writeEncryptedValue(`protected:${required(reference)}`, value);
  }

  async readProtectedValue<T>(reference: string): Promise<T | null> {
    return this.readEncryptedValue<T>(`protected:${required(reference)}`);
  }

  async removeProtectedValue(reference: string): Promise<void> {
    await request(this.dbName, DELIVERIES, 'readwrite', store => store.delete(`protected:${required(reference)}`));
  }

  /** Encrypted assessment metadata is deliberately namespaced outside the
   * JOURNALS store and can never satisfy AuthorityJournalStore.read(). */
  async readLegacyAssessment(recordId: string): Promise<unknown | null> {
    const keyId = `legacy-assessment:${required(recordId)}`;
    const encrypted = await request(this.dbName, LEGACY_ASSESSMENTS, 'readonly', store => store.get(keyId)) as EncryptedJournalV1 | undefined;
    if (!encrypted) return null;
    return this.decryptBoundValue(encrypted, keyId, 'Legacy assessment storage is corrupt.');
  }

  async putLegacyAssessmentIfAbsent(recordId: string, value: unknown): Promise<'stored' | 'exists'> {
    const keyId = `legacy-assessment:${required(recordId)}`;
    const encrypted = await this.encryptBoundValue(value, keyId);
    try {
      await request(this.dbName, LEGACY_ASSESSMENTS, 'readwrite', store => store.add(encrypted, keyId));
      return 'stored';
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'ConstraintError') return 'exists';
      throw reason;
    }
  }

  async loadDeviceKey(participantId: string): Promise<DeviceAuthorityKeyV1 | null> {
    const value = await request(this.dbName, KEYS, 'readonly', store => store.get(deviceKeyId(participantId))) as DeviceAuthorityKeyV1 | undefined;
    if (!value) return null;
    if (!isDeviceKey(value, participantId)) throw new Error('Participant authority key is invalid.');
    return value;
  }

  async saveDeviceKey(value: DeviceAuthorityKeyV1): Promise<void> {
    if (!isDeviceKey(value, value.participantId)) throw new Error('Participant authority key is invalid.');
    await request(this.dbName, KEYS, 'readwrite', store => store.put(value, deviceKeyId(value.participantId)));
  }

  private async encryptionKey(): Promise<CryptoKey> {
    const existing = await request(this.dbName, KEYS, 'readonly', store => store.get(JOURNAL_KEY_ID));
    if (existing !== undefined) {
      if (!isAesKey(existing)) throw new Error('Participant authority encryption key is invalid.');
      return existing;
    }
    const created = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
    try {
      await request(this.dbName, KEYS, 'readwrite', store => store.add(created, JOURNAL_KEY_ID));
      return created;
    } catch (reason) {
      if (!(reason instanceof DOMException) || reason.name !== 'ConstraintError') throw reason;
    }

    const winner = await request(this.dbName, KEYS, 'readonly', store => store.get(JOURNAL_KEY_ID));
    if (winner === undefined) throw new Error('Participant authority encryption key creation did not produce a durable key.');
    if (!isAesKey(winner)) throw new Error('Participant authority encryption key is invalid.');
    return winner;
  }

  private async readEncryptedValue<T>(keyId: string): Promise<T | null> {
    const encrypted = await request(this.dbName, DELIVERIES, 'readonly', store => store.get(keyId)) as EncryptedJournalV1 | undefined;
    if (!encrypted) return null;
    const key = await this.encryptionKey();
    try {
      const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: hexToBytes(encrypted.ivHex)}, key, hexToBytes(encrypted.ciphertextHex));
      return JSON.parse(decoder.decode(plaintext)) as T;
    } catch {
      throw new Error('Encrypted authority delivery state is corrupt.');
    }
  }

  private async writeEncryptedValue(keyId: string, value: unknown): Promise<void> {
    const key = await this.encryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, encoder.encode(JSON.stringify(value)));
    const encrypted: EncryptedJournalV1 = {v: 1, frontierHash: '', ivHex: bytesToHex(iv), ciphertextHex: bytesToHex(new Uint8Array(ciphertext))};
    await request(this.dbName, DELIVERIES, 'readwrite', store => store.put(encrypted, keyId));
  }

  private async encryptBoundValue(value: unknown, keyId: string): Promise<EncryptedJournalV1> {
    const key = await this.encryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv, additionalData: encoder.encode(keyId)},
      key,
      encoder.encode(JSON.stringify(value)),
    );
    return {v: 1, frontierHash: '', ivHex: bytesToHex(iv), ciphertextHex: bytesToHex(new Uint8Array(ciphertext))};
  }

  private async decryptBoundValue<T>(encrypted: EncryptedJournalV1, keyId: string, safeError: string): Promise<T> {
    const key = await this.encryptionKey();
    try {
      const plaintext = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: hexToBytes(encrypted.ivHex), additionalData: encoder.encode(keyId)},
        key,
        hexToBytes(encrypted.ciphertextHex),
      );
      return JSON.parse(decoder.decode(plaintext)) as T;
    } catch {
      throw new Error(safeError);
    }
  }
}

async function compareAndSwapRequest(
  dbName: string,
  groupId: string,
  expectedFrontierHash: string | null,
  value: EncryptedJournalV1,
): Promise<boolean> {
  const database = await openDatabase(dbName);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(JOURNALS, 'readwrite');
    const store = transaction.objectStore(JOURNALS);
    const read = store.get(groupId);
    let matches = false;
    read.onerror = () => reject(read.error ?? new Error('Participant authority storage failed.'));
    read.onsuccess = () => {
      const current = read.result as Partial<EncryptedJournalV1> | undefined;
      const actual = current && typeof current.frontierHash === 'string' ? current.frontierHash : null;
      matches = actual === expectedFrontierHash;
      if (matches) store.put(value, groupId);
    };
    transaction.onerror = () => reject(transaction.error ?? new Error('Participant authority storage failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Participant authority storage failed.'));
    transaction.oncomplete = () => { database.close(); resolve(matches); };
  });
}

export type ExternalAuthorityIdentityResolver = (participantId: string) => Promise<AuthorityIdentity | null>;

/** Uses an approved Product Account signer when available; otherwise it owns a
 * participant-held, non-extractable device key for a still-unbound local user. */
export class BrowserAuthorityIdentityResolver implements AuthorityIdentityResolver {
  constructor(
    private readonly vault: IndexedDbAuthorityJournalStore,
    private readonly external?: ExternalAuthorityIdentityResolver,
  ) {}

  async resolve(participantId: string, expectedPublicKeyHex?: string): Promise<AuthorityIdentity> {
    const expected = expectedPublicKeyHex ? normalizeKey(expectedPublicKeyHex) : '';
    const external = await this.external?.(participantId);
    if (external && (!expected || normalizeKey(external.publicKeyHex) === expected)) return external;

    const stored = await this.vault.loadDeviceKey(participantId);
    if (stored && (!expected || normalizeKey(stored.publicKeyHex) === expected)) return identityFromDeviceKey(stored);
    if (expected) throw new Error('The participant-held signer for this accepted account is unavailable.');

    const pair = await crypto.subtle.generateKey({name: 'Ed25519'}, false, ['sign', 'verify']);
    const publicKeyHex = bytesToHex(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
    const created: DeviceAuthorityKeyV1 = {v: 1, participantId: required(participantId), publicKeyHex, privateKey: pair.privateKey};
    await this.vault.saveDeviceKey(created);
    return identityFromDeviceKey(created);
  }
}

export const verifyParticipantSignature: CanonicalVerifier = async (bytes, signature, publicKeyHex) => {
  await cryptoWaitReady();
  return signatureVerify(bytes, signature, publicKeyHex).isValid;
};

function identityFromDeviceKey(value: DeviceAuthorityKeyV1): AuthorityIdentity {
  return {
    participantId: value.participantId,
    publicKeyHex: value.publicKeyHex,
    signer: {sign: async bytes => new Uint8Array(await crypto.subtle.sign({name: 'Ed25519'}, value.privateKey, bytes))},
  };
}

function isDeviceKey(value: unknown, participantId: string): value is DeviceAuthorityKeyV1 {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<DeviceAuthorityKeyV1>;
  return row.v === 1
    && row.participantId === participantId
    && typeof row.publicKeyHex === 'string'
    && /^0x[0-9a-f]{64}$/iu.test(row.publicKeyHex)
    && typeof CryptoKey !== 'undefined'
    && row.privateKey instanceof CryptoKey
    && row.privateKey.type === 'private'
    && row.privateKey.extractable === false
    && row.privateKey.algorithm.name === 'Ed25519'
    && row.privateKey.usages.includes('sign');
}

function isAesKey(value: unknown): value is CryptoKey {
  return typeof CryptoKey !== 'undefined'
    && value instanceof CryptoKey
    && value.type === 'secret'
    && value.extractable === false
    && value.algorithm.name === 'AES-GCM'
    && 'length' in value.algorithm
    && value.algorithm.length === 256
    && value.usages.length === 2
    && value.usages.includes('encrypt')
    && value.usages.includes('decrypt');
}

function request(dbName: string, storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  if (typeof indexedDB === 'undefined') throw new Error('Durable participant authority storage is unavailable.');
  return openDatabase(dbName).then(database => new Promise((resolve, reject) => {
    let settled = false;
    let hasFirstError = false;
    let firstError: unknown;
    let transaction: IDBTransaction | undefined;
    let operationRequest: IDBRequest | undefined;
    const settle = (failed: boolean, error?: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      if (failed) reject(error);
      else resolve(operationRequest?.result);
    };
    const fail = (error: unknown) => {
      if (!hasFirstError) {
        hasFirstError = true;
        firstError = error;
      }
      settle(true, firstError);
    };
    try {
      transaction = database.transaction(storeName, mode);
      operationRequest = operation(transaction.objectStore(storeName));
    } catch (error) {
      try { transaction?.abort(); } catch { /* Preserve the original synchronous failure. */ }
      fail(error);
      return;
    }
    operationRequest.onerror = () => fail(operationRequest.error ?? new Error('Participant authority storage failed.'));
    transaction.onerror = () => fail(transaction.error ?? new Error('Participant authority storage failed.'));
    transaction.onabort = () => fail(transaction.error ?? new Error('Participant authority storage failed.'));
    transaction.oncomplete = () => settle(false);
  }));
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name, 3);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(JOURNALS)) open.result.createObjectStore(JOURNALS);
      if (!open.result.objectStoreNames.contains(KEYS)) open.result.createObjectStore(KEYS);
      if (!open.result.objectStoreNames.contains(DELIVERIES)) open.result.createObjectStore(DELIVERIES);
      if (!open.result.objectStoreNames.contains(LEGACY_ASSESSMENTS)) open.result.createObjectStore(LEGACY_ASSESSMENTS);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('Participant authority storage is unavailable.'));
  });
}

function deviceKeyId(participantId: string): string {
  return `participant:${required(participantId)}`;
}

function normalizeKey(value: string): string {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  if (!/^[0-9a-f]{64}$/u.test(normalized)) throw new Error('Participant authority public key is invalid.');
  return `0x${normalized}`;
}

function required(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error('Participant authority identifier is required.');
  return normalized;
}
