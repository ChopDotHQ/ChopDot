const encoder = new TextEncoder();

const ENVELOPE_DOMAIN = 'chopdot:group-key-envelope:v1';
const HKDF_SALT = encoder.encode('chopdot:account-bound-key-wrap:v1');

export interface AccountEntropyProvider {
  deriveAccountEntropy(context: Uint8Array): Promise<Uint8Array>;
}

export interface GroupKeyEnvelopeMetadata {
  productId: string;
  groupId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  keyVersion: number;
}

export interface GroupKeyEnvelopeV1 extends GroupKeyEnvelopeMetadata {
  v: 1;
  alg: 'A256GCM';
  iv: string;
  ciphertext: string;
}

export async function createAccountBoundGroupKeyEnvelope(
  metadata: GroupKeyEnvelopeMetadata,
  groupKey: Uint8Array,
  provider: AccountEntropyProvider,
): Promise<GroupKeyEnvelopeV1> {
  assertMetadata(metadata);
  if (groupKey.byteLength !== 32) throw new Error('A 32-byte group key is required.');

  try {
    const context = envelopeContext(metadata);
    const entropy = await deriveRequiredEntropy(provider, context);
    const wrappingKey = await deriveWrappingKey(entropy, context);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv, additionalData: context},
      wrappingKey,
      new Uint8Array(groupKey),
    );

    return {
      v: 1,
      alg: 'A256GCM',
      ...canonicalMetadata(metadata),
      iv: bytesToBase64Url(iv),
      ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    };
  } catch {
    throw new Error('Group access could not be protected.');
  }
}

export async function openAccountBoundGroupKeyEnvelope(
  envelope: GroupKeyEnvelopeV1,
  expected: GroupKeyEnvelopeMetadata,
  provider: AccountEntropyProvider,
): Promise<Uint8Array> {
  assertEnvelope(envelope);
  assertMetadata(expected);
  const canonicalExpected = canonicalMetadata(expected);
  const canonicalEnvelope = canonicalMetadata(envelope);
  if (JSON.stringify(canonicalEnvelope) !== JSON.stringify(canonicalExpected)) {
    throw new Error('Group access could not be restored.');
  }

  try {
    const context = envelopeContext(canonicalEnvelope);
    const entropy = await deriveRequiredEntropy(provider, context);
    const wrappingKey = await deriveWrappingKey(entropy, context);
    const plaintext = await crypto.subtle.decrypt(
      {name: 'AES-GCM', iv: base64UrlToBytes(envelope.iv), additionalData: context},
      wrappingKey,
      base64UrlToBytes(envelope.ciphertext),
    );
    const groupKey = new Uint8Array(plaintext);
    if (groupKey.byteLength !== 32) throw new Error('Invalid group key length.');
    return groupKey;
  } catch {
    throw new Error('Group access could not be restored.');
  }
}

export function accountBoundGroupKeyContext(metadata: GroupKeyEnvelopeMetadata): Uint8Array {
  assertMetadata(metadata);
  return envelopeContext(metadata);
}

function canonicalMetadata(metadata: GroupKeyEnvelopeMetadata): GroupKeyEnvelopeMetadata {
  return {
    productId: metadata.productId.trim().toLowerCase(),
    groupId: metadata.groupId.trim(),
    recipientId: metadata.recipientId.trim(),
    recipientAccountPublicKeyHex: metadata.recipientAccountPublicKeyHex.trim().toLowerCase(),
    keyVersion: metadata.keyVersion,
  };
}

function envelopeContext(metadata: GroupKeyEnvelopeMetadata): Uint8Array {
  const value = canonicalMetadata(metadata);
  return encoder.encode(JSON.stringify([
    ENVELOPE_DOMAIN,
    value.productId,
    value.groupId,
    value.recipientId,
    value.recipientAccountPublicKeyHex,
    value.keyVersion,
  ]));
}

async function deriveRequiredEntropy(
  provider: AccountEntropyProvider,
  context: Uint8Array,
): Promise<Uint8Array> {
  const entropy = await provider.deriveAccountEntropy(new Uint8Array(context));
  if (!(entropy instanceof Uint8Array) || entropy.byteLength < 32) {
    throw new Error('Account recovery is unavailable.');
  }
  return new Uint8Array(entropy);
}

async function deriveWrappingKey(entropy: Uint8Array, context: Uint8Array): Promise<CryptoKey> {
  const source = await crypto.subtle.importKey('raw', entropy, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: context},
    source,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
}

function assertEnvelope(value: unknown): asserts value is GroupKeyEnvelopeV1 {
  if (!value || typeof value !== 'object') throw new Error('Invalid group access envelope.');
  const envelope = value as Partial<GroupKeyEnvelopeV1>;
  if (envelope.v !== 1 || envelope.alg !== 'A256GCM') throw new Error('Invalid group access envelope.');
  assertMetadata(envelope as GroupKeyEnvelopeMetadata);
  if (typeof envelope.iv !== 'string' || typeof envelope.ciphertext !== 'string') {
    throw new Error('Invalid group access envelope.');
  }
  if (base64UrlToBytes(envelope.iv).byteLength !== 12 || base64UrlToBytes(envelope.ciphertext).byteLength < 48) {
    throw new Error('Invalid group access envelope.');
  }
}

function assertMetadata(value: Partial<GroupKeyEnvelopeMetadata>): asserts value is GroupKeyEnvelopeMetadata {
  if (
    typeof value.productId !== 'string'
    || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.dot$/u.test(value.productId.trim().toLowerCase())
    || typeof value.groupId !== 'string'
    || !value.groupId.trim()
    || typeof value.recipientId !== 'string'
    || !value.recipientId.trim()
    || typeof value.recipientAccountPublicKeyHex !== 'string'
    || !/^0x[0-9a-f]{64}$/iu.test(value.recipientAccountPublicKeyHex.trim())
    || !Number.isSafeInteger(value.keyVersion)
    || value.keyVersion < 1
  ) {
    throw new Error('Invalid group access metadata.');
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url.');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
