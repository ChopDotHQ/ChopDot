import {getPreimageManager, type PreimageManager} from '@parity/product-sdk-host';
import {canonicalJson, cloneJson, sha256Hex} from '../core/canonical.ts';
import type {AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import type {CheckpointArchive, RecoveryLocatorStore, RecoveryLocatorV1} from './groupRecovery.ts';
import type {EncryptedGroupCheckpointV1} from './encryptedGroupCheckpoint.ts';
import type {Bytes32, RecoveryHeadIndexPort} from './recoveryHeadIndex.ts';
import type {RecoveryLocatorReferenceResolver} from './recoveryLocatorHeadGuard.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
const ZERO_BYTES32 = `0x${'00'.repeat(32)}` as Bytes32;
const LOCATOR_DOMAIN = 'chopdot:bulletin-recovery-locator:v1';
const LOCATOR_SALT = encoder.encode('chopdot:bulletin-recovery-locator-key:v1');
const MAX_BLOB_BYTES = 2 * 1024 * 1024;

export interface BulletinBlobPort {
  submit(value: Uint8Array): Promise<Bytes32>;
  lookup(ref: Bytes32): Promise<Uint8Array | null>;
}

export async function createHostBulletinBlobPort(timeoutMs = 20_000): Promise<BulletinBlobPort> {
  const manager = await getPreimageManager();
  if (!manager) throw new Error('Encrypted recovery archive is unavailable in this host.');
  return new HostBulletinBlobPort(manager, timeoutMs);
}

export class HostBulletinBlobPort implements BulletinBlobPort {
  constructor(private readonly manager: Pick<PreimageManager, 'submit' | 'lookup'>, private readonly timeoutMs = 20_000) {}

  async submit(value: Uint8Array): Promise<Bytes32> {
    assertBlob(value);
    const ref = normalizeBytes32(await this.manager.submit(new Uint8Array(value)), 'Bulletin reference');
    const readback = await this.lookup(ref);
    if (!readback || !equalBytes(readback, value)) throw new Error('Encrypted recovery archive readback did not match.');
    return ref;
  }

  lookup(refValue: Bytes32): Promise<Uint8Array | null> {
    const ref = normalizeBytes32(refValue, 'Bulletin reference');
    return new Promise((resolve, reject) => {
      let settled = false;
      let subscription: ReturnType<PreimageManager['lookup']> | null = null;
      const finish = (value: Uint8Array | null, reason?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription?.unsubscribe();
        if (reason) reject(reason);
        else resolve(value ? new Uint8Array(value) : null);
      };
      const timeout = setTimeout(() => finish(null), this.timeoutMs);
      try {
        subscription = this.manager.lookup(ref, value => {
          if (value !== null) finish(value);
        });
        subscription.onInterrupt(() => finish(null, new Error('Encrypted recovery archive lookup was interrupted.')));
      } catch (reason) {
        finish(null, reason);
      }
    });
  }
}

/** Stores an already encrypted checkpoint as one content-addressed Bulletin blob. */
export class BulletinCheckpointArchive implements CheckpointArchive {
  constructor(private readonly blobs: BulletinBlobPort) {}

  async put(checkpoint: EncryptedGroupCheckpointV1): Promise<string> {
    const bytes = encoder.encode(canonicalJson(checkpoint));
    assertBlob(bytes);
    return `bulletin:${await this.blobs.submit(bytes)}`;
  }

  async get(refValue: string): Promise<EncryptedGroupCheckpointV1 | null> {
    const match = /^bulletin:(0x[0-9a-f]{64})$/iu.exec(refValue);
    if (!match) return null;
    const bytes = await this.blobs.lookup(normalizeBytes32(match[1], 'Bulletin checkpoint reference'));
    if (!bytes) return null;
    try {
      return cloneJson(JSON.parse(decoder.decode(bytes))) as EncryptedGroupCheckpointV1;
    } catch {
      return null;
    }
  }
}

interface EncryptedLocatorBlobV1 {
  v: 1;
  alg: 'A256GCM';
  contextHash: string;
  iv: string;
  ciphertext: string;
}

/**
 * Account-encrypts locator metadata before Bulletin storage. The contract head
 * stores the exact Bulletin reference, so a fresh device can discover the
 * current encrypted locator without a server or same-browser index.
 */
export class EncryptedBulletinRecoveryLocatorStore implements RecoveryLocatorStore, RecoveryLocatorReferenceResolver {
  private readonly referenceByLocatorDigest = new Map<string, Bytes32>();

  constructor(private readonly input: {
    productId: string;
    context: {groupId: string; participantId: string; accountPublicKeyHex: string};
    ownerAddress: string;
    stream: Bytes32;
    port: RecoveryHeadIndexPort;
    blobs: BulletinBlobPort;
    entropy: AccountEntropyProvider;
  }) {
    this.assertStaticContext();
  }

  async put(locatorValue: RecoveryLocatorV1): Promise<void> {
    const locator = this.canonicalLocator(locatorValue);
    const digest = await locatorDigest(locator);
    const current = await this.input.port.readHead(this.input.ownerAddress, this.input.stream);
    if (current.sequence > 0n && current.digest !== ZERO_BYTES32) {
      const currentLocator = await this.openReference(current.digest);
      if (currentLocator && canonicalJson(currentLocator) === canonicalJson(locator)) {
        this.referenceByLocatorDigest.set(digest, current.digest);
        return;
      }
      if (currentLocator && (
        currentLocator.checkpointVersion > locator.checkpointVersion
        || currentLocator.keyVersion > locator.keyVersion
      )) throw new Error('Recovery locator rollback rejected.');
    }
    const blob = await this.encrypt(locator);
    const ref = await this.input.blobs.submit(encoder.encode(canonicalJson(blob)));
    this.referenceByLocatorDigest.set(digest, ref);
  }

  async get(groupId: string, participantId: string, accountPublicKeyHex: string): Promise<RecoveryLocatorV1 | null> {
    this.assertRequestedContext(groupId, participantId, accountPublicKeyHex);
    const current = await this.input.port.readHead(this.input.ownerAddress, this.input.stream);
    if (current.sequence === 0n || current.digest === ZERO_BYTES32) return null;
    const locator = await this.openReference(current.digest);
    if (!locator) return null;
    this.referenceByLocatorDigest.set(await locatorDigest(locator), current.digest);
    return cloneJson(locator);
  }

  async referenceFor(locatorValue: RecoveryLocatorV1): Promise<Bytes32> {
    const locator = this.canonicalLocator(locatorValue);
    const digest = await locatorDigest(locator);
    const cached = this.referenceByLocatorDigest.get(digest);
    if (cached) return cached;
    const current = await this.input.port.readHead(this.input.ownerAddress, this.input.stream);
    if (current.sequence > 0n && current.digest !== ZERO_BYTES32) {
      const currentLocator = await this.openReference(current.digest);
      if (currentLocator && canonicalJson(currentLocator) === canonicalJson(locator)) {
        this.referenceByLocatorDigest.set(digest, current.digest);
        return current.digest;
      }
    }
    throw new Error('Recovery locator must be archived before its head can advance.');
  }

  private async encrypt(locator: RecoveryLocatorV1): Promise<EncryptedLocatorBlobV1> {
    const context = this.encryptionContext();
    const key = await this.encryptionKey(context);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv, additionalData: context},
      key,
      encoder.encode(canonicalJson(locator)),
    ));
    return {
      v: 1,
      alg: 'A256GCM',
      contextHash: await sha256Hex(context),
      iv: toBase64Url(iv),
      ciphertext: toBase64Url(ciphertext),
    };
  }

  private async openReference(ref: Bytes32): Promise<RecoveryLocatorV1 | null> {
    const bytes = await this.input.blobs.lookup(ref);
    if (!bytes) return null;
    try {
      const blob = JSON.parse(decoder.decode(bytes)) as Partial<EncryptedLocatorBlobV1>;
      if (
        blob.v !== 1
        || blob.alg !== 'A256GCM'
        || typeof blob.contextHash !== 'string'
        || typeof blob.iv !== 'string'
        || typeof blob.ciphertext !== 'string'
        || Object.keys(blob).sort().join(',') !== 'alg,ciphertext,contextHash,iv,v'
      ) throw new Error('Invalid encrypted locator.');
      const context = this.encryptionContext();
      if (blob.contextHash !== await sha256Hex(context)) throw new Error('Wrong recovery context.');
      const iv = fromBase64Url(blob.iv);
      const ciphertext = fromBase64Url(blob.ciphertext);
      if (iv.byteLength !== 12 || ciphertext.byteLength < 17 || ciphertext.byteLength > MAX_BLOB_BYTES) {
        throw new Error('Invalid encrypted locator.');
      }
      const plaintext = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv, additionalData: context},
        await this.encryptionKey(context),
        ciphertext,
      );
      return this.canonicalLocator(JSON.parse(decoder.decode(plaintext)) as RecoveryLocatorV1);
    } catch {
      throw new Error('Encrypted recovery locator could not be opened.');
    }
  }

  private async encryptionKey(context: Uint8Array): Promise<CryptoKey> {
    // The host entropy RFC accepts at most 32 context bytes. The complete
    // recovery context remains authenticated as AES-GCM AAD and HKDF info;
    // only its SHA-256 selector crosses the host boundary.
    const entropySelector = new Uint8Array(await crypto.subtle.digest('SHA-256', context));
    const entropy = await this.input.entropy.deriveAccountEntropy(entropySelector);
    if (!(entropy instanceof Uint8Array) || entropy.byteLength < 32) throw new Error('Account recovery is unavailable.');
    const source = await crypto.subtle.importKey('raw', entropy, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {name: 'HKDF', hash: 'SHA-256', salt: LOCATOR_SALT, info: context},
      source,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private encryptionContext(): Uint8Array {
    return encoder.encode(canonicalJson([
      LOCATOR_DOMAIN,
      this.input.productId.trim().toLowerCase(),
      this.input.port.genesisHash.toLowerCase(),
      this.input.context.groupId.trim(),
      this.input.context.participantId.trim(),
      this.input.context.accountPublicKeyHex.trim().toLowerCase(),
    ]));
  }

  private canonicalLocator(locator: RecoveryLocatorV1): RecoveryLocatorV1 {
    this.assertRequestedContext(locator.groupId, locator.participantId, locator.accountPublicKeyHex);
    return cloneJson(locator);
  }

  private assertStaticContext(): void {
    if (
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.dot$/u.test(this.input.productId.trim().toLowerCase())
      || !this.input.context.groupId.trim()
      || !this.input.context.participantId.trim()
      || !/^0x[0-9a-f]{64}$/iu.test(this.input.context.accountPublicKeyHex.trim())
      || !/^0x[0-9a-f]{40}$/iu.test(this.input.ownerAddress.trim())
      || !/^0x[0-9a-f]{64}$/iu.test(this.input.stream)
    ) throw new Error('Bulletin recovery context is invalid.');
  }

  private assertRequestedContext(groupId: string, participantId: string, accountPublicKeyHex: string): void {
    if (
      groupId.trim() !== this.input.context.groupId.trim()
      || participantId.trim() !== this.input.context.participantId.trim()
      || accountPublicKeyHex.trim().toLowerCase() !== this.input.context.accountPublicKeyHex.trim().toLowerCase()
    ) throw new Error('Recovery locator does not match this account and group.');
  }
}

async function locatorDigest(locator: RecoveryLocatorV1): Promise<string> {
  return sha256Hex(canonicalJson(locator));
}

function assertBlob(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > MAX_BLOB_BYTES) {
    throw new Error('Encrypted recovery archive blob has an invalid size.');
  }
}

function normalizeBytes32(value: unknown, label: string): Bytes32 {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{64}$/iu.test(value)) throw new Error(`${label} is invalid.`);
  return value.toLowerCase() as Bytes32;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function toBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url.');
  const base64 = value.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
