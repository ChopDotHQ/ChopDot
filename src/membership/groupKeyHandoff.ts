import {cryptoWaitReady, signatureVerify} from '@polkadot/util-crypto';

const encoder = new TextEncoder();

const ACCEPTANCE_DOMAIN = 'chopdot:membership-acceptance:v1';
const HANDOFF_DOMAIN = 'chopdot:group-key-handoff:v1';
const HKDF_SALT = encoder.encode('chopdot:group-key-handoff:hkdf:v1');

export interface AccountMessageSigner {
  signBytes(data: Uint8Array): Promise<Uint8Array>;
}

export type AccountMessageVerifier = (
  accountPublicKeyHex: string,
  data: Uint8Array,
  signature: Uint8Array,
) => Promise<boolean>;

export const verifyProductAccountSignature: AccountMessageVerifier = async (
  accountPublicKeyHex,
  data,
  signature,
) => {
  try {
    if (!(await cryptoWaitReady())) return false;
    const result = signatureVerify(data, signature, accountPublicKeyHex);
    return result.isValid && result.crypto === 'sr25519';
  } catch {
    return false;
  }
};

export interface MembershipAcceptanceV1 {
  v: 1;
  invitationId: string;
  groupId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  recipientEcdhPublicKey: string;
  nonce: string;
  expiresAt: string;
  signature: string;
}

export interface PendingMembershipAcceptance {
  acceptance: MembershipAcceptanceV1;
  /** Non-exportable and memory-only. Discard after opening one valid handoff. */
  recipientPrivateKey: CryptoKey;
}

export async function verifyMembershipAcceptance(
  acceptance: MembershipAcceptanceV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    assertAcceptance(acceptance);
    return verifier(
      acceptance.recipientAccountPublicKeyHex,
      acceptanceSigningBytes(unsignedAcceptance(acceptance)),
      hexToBytes(acceptance.signature),
    );
  } catch {
    return false;
  }
}

export async function verifyGroupKeyHandoff(
  handoff: GroupKeyHandoffV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    assertHandoff(handoff);
    return verifier(
      handoff.organizerAccountPublicKeyHex,
      handoffSigningBytes(unsignedHandoff(handoff)),
      hexToBytes(handoff.signature),
    );
  } catch {
    return false;
  }
}

export interface GroupKeyHandoffV1 {
  v: 1;
  groupKeyEnvelopeId: string;
  invitationId: string;
  groupId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  recipientEcdhPublicKey: string;
  organizerId: string;
  organizerAccountPublicKeyHex: string;
  organizerEcdhPublicKey: string;
  role: 'organizer' | 'member';
  keyVersion: number;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  iv: string;
  ciphertext: string;
  signature: string;
}

export async function createMembershipAcceptance(input: {
  invitationId: string;
  groupId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  nonce: string;
  expiresAt: string;
  signer: AccountMessageSigner;
}): Promise<PendingMembershipAcceptance> {
  const fields = canonicalAcceptanceFields(input);
  assertFutureExpiry(fields.expiresAt);
  const keys = await crypto.subtle.generateKey(
    {name: 'ECDH', namedCurve: 'P-256'},
    false,
    ['deriveBits'],
  );
  if (keys.privateKey.extractable) throw new Error('Protected invitation acceptance is unavailable.');
  const recipientEcdhPublicKey = bytesToBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
  const unsigned = {...fields, recipientEcdhPublicKey};
  const signature = await input.signer.signBytes(acceptanceSigningBytes(unsigned));
  assertSignature(signature);
  return {
    acceptance: {v: 1, ...unsigned, signature: bytesToHex(signature)},
    recipientPrivateKey: keys.privateKey,
  };
}

export async function createGroupKeyHandoff(input: {
  acceptance: MembershipAcceptanceV1;
  verifyRecipient: AccountMessageVerifier;
  groupKeyEnvelopeId: string;
  organizerId: string;
  organizerAccountPublicKeyHex: string;
  role: 'organizer' | 'member';
  keyVersion: number;
  groupKey: Uint8Array;
  createdAt: string;
  expiresAt: string;
  signer: AccountMessageSigner;
}): Promise<GroupKeyHandoffV1> {
  assertAcceptance(input.acceptance);
  assertFutureExpiry(input.acceptance.expiresAt, input.createdAt);
  if (input.groupKey.byteLength !== 32) throw new Error('A 32-byte group key is required.');
  if (!Number.isSafeInteger(input.keyVersion) || input.keyVersion < 1) throw new Error('Invalid group key version.');
  if (!['organizer', 'member'].includes(input.role)) throw new Error('Invalid membership role.');

  const acceptanceFields = unsignedAcceptance(input.acceptance);
  const accepted = await input.verifyRecipient(
    input.acceptance.recipientAccountPublicKeyHex,
    acceptanceSigningBytes(acceptanceFields),
    hexToBytes(input.acceptance.signature),
  );
  if (!accepted) throw new Error('Invitation acceptance could not be verified.');

  try {
    const keys = await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, false, ['deriveBits']);
    const organizerEcdhPublicKey = bytesToBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
    const recipientPublicKey = await importEcdhPublicKey(input.acceptance.recipientEcdhPublicKey);
    const handoffFields = canonicalHandoffFields({
      ...acceptanceFields,
      groupKeyEnvelopeId: input.groupKeyEnvelopeId,
      organizerId: input.organizerId,
      organizerAccountPublicKeyHex: input.organizerAccountPublicKeyHex,
      organizerEcdhPublicKey,
      role: input.role,
      keyVersion: input.keyVersion,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    });
    assertFutureExpiry(handoffFields.expiresAt, handoffFields.createdAt);
    const aad = handoffSigningBytes({...handoffFields, iv: '', ciphertext: ''});
    const wrappingKey = await deriveHandoffKey(keys.privateKey, recipientPublicKey, aad);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv, additionalData: aad},
      wrappingKey,
      new Uint8Array(input.groupKey),
    ));
    const unsigned = {
      ...handoffFields,
      iv: bytesToBase64Url(iv),
      ciphertext: bytesToBase64Url(ciphertext),
    };
    const signature = await input.signer.signBytes(handoffSigningBytes(unsigned));
    assertSignature(signature);
    return {v: 1, ...unsigned, signature: bytesToHex(signature)};
  } catch (reason) {
    if (reason instanceof Error && /Invalid|acceptance|expired|required/u.test(reason.message)) throw reason;
    throw new Error('Protected group access could not be delivered.');
  }
}

export async function openGroupKeyHandoff(input: {
  pending: PendingMembershipAcceptance;
  handoff: GroupKeyHandoffV1;
  expectedOrganizerAccountPublicKeyHex: string;
  verifyOrganizer: AccountMessageVerifier;
  now?: string;
}): Promise<Uint8Array> {
  assertAcceptance(input.pending.acceptance);
  assertHandoff(input.handoff);
  const acceptance = unsignedAcceptance(input.pending.acceptance);
  const handoff = input.handoff;
  if (
    handoff.invitationId !== acceptance.invitationId
    || handoff.groupId !== acceptance.groupId
    || handoff.recipientId !== acceptance.recipientId
    || handoff.recipientAccountPublicKeyHex !== acceptance.recipientAccountPublicKeyHex
    || handoff.recipientEcdhPublicKey !== acceptance.recipientEcdhPublicKey
    || handoff.nonce !== acceptance.nonce
    || handoff.organizerAccountPublicKeyHex !== normalizeAccountKey(input.expectedOrganizerAccountPublicKeyHex)
  ) throw new Error('Group access could not be restored.');
  assertFutureExpiry(handoff.expiresAt, input.now);
  const unsigned = unsignedHandoff(handoff);
  const verified = await input.verifyOrganizer(
    handoff.organizerAccountPublicKeyHex,
    handoffSigningBytes(unsigned),
    hexToBytes(handoff.signature),
  );
  if (!verified) throw new Error('Group access could not be restored.');

  try {
    const organizerPublicKey = await importEcdhPublicKey(handoff.organizerEcdhPublicKey);
    const aad = handoffSigningBytes({...unsigned, iv: '', ciphertext: ''});
    const wrappingKey = await deriveHandoffKey(input.pending.recipientPrivateKey, organizerPublicKey, aad);
    const plaintext = new Uint8Array(await crypto.subtle.decrypt(
      {name: 'AES-GCM', iv: base64UrlToBytes(handoff.iv), additionalData: aad},
      wrappingKey,
      base64UrlToBytes(handoff.ciphertext),
    ));
    if (plaintext.byteLength !== 32) throw new Error('Invalid group key.');
    return plaintext;
  } catch {
    throw new Error('Group access could not be restored.');
  }
}

function acceptanceSigningBytes(fields: ReturnType<typeof unsignedAcceptance>): Uint8Array {
  return encoder.encode(stableSerialize([ACCEPTANCE_DOMAIN, fields]));
}

function handoffSigningBytes(fields: ReturnType<typeof unsignedHandoff>): Uint8Array {
  return encoder.encode(stableSerialize([HANDOFF_DOMAIN, fields]));
}

function unsignedAcceptance(value: MembershipAcceptanceV1 | (Omit<MembershipAcceptanceV1, 'v' | 'signature'>)): Omit<MembershipAcceptanceV1, 'v' | 'signature'> {
  return canonicalAcceptanceFields(value as Omit<MembershipAcceptanceV1, 'v' | 'signature'> & {recipientEcdhPublicKey: string});
}

function canonicalAcceptanceFields(value: {
  invitationId: string;
  groupId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  recipientEcdhPublicKey?: string;
  nonce: string;
  expiresAt: string;
}): Omit<MembershipAcceptanceV1, 'v' | 'signature'> {
  const result = {
    invitationId: required(value.invitationId),
    groupId: required(value.groupId),
    recipientId: required(value.recipientId),
    recipientAccountPublicKeyHex: normalizeAccountKey(value.recipientAccountPublicKeyHex),
    recipientEcdhPublicKey: value.recipientEcdhPublicKey ? required(value.recipientEcdhPublicKey) : '',
    nonce: required(value.nonce),
    expiresAt: requiredTimestamp(value.expiresAt),
  };
  if (!result.recipientAccountPublicKeyHex) throw new Error('Invalid recipient account.');
  return result;
}

function canonicalHandoffFields(value: Omit<GroupKeyHandoffV1, 'v' | 'signature' | 'iv' | 'ciphertext'>): Omit<GroupKeyHandoffV1, 'v' | 'signature' | 'iv' | 'ciphertext'> {
  return {
    ...canonicalAcceptanceFields(value),
    groupKeyEnvelopeId: required(value.groupKeyEnvelopeId),
    organizerId: required(value.organizerId),
    organizerAccountPublicKeyHex: normalizeAccountKey(value.organizerAccountPublicKeyHex),
    organizerEcdhPublicKey: required(value.organizerEcdhPublicKey),
    role: value.role,
    keyVersion: value.keyVersion,
    createdAt: requiredTimestamp(value.createdAt),
  };
}

function unsignedHandoff(value: GroupKeyHandoffV1 | Omit<GroupKeyHandoffV1, 'v' | 'signature'>): Omit<GroupKeyHandoffV1, 'v' | 'signature'> {
  return {
    ...canonicalHandoffFields(value),
    iv: required(value.iv),
    ciphertext: required(value.ciphertext),
  };
}

function assertAcceptance(value: MembershipAcceptanceV1): void {
  if (value.v !== 1) throw new Error('Invalid invitation acceptance.');
  const unsigned = unsignedAcceptance(value);
  if (base64UrlToBytes(unsigned.recipientEcdhPublicKey).byteLength !== 65) throw new Error('Invalid invitation acceptance.');
  assertSignature(hexToBytes(value.signature));
}

function assertHandoff(value: GroupKeyHandoffV1): void {
  if (value.v !== 1) throw new Error('Invalid group key handoff.');
  const unsigned = unsignedHandoff(value);
  if (base64UrlToBytes(unsigned.organizerEcdhPublicKey).byteLength !== 65) throw new Error('Invalid group key handoff.');
  if (base64UrlToBytes(unsigned.iv).byteLength !== 12 || base64UrlToBytes(unsigned.ciphertext).byteLength !== 48) {
    throw new Error('Invalid group key handoff.');
  }
  assertSignature(hexToBytes(value.signature));
}

async function importEcdhPublicKey(encoded: string): Promise<CryptoKey> {
  const raw = base64UrlToBytes(encoded);
  if (raw.byteLength !== 65) throw new Error('Invalid ECDH public key.');
  return crypto.subtle.importKey('raw', raw, {name: 'ECDH', namedCurve: 'P-256'}, false, []);
}

async function deriveHandoffKey(privateKey: CryptoKey, publicKey: CryptoKey, info: Uint8Array): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits({name: 'ECDH', public: publicKey}, privateKey, 256);
  const source = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info},
    source,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
}

function assertFutureExpiry(expiresAt: string, now = new Date().toISOString()): void {
  if (Date.parse(expiresAt) <= Date.parse(now)) throw new Error('Invitation has expired.');
}

function required(value: string): string {
  const result = value.trim();
  if (!result) throw new Error('Required handoff field is missing.');
  return result;
}

function requiredTimestamp(value: string): string {
  const result = required(value);
  if (Number.isNaN(Date.parse(result))) throw new Error('Invalid handoff timestamp.');
  return result;
}

function normalizeAccountKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function assertSignature(value: Uint8Array): void {
  if (value.byteLength !== 64) throw new Error('Invalid Product Account signature.');
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  if (!/^[0-9a-f]+$/u.test(normalized) || normalized.length % 2 !== 0) throw new Error('Invalid signature.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], pair => Number.parseInt(pair, 16));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url.');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(',')}}`;
  }
  throw new Error('Unsupported signing value.');
}
