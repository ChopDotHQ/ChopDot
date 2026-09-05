import type {GroupKeyEnvelopeV1} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  verifyProductAccountSignature,
  type AccountMessageSigner,
  type AccountMessageVerifier,
} from '../membership/groupKeyHandoff.ts';
import type {RecoveryLocatorV1} from './groupRecovery.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
const KIT_DOMAIN = 'chopdot:optional-recovery-kit:v1';
const REGRANT_DOMAIN = 'chopdot:social-regrant-request:v1';
const PBKDF2_ITERATIONS = 210_000;

export interface RecoveryKitEntryV1 {
  productId: string;
  groupId: string;
  participantId: string;
  accountPublicKeyHex: string;
  keyVersion: number;
  keyEnvelope: GroupKeyEnvelopeV1;
  locator: RecoveryLocatorV1;
}

export interface RecoveryKitPayloadV1 {
  v: 1;
  ownerAccountPublicKeyHex: string;
  createdAt: string;
  entries: RecoveryKitEntryV1[];
}

export interface EncryptedRecoveryKitV1 {
  v: 1;
  alg: 'PBKDF2-SHA256+A256GCM';
  iterations: number;
  accountHintHash: string;
  createdAt: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

/**
 * Optional export containing account-bound key envelopes and signed locators,
 * never raw group keys, seed phrases, or membership authority.
 */
export async function createEncryptedRecoveryKit(input: {
  payload: RecoveryKitPayloadV1;
  passphrase: string;
}): Promise<EncryptedRecoveryKitV1> {
  const payload = canonicalRecoveryPayload(input.payload);
  const passphrase = recoveryPassphrase(input.passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const metadata = {
    v: 1 as const,
    alg: 'PBKDF2-SHA256+A256GCM' as const,
    iterations: PBKDF2_ITERATIONS,
    accountHintHash: await accountHintHash(payload.ownerAccountPublicKeyHex),
    createdAt: payload.createdAt,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
  };
  const key = await deriveKitKey(passphrase, salt, PBKDF2_ITERATIONS);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    {name: 'AES-GCM', iv, additionalData: kitAad(metadata)},
    key,
    encoder.encode(stableSerialize(payload)),
  ));
  return {...metadata, ciphertext: toBase64Url(ciphertext)};
}

export async function openEncryptedRecoveryKit(input: {
  kit: EncryptedRecoveryKitV1;
  passphrase: string;
  expectedAccountPublicKeyHex: string;
}): Promise<RecoveryKitPayloadV1> {
  const kit = canonicalKit(input.kit);
  const account = normalizeAccount(input.expectedAccountPublicKeyHex);
  if (!account || await accountHintHash(account) !== kit.accountHintHash) {
    throw new Error('Recovery kit does not belong to this account.');
  }
  try {
    const salt = fromBase64Url(kit.salt);
    const iv = fromBase64Url(kit.iv);
    const key = await deriveKitKey(recoveryPassphrase(input.passphrase), salt, kit.iterations);
    const {ciphertext, ...metadata} = kit;
    const plaintext = await crypto.subtle.decrypt(
      {name: 'AES-GCM', iv, additionalData: kitAad(metadata)},
      key,
      fromBase64Url(ciphertext),
    );
    const payload = canonicalRecoveryPayload(JSON.parse(decoder.decode(plaintext)));
    if (payload.ownerAccountPublicKeyHex !== account) throw new Error('Wrong account.');
    return payload;
  } catch {
    throw new Error('Recovery kit could not be opened.');
  }
}

export interface SocialRegrantRequestV1 {
  v: 1;
  requestId: string;
  groupId: string;
  participantId: string;
  priorAccountPublicKeyHex: string;
  requestedAccountPublicKeyHex: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  signatureHex: string;
}

export async function createSocialRegrantRequest(input: {
  requestId?: string;
  groupId: string;
  participantId: string;
  priorAccountPublicKeyHex: string;
  requestedAccountPublicKeyHex: string;
  nonce: string;
  createdAt?: string;
  expiresAt: string;
  signer: AccountMessageSigner;
}): Promise<SocialRegrantRequestV1> {
  const unsigned = canonicalSocialRegrantUnsigned({
    v: 1,
    requestId: input.requestId ?? crypto.randomUUID(),
    groupId: input.groupId,
    participantId: input.participantId,
    priorAccountPublicKeyHex: input.priorAccountPublicKeyHex,
    requestedAccountPublicKeyHex: input.requestedAccountPublicKeyHex,
    nonce: input.nonce,
    createdAt: input.createdAt ?? new Date().toISOString(),
    expiresAt: input.expiresAt,
  });
  if (unsigned.priorAccountPublicKeyHex === unsigned.requestedAccountPublicKeyHex) {
    throw new Error('Social re-grant requires a different account.');
  }
  if (Date.parse(unsigned.expiresAt) <= Date.parse(unsigned.createdAt)) {
    throw new Error('Social re-grant request expiry is invalid.');
  }
  const signature = await input.signer.signBytes(socialRegrantSigningBytes(unsigned));
  if (!(signature instanceof Uint8Array) || signature.byteLength !== 64) {
    throw new Error('Social re-grant request signature is invalid.');
  }
  return {...unsigned, signatureHex: bytesToHex(signature)};
}

export async function verifySocialRegrantRequest(
  value: SocialRegrantRequestV1,
  now = new Date().toISOString(),
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    const request = canonicalSocialRegrant(value);
    if (
      request.priorAccountPublicKeyHex === request.requestedAccountPublicKeyHex
      || Date.parse(now) < Date.parse(request.createdAt)
      || Date.parse(now) >= Date.parse(request.expiresAt)
    ) return false;
    const {signatureHex, ...unsigned} = request;
    return verifier(
      request.requestedAccountPublicKeyHex,
      socialRegrantSigningBytes(unsigned),
      hexToBytes(signatureHex),
    );
  } catch {
    return false;
  }
}

export const SOCIAL_REGRANT_MEMBERSHIP_STEPS = Object.freeze([
  'organizer_verifies_request_and_person',
  'organizer_removes_prior_membership_and_rotates_future_key',
  'organizer_invites_requested_account',
  'requested_account_accepts',
  'organizer_grants_new_account_bound_key',
] as const);

export function socialRegrantBoundary(value: SocialRegrantRequestV1) {
  const request = canonicalSocialRegrant(value);
  return Object.freeze({
    requestId: request.requestId,
    authority: 'none' as const,
    preservesPriorSignatures: true as const,
    steps: SOCIAL_REGRANT_MEMBERSHIP_STEPS,
  });
}

export type SocialRegrantStepV1 = typeof SOCIAL_REGRANT_MEMBERSHIP_STEPS[number];

export interface SocialRegrantWorkflowAuthority {
  /** Atomic across every organizer device for this group. */
  begin(request: SocialRegrantRequestV1): Promise<'started' | 'resume' | 'completed_replay'>;
  completedSteps(request: SocialRegrantRequestV1): Promise<SocialRegrantStepV1[]>;
  checkpoint(request: SocialRegrantRequestV1, step: SocialRegrantStepV1): Promise<void>;
}

export interface SocialRegrantMembershipActions {
  verifyPerson(request: SocialRegrantRequestV1): Promise<boolean>;
  removePriorMembershipAndRotate(request: SocialRegrantRequestV1): Promise<void>;
  inviteRequestedAccount(request: SocialRegrantRequestV1): Promise<void>;
  awaitRequestedAccountAcceptance(request: SocialRegrantRequestV1): Promise<void>;
  grantNewAccountBoundKey(request: SocialRegrantRequestV1): Promise<void>;
}

/**
 * Exact five-step lost-account workflow. The authority edge must be shared and
 * atomic across organizer devices; a device-local nonce ledger is deliberately
 * not accepted here. Each completed step is checkpointed before the next one,
 * so a retry resumes rather than repeating removal, invitation, or grant.
 */
export class SocialRegrantWorkflow {
  constructor(private readonly options: {
    authority: SocialRegrantWorkflowAuthority;
    actions: SocialRegrantMembershipActions;
    verifier?: AccountMessageVerifier;
  }) {
    if (!options.authority || !options.actions) throw new Error('Shared social re-grant authority is unavailable.');
  }

  async execute(input: {
    request: SocialRegrantRequestV1;
    now?: string;
  }): Promise<'completed' | 'completed_replay' | 'rejected'> {
    const now = canonicalTimestamp(input.now ?? new Date().toISOString());
    if (!await verifySocialRegrantRequest(input.request, now, this.options.verifier)) return 'rejected';
    const request = canonicalSocialRegrant(input.request);
    const begun = await this.options.authority.begin(request);
    if (begun === 'completed_replay') return 'completed_replay';
    const completed = new Set(await this.options.authority.completedSteps(request));
    const run = async (step: SocialRegrantStepV1, action: () => Promise<void>) => {
      if (completed.has(step)) return;
      await action();
      await this.options.authority.checkpoint(request, step);
      completed.add(step);
    };
    await run('organizer_verifies_request_and_person', async () => {
      if (!await this.options.actions.verifyPerson(request)) throw new Error('Social re-grant person verification was not completed.');
    });
    await run('organizer_removes_prior_membership_and_rotates_future_key', () => (
      this.options.actions.removePriorMembershipAndRotate(request)
    ));
    await run('organizer_invites_requested_account', () => this.options.actions.inviteRequestedAccount(request));
    await run('requested_account_accepts', () => this.options.actions.awaitRequestedAccountAcceptance(request));
    await run('organizer_grants_new_account_bound_key', () => this.options.actions.grantNewAccountBoundKey(request));
    return 'completed';
  }
}

interface ConsumedSocialRegrantNonceV1 {
  v: 1;
  requestId: string;
  groupId: string;
  participantId: string;
  requestedAccountPublicKeyHex: string;
  nonce: string;
  consumedAt: string;
}

/**
 * Device-local replay aid only. It is not a SocialRegrantWorkflowAuthority and
 * cannot authorize or coordinate the five-step membership workflow.
 */
export class SocialRegrantNonceLedger {
  private readonly key: string;

  constructor(private readonly storage: KeyValueStorage, namespace = 'chopdot-social-regrant-nonces-v1') {
    this.key = required(namespace);
  }

  async consume(input: {
    request: SocialRegrantRequestV1;
    now?: string;
    verifier?: AccountMessageVerifier;
  }): Promise<'consumed' | 'replay' | 'rejected'> {
    const now = canonicalTimestamp(input.now ?? new Date().toISOString());
    if (!await verifySocialRegrantRequest(input.request, now, input.verifier)) return 'rejected';
    const request = canonicalSocialRegrant(input.request);
    const rows = this.list();
    if (rows.some(row => socialNonceKey(row) === socialNonceKey(request))) return 'replay';
    const row: ConsumedSocialRegrantNonceV1 = {
      v: 1,
      requestId: request.requestId,
      groupId: request.groupId,
      participantId: request.participantId,
      requestedAccountPublicKeyHex: request.requestedAccountPublicKeyHex,
      nonce: request.nonce,
      consumedAt: now,
    };
    this.storage.write(this.key, stableSerialize([...rows, row]));
    if (!this.list().some(candidate => socialNonceKey(candidate) === socialNonceKey(row))) {
      throw new Error('Social re-grant nonce could not be persisted.');
    }
    return 'consumed';
  }

  isConsumed(request: SocialRegrantRequestV1): boolean {
    const canonical = canonicalSocialRegrant(request);
    return this.list().some(row => socialNonceKey(row) === socialNonceKey(canonical));
  }

  private list(): ConsumedSocialRegrantNonceV1[] {
    const raw = this.storage.read(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Invalid nonce ledger.');
      return parsed.map(canonicalConsumedNonce);
    } catch {
      throw new Error('Social re-grant nonce ledger is corrupt.');
    }
  }
}

function canonicalConsumedNonce(value: unknown): ConsumedSocialRegrantNonceV1 {
  if (!isRecord(value) || value.v !== 1) throw new Error('Invalid consumed social re-grant nonce.');
  const requestedAccountPublicKeyHex = normalizeAccount(value.requestedAccountPublicKeyHex);
  if (!requestedAccountPublicKeyHex) throw new Error('Invalid consumed social re-grant nonce.');
  return {
    v: 1,
    requestId: required(value.requestId),
    groupId: required(value.groupId),
    participantId: required(value.participantId),
    requestedAccountPublicKeyHex,
    nonce: required(value.nonce),
    consumedAt: canonicalTimestamp(value.consumedAt),
  };
}

function socialNonceKey(value: Pick<ConsumedSocialRegrantNonceV1,
  'groupId' | 'participantId' | 'requestedAccountPublicKeyHex' | 'nonce'>): string {
  return stableSerialize([
    value.groupId,
    value.participantId,
    value.requestedAccountPublicKeyHex,
    value.nonce,
  ]);
}

function canonicalRecoveryPayload(value: RecoveryKitPayloadV1): RecoveryKitPayloadV1 {
  if (!isRecord(value) || value.v !== 1 || !Array.isArray(value.entries)) throw new Error('Recovery kit payload is invalid.');
  const ownerAccountPublicKeyHex = normalizeAccount(value.ownerAccountPublicKeyHex);
  if (!ownerAccountPublicKeyHex) throw new Error('Recovery kit account is invalid.');
  const createdAt = canonicalTimestamp(value.createdAt);
  const entries = value.entries.map(entry => canonicalRecoveryEntry(entry, ownerAccountPublicKeyHex));
  const identities = new Set(entries.map(entry => `${entry.groupId}\u0000${entry.participantId}`));
  if (identities.size !== entries.length) throw new Error('Recovery kit contains duplicate group access.');
  return {v: 1, ownerAccountPublicKeyHex, createdAt, entries};
}

function canonicalRecoveryEntry(value: RecoveryKitEntryV1, ownerAccount: string): RecoveryKitEntryV1 {
  if (!isRecord(value) || !isRecord(value.keyEnvelope) || !isRecord(value.locator)) {
    throw new Error('Recovery kit entry is invalid.');
  }
  const entry = {
    productId: required(value.productId),
    groupId: required(value.groupId),
    participantId: required(value.participantId),
    accountPublicKeyHex: normalizeAccount(value.accountPublicKeyHex),
    keyVersion: value.keyVersion,
    keyEnvelope: value.keyEnvelope,
    locator: value.locator,
  };
  if (
    entry.accountPublicKeyHex !== ownerAccount
    || !Number.isSafeInteger(entry.keyVersion)
    || entry.keyVersion < 1
    || entry.keyEnvelope.v !== 1
    || entry.keyEnvelope.alg !== 'A256GCM'
    || entry.keyEnvelope.productId !== entry.productId
    || entry.keyEnvelope.groupId !== entry.groupId
    || entry.keyEnvelope.recipientId !== entry.participantId
    || normalizeAccount(entry.keyEnvelope.recipientAccountPublicKeyHex) !== ownerAccount
    || entry.keyEnvelope.keyVersion !== entry.keyVersion
    || entry.locator.v !== 1
    || entry.locator.groupId !== entry.groupId
    || entry.locator.participantId !== entry.participantId
    || normalizeAccount(entry.locator.accountPublicKeyHex) !== ownerAccount
    || entry.locator.keyVersion !== entry.keyVersion
  ) throw new Error('Recovery kit entry does not match its account-bound recovery data.');
  // Force deterministic JSON validation and clone away prototypes/references.
  return JSON.parse(stableSerialize(entry)) as RecoveryKitEntryV1;
}

function canonicalKit(value: EncryptedRecoveryKitV1): EncryptedRecoveryKitV1 {
  if (!isRecord(value) || value.v !== 1 || value.alg !== 'PBKDF2-SHA256+A256GCM') {
    throw new Error('Recovery kit is invalid.');
  }
  if (value.iterations !== PBKDF2_ITERATIONS) throw new Error('Recovery kit work factor is invalid.');
  if (!/^0x[0-9a-f]{64}$/iu.test(value.accountHintHash)) throw new Error('Recovery kit account hint is invalid.');
  const salt = required(value.salt);
  const iv = required(value.iv);
  const ciphertext = required(value.ciphertext);
  if (fromBase64Url(salt).byteLength !== 16 || fromBase64Url(iv).byteLength !== 12 || fromBase64Url(ciphertext).byteLength < 16) {
    throw new Error('Recovery kit ciphertext is invalid.');
  }
  return {
    v: 1,
    alg: 'PBKDF2-SHA256+A256GCM',
    iterations: PBKDF2_ITERATIONS,
    accountHintHash: value.accountHintHash.toLowerCase(),
    createdAt: canonicalTimestamp(value.createdAt),
    salt,
    iv,
    ciphertext,
  };
}

function canonicalSocialRegrant(value: SocialRegrantRequestV1): SocialRegrantRequestV1 {
  if (!isRecord(value) || value.v !== 1) throw new Error('Social re-grant request is invalid.');
  const unsigned = canonicalSocialRegrantUnsigned(value);
  if (!/^0x[0-9a-f]{128}$/iu.test(value.signatureHex)) throw new Error('Social re-grant request signature is invalid.');
  return {...unsigned, signatureHex: value.signatureHex.toLowerCase()};
}

function canonicalSocialRegrantUnsigned(value: Omit<SocialRegrantRequestV1, 'signatureHex'>) {
  const priorAccountPublicKeyHex = normalizeAccount(value.priorAccountPublicKeyHex);
  const requestedAccountPublicKeyHex = normalizeAccount(value.requestedAccountPublicKeyHex);
  if (!priorAccountPublicKeyHex || !requestedAccountPublicKeyHex) throw new Error('Social re-grant account is invalid.');
  return {
    v: 1 as const,
    requestId: required(value.requestId),
    groupId: required(value.groupId),
    participantId: required(value.participantId),
    priorAccountPublicKeyHex,
    requestedAccountPublicKeyHex,
    nonce: required(value.nonce),
    createdAt: canonicalTimestamp(value.createdAt),
    expiresAt: canonicalTimestamp(value.expiresAt),
  };
}

function socialRegrantSigningBytes(value: Omit<SocialRegrantRequestV1, 'signatureHex'>): Uint8Array {
  return encoder.encode(stableSerialize([REGRANT_DOMAIN, value]));
}

function kitAad(value: Omit<EncryptedRecoveryKitV1, 'ciphertext'>): Uint8Array {
  return encoder.encode(stableSerialize([KIT_DOMAIN, value]));
}

async function deriveKitKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const source = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name: 'PBKDF2', hash: 'SHA-256', salt, iterations},
    source,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
}

async function accountHintHash(account: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(account)));
  return bytesToHex(digest);
}

function recoveryPassphrase(value: string): string {
  if (typeof value !== 'string' || value.normalize('NFKC').trim().length < 12) {
    throw new Error('Recovery kit passphrase must contain at least 12 characters.');
  }
  return value.normalize('NFKC');
}

function normalizeAccount(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function canonicalTimestamp(value: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error('Recovery timestamp is invalid.');
  return new Date(value).toISOString();
}

function required(value: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Recovery field is required.');
  return value.trim();
}

function toBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url.');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  if (!/^[0-9a-f]+$/u.test(normalized) || normalized.length % 2 !== 0) throw new Error('Invalid hex.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function stableSerialize(value: unknown, seen = new Set<object>()): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('Cyclic recovery data is invalid.');
    seen.add(value);
    const result = `[${value.map(item => stableSerialize(item, seen)).join(',')}]`;
    seen.delete(value);
    return result;
  }
  if (isRecord(value)) {
    if (seen.has(value)) throw new Error('Cyclic recovery data is invalid.');
    seen.add(value);
    const result = `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key], seen)}`).join(',')}}`;
    seen.delete(value);
    return result;
  }
  throw new Error('Unsupported recovery data.');
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
