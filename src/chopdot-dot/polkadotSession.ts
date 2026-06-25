import { hexToU8a, stringToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsHex, signatureVerify } from '@polkadot/util-crypto';
import type { SignerAccount, SignerManager as ProductSdkSignerManager } from '@parity/product-sdk-signer';
import type { ConnectionCredentials, PublishOptions, ReceivedStatement, Unsubscribable } from '@parity/product-sdk-statement-store';
import {
  buildDotStatus,
  claimDotContribution,
  claimDotRelease,
  closeDotChapter,
  confirmDotContributionClaim,
  confirmDotRelease,
  createDotReleaseRequest,
  decideDotApproval,
  exportDotReceipt,
  recordDotException,
  type DotChapter,
  type DotExceptionNote,
  type DotReceipt,
  type DotRole,
  type DotVisibility,
} from './commitmentKernel';
import type { ChapterPotReleaseTemplate } from '../types/app';

export const DOT_SESSION_GENESIS_HASH = 'GENESIS';

export type DotSessionAction =
  | {
      type: 'claim_contribution';
      obligationId: string;
      note?: string;
      assetHubReference?: DotAssetHubReference;
      privatePayloadRef?: DotPrivatePayloadRef;
    }
  | { type: 'confirm_contribution'; obligationId: string }
  | {
      type: 'record_exception';
      subjectType: DotExceptionNote['subjectType'];
      subjectId: string;
      note: string;
      visibility?: DotExceptionNote['visibility'];
      privatePayloadRef?: DotPrivatePayloadRef;
    }
  | { type: 'create_release'; release: ChapterPotReleaseTemplate }
  | { type: 'approve_release'; releaseRequestId: string }
  | { type: 'claim_release'; releaseRequestId: string; assetHubReference?: DotAssetHubReference; privatePayloadRef?: DotPrivatePayloadRef }
  | { type: 'confirm_release'; releaseRequestId: string }
  | { type: 'close_chapter'; allowOpenItems?: boolean; annotation?: string }
  | { type: 'asset_hub_reference'; reference: DotAssetHubReference }
  | { type: 'escrow_evidence'; reference: DotEscrowEvidenceReference }
  | { type: 'save_receipt'; receiptHash: string; storage: DotReceiptArchiveStorage; cid?: string; blockNumber?: number; extrinsicIndex?: number }
  | { type: 'anchor_receipt'; proof: DotCloseoutProofRef }
  | { type: 'transport_probe'; probeId: string; issuedAt: string };

export type DotAssetHubReference = {
  subjectId: string;
  txHash: string;
  lifecycle: 'signing' | 'broadcasting' | 'in_block' | 'finalized' | 'failed';
  amount: number;
  currency: 'DOT' | 'USDC' | 'PAS' | 'TEST_DOT' | 'TEST_USDC' | 'TEST_USD';
  blockNumber?: number;
  extrinsicIndex?: number;
};

export type DotAssetHubEvidenceInput = Omit<DotAssetHubReference, 'lifecycle'> & {
  tx?: unknown;
  signer?: unknown;
};

export type DotEscrowEvidenceReference = {
  subjectId: string;
  caseId: string;
  contractAddress: string;
  txHash: string;
  lifecycle: 'created' | 'deposited' | 'approved' | 'released' | 'refunded' | 'voided' | 'failed';
  eventName: 'CaseCreated' | 'Deposited' | 'ReleaseApproved' | 'Released' | 'Refunded' | 'Voided';
  amount?: number;
  currency: 'DOT' | 'USDC' | 'PAS' | 'TEST_DOT' | 'TEST_USDC' | 'TEST_USD';
  blockNumber?: number;
  extrinsicIndex?: number;
};

export interface DotAssetHubEvidenceAdapter {
  readonly kind: string;
  evidenceForClaim(input: DotAssetHubEvidenceInput): DotAssetHubReference | Promise<DotAssetHubReference>;
}

export type DotPrivatePayloadKind = 'payment_note' | 'payment_reference' | 'exception_note' | 'release_reference' | 'receipt_private_detail';

export type DotPrivatePayloadRef = {
  id: string;
  subjectId: string;
  kind: DotPrivatePayloadKind;
  visibility: DotVisibility;
  recipients: string[];
  algorithm: 'product_sdk_crypto_xchacha20_poly1305';
  payloadHash: string;
  ciphertextHex: string;
  nonceHex: string;
};

export type DotPrivatePayloadInput = {
  subjectId: string;
  kind: DotPrivatePayloadKind;
  visibility: DotVisibility;
  recipients: string[];
  payload: unknown;
};

export interface DotPrivatePayloadAdapter {
  readonly kind: string;
  encryptPayload(input: DotPrivatePayloadInput): Promise<DotPrivatePayloadRef>;
  decryptPayload(ref: DotPrivatePayloadRef): Promise<unknown>;
}

export type DotSessionEvent = {
  id: string;
  chapterId: string;
  participantId: string;
  deviceId: string;
  action: DotSessionAction;
  previousEventHash: string;
  timestamp: string;
  signerAddress: string;
  signatureScheme?: DotSessionSignatureScheme;
  signerSource?: DotSessionSignerSource;
  signature: string;
};

export type DotSessionSignatureScheme = 'demo-blake2' | 'polkadot-raw';
export type DotSessionSignerSource = 'demo' | 'product_account_host' | 'product_sdk_dev';

export type DotSessionSigner = {
  participantId: string;
  signerAddress: string;
  signatureScheme: DotSessionSignatureScheme;
  signerSource: DotSessionSignerSource;
  secret?: string;
  signRaw?: (payload: Uint8Array) => Uint8Array | Promise<Uint8Array>;
};

export type DotMembershipGrant = {
  id: string;
  chapterId: string;
  participantId: string;
  signerAddress: string;
  roles: DotRole[];
  issuedByParticipantId: string;
  issuedByAddress: string;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  signatureScheme?: DotSessionSignatureScheme;
  signerSource?: DotSessionSignerSource;
  signature: string;
};

export type DotInviteKeyPair = {
  publicKeyHex: string;
  secretKeyHex: string;
};

export type DotChapterInvitation = {
  id: string;
  chapterId: string;
  inviteeParticipantId: string;
  inviteeSignerAddress: string;
  inviteeEncryptionPublicKeyHex: string;
  roles: DotRole[];
  issuedByParticipantId: string;
  issuedByAddress: string;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  encryptedChapterKeyHex: string;
  keyEncryption: 'product_sdk_crypto_sealed_box_x25519';
  membershipGrant: DotMembershipGrant;
  signatureScheme?: DotSessionSignatureScheme;
  signerSource?: DotSessionSignerSource;
  signature: string;
};

export type DotInvitationAcceptance = {
  invitationId: string;
  chapterId: string;
  participantId: string;
  signerAddress: string;
  membershipGrant: DotMembershipGrant;
  chapterKey: Uint8Array;
};

export type DotInvitationAccessBundle = {
  invitations: DotChapterInvitation[];
  accessEvents: DotInviteAccessEvent[];
  membershipGrants: DotMembershipGrant[];
  acceptedInvitation?: DotInvitationAcceptance;
  chapterKey: Uint8Array;
};

export type DotInviteAccessAction =
  | { type: 'accept_invitation'; invitation: DotChapterInvitation }
  | { type: 'revoke_invitation'; invitation: DotChapterInvitation; revokedAt: string; reason?: string };

export type DotInviteAccessEvent = {
  id: string;
  chapterId: string;
  participantId: string;
  deviceId: string;
  action: DotInviteAccessAction;
  previousEventHash: string;
  timestamp: string;
  signerAddress: string;
  signatureScheme?: DotSessionSignatureScheme;
  signerSource?: DotSessionSignerSource;
  signature: string;
};

export type DotSessionReplayOptions = {
  membershipGrants?: DotMembershipGrant[];
  now?: string;
};

export interface DotSessionSignerAdapter {
  readonly kind: string;
  getSigner(participantId: string): Promise<DotSessionSigner>;
  destroy?(): void;
}

export type DotSessionReplayResult = {
  chapter: DotChapter;
  receipt?: DotReceipt;
  assetHubReferences: DotAssetHubReference[];
  escrowEvidenceRefs: DotEscrowEvidenceReference[];
  privatePayloadRefs: DotPrivatePayloadRef[];
  savedReceiptRefs: DotReceiptArchiveRef[];
  closeoutProofRefs: DotCloseoutProofRef[];
};

export type DotReceiptArchiveStorage = 'bulletin_lab' | 'product_sdk_cloud_storage';

export type DotReceiptArchiveRef = {
  receiptHash: string;
  storage: DotReceiptArchiveStorage;
  cid?: string;
  blockNumber?: number;
  extrinsicIndex?: number;
};

export interface DotReceiptArchiveAdapter {
  readonly kind: string;
  saveReceipt(receipt: DotReceipt): DotReceiptArchiveRef | Promise<DotReceiptArchiveRef>;
  loadReceipt(ref: DotReceiptArchiveRef): DotReceipt | Promise<DotReceipt>;
}

export type DotCloseoutProofStorage = 'hash_only_lab' | 'product_sdk_tx_anchor';

export type DotCloseoutProofRef = {
  receiptHash: string;
  anchorHash: string;
  storage: DotCloseoutProofStorage;
  txHash?: string;
  lifecycle?: DotAssetHubReference['lifecycle'];
  blockNumber?: number;
  extrinsicIndex?: number;
};

export interface DotCloseoutProofAdapter {
  readonly kind: string;
  anchorReceipt(receipt: DotReceipt): DotCloseoutProofRef | Promise<DotCloseoutProofRef>;
}

export type DotNativeHostGateId = 'identity' | 'transport' | 'archive' | 'closeout_proof' | 'payout_evidence';

export type DotNativeHostPreflightResult = {
  id: DotNativeHostGateId;
  label: string;
  status: 'pass' | 'fail';
  detail: string;
  adapterKind?: string;
};

export type DotNativeHostPreflightInput = {
  chapter: DotChapter;
  receipt: DotReceipt;
  participantId: string;
  deviceId: string;
  identityParticipantIds?: string[];
  membershipGrants?: DotMembershipGrant[];
  requireMembershipGrant?: boolean;
  requireDistinctParticipantSigners?: boolean;
  now?: string;
  signerAdapter: DotSessionSignerAdapter;
  transportAdapter: DotSessionTransportAdapter;
  receiptAdapter: DotReceiptArchiveAdapter;
  closeoutProofAdapter: DotCloseoutProofAdapter;
  assetHubEvidenceAdapter: DotAssetHubEvidenceAdapter;
  assetHubEvidenceInput?: DotAssetHubEvidenceInput;
};

export interface DotSessionTransportAdapter {
  readonly kind: string;
  loadEvents(chapterId: string): Promise<DotSessionEvent[]>;
  appendEvent(chapter: DotChapter, signer: DotSessionSigner, deviceId: string, action: DotSessionAction, options?: DotSessionReplayOptions): Promise<DotSessionEvent[]>;
  subscribe(chapterId: string, callback: (events: DotSessionEvent[]) => void): () => void;
}

export interface DotInviteAccessTransportAdapter {
  readonly kind: string;
  loadAccessEvents(chapterId: string): Promise<DotInviteAccessEvent[]>;
  appendAccessEvent(chapter: DotChapter, signer: DotSessionSigner, deviceId: string, action: DotInviteAccessAction): Promise<DotInviteAccessEvent[]>;
  subscribeAccess(chapterId: string, callback: (events: DotInviteAccessEvent[]) => void): () => void;
}

const demoSignerSecrets: Record<string, DotSessionSigner> = {
  mina: { participantId: 'mina', signerAddress: 'dot-session-mina', secret: 'mina-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  leo: { participantId: 'leo', signerAddress: 'dot-session-leo', secret: 'leo-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  nia: { participantId: 'nia', signerAddress: 'dot-session-nina', secret: 'nina-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  omar: { participantId: 'omar', signerAddress: 'dot-session-omar', secret: 'omar-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  vera: { participantId: 'vera', signerAddress: 'dot-session-vera', secret: 'vera-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  riley: { participantId: 'riley', signerAddress: 'dot-session-riley', secret: 'riley-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  taylor: { participantId: 'taylor', signerAddress: 'dot-session-taylor', secret: 'taylor-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  casey: { participantId: 'casey', signerAddress: 'dot-session-casey', secret: 'casey-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  morgan: { participantId: 'morgan', signerAddress: 'dot-session-morgan', secret: 'morgan-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  jordan: { participantId: 'jordan', signerAddress: 'dot-session-jordan', secret: 'jordan-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  lee: { participantId: 'lee', signerAddress: 'dot-session-lee', secret: 'lee-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  alex: { participantId: 'alex', signerAddress: 'dot-session-alex', secret: 'alex-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  priya: { participantId: 'priya', signerAddress: 'dot-session-priya', secret: 'priya-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  sam: { participantId: 'sam', signerAddress: 'dot-session-sam', secret: 'sam-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
  noor: { participantId: 'noor', signerAddress: 'dot-session-noor', secret: 'noor-product-account-lab-secret', signatureScheme: 'demo-blake2', signerSource: 'demo' },
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

function signingPayload(event: Omit<DotSessionEvent, 'signature'>): string {
  return stableStringify(event);
}

function inviteAccessSigningPayload(event: Omit<DotInviteAccessEvent, 'signature'>): string {
  return stableStringify(event);
}

function stablePayload(value: unknown): string {
  return stableStringify(value);
}

function signPayload(event: Omit<DotSessionEvent, 'signature'>, signer: DotSessionSigner): string {
  if (signer.signatureScheme !== 'demo-blake2' || !signer.secret) {
    throw new Error('Demo signing requires a demo signer secret');
  }
  return signStablePayload(signingPayload(event), signer);
}

function signStablePayload(payload: string, signer: DotSessionSigner): string {
  if (signer.signatureScheme !== 'demo-blake2' || !signer.secret) {
    throw new Error('Demo signing requires a demo signer secret');
  }
  return blake2AsHex(`${payload}:${signer.secret}`, 256);
}

async function signPayloadWithSigner(event: Omit<DotSessionEvent, 'signature'>, signer: DotSessionSigner): Promise<string> {
  if (signer.signatureScheme === 'demo-blake2') return signPayload(event, signer);
  if (!signer.signRaw) throw new Error('Polkadot raw signing requires a signRaw function');
  return u8aToHex(await signer.signRaw(stringToU8a(signingPayload(event))));
}

async function signStablePayloadWithSigner(payload: string, signer: DotSessionSigner): Promise<string> {
  if (signer.signatureScheme === 'demo-blake2') return signStablePayload(payload, signer);
  if (!signer.signRaw) throw new Error('Polkadot raw signing requires a signRaw function');
  return u8aToHex(await signer.signRaw(stringToU8a(payload)));
}

function signerForParticipant(participantId: string): DotSessionSigner | undefined {
  return demoSignerSecrets[participantId];
}

export function dotSessionEventHash(event: DotSessionEvent): string {
  return blake2AsHex(stableStringify(event), 256);
}

export function dotInviteAccessEventHash(event: DotInviteAccessEvent): string {
  return blake2AsHex(stableStringify(event), 256);
}

export function createDotSessionEvent(input: {
  chapterId: string;
  participantId: string;
  deviceId: string;
  action: DotSessionAction;
  previousEventHash: string;
  signer: DotSessionSigner;
  id?: string;
  timestamp?: string;
}): DotSessionEvent {
  if (input.signer.participantId !== input.participantId) {
    throw new Error('Signer does not match participant');
  }
  const unsigned: Omit<DotSessionEvent, 'signature'> = {
    id: input.id ?? `dot_session_event_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    chapterId: input.chapterId,
    participantId: input.participantId,
    deviceId: input.deviceId,
    action: input.action,
    previousEventHash: input.previousEventHash,
    timestamp: input.timestamp ?? new Date().toISOString(),
    signerAddress: input.signer.signerAddress,
    signatureScheme: input.signer.signatureScheme,
    signerSource: input.signer.signerSource,
  };
  return {
    ...unsigned,
    signature: signPayload(unsigned, input.signer),
  };
}

export async function createDotSessionEventAsync(input: {
  chapterId: string;
  participantId: string;
  deviceId: string;
  action: DotSessionAction;
  previousEventHash: string;
  signer: DotSessionSigner;
  id?: string;
  timestamp?: string;
}): Promise<DotSessionEvent> {
  if (input.signer.participantId !== input.participantId) {
    throw new Error('Signer does not match participant');
  }
  const unsigned: Omit<DotSessionEvent, 'signature'> = {
    id: input.id ?? `dot_session_event_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    chapterId: input.chapterId,
    participantId: input.participantId,
    deviceId: input.deviceId,
    action: input.action,
    previousEventHash: input.previousEventHash,
    timestamp: input.timestamp ?? new Date().toISOString(),
    signerAddress: input.signer.signerAddress,
    signatureScheme: input.signer.signatureScheme,
    signerSource: input.signer.signerSource,
  };
  return {
    ...unsigned,
    signature: await signPayloadWithSigner(unsigned, input.signer),
  };
}

export function verifyDotSessionEvent(event: DotSessionEvent): boolean {
  if (!event.signature) return false;
  if (event.signatureScheme === 'polkadot-raw') {
    const { signature: _signature, ...unsigned } = event;
    return signatureVerify(stringToU8a(signingPayload(unsigned)), event.signature, event.signerAddress).isValid;
  }
  const signer = signerForParticipant(event.participantId);
  if (!signer || signer.signerAddress !== event.signerAddress) return false;
  const { signature: _signature, ...unsigned } = event;
  return signPayload(unsigned, signer) === event.signature;
}

export async function createDotMembershipGrant(input: {
  chapterId: string;
  participantId: string;
  signerAddress: string;
  roles: DotRole[];
  issuedByParticipantId: string;
  issuerSigner: DotSessionSigner;
  id?: string;
  issuedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
}): Promise<DotMembershipGrant> {
  if (input.issuerSigner.participantId !== input.issuedByParticipantId) {
    throw new Error('Membership grant issuer signer does not match issuer participant');
  }
  const unsigned: Omit<DotMembershipGrant, 'signature'> = {
    id: input.id ?? `dot_membership_grant_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    chapterId: input.chapterId,
    participantId: input.participantId,
    signerAddress: input.signerAddress,
    roles: input.roles,
    issuedByParticipantId: input.issuedByParticipantId,
    issuedByAddress: input.issuerSigner.signerAddress,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    expiresAt: input.expiresAt,
    revokedAt: input.revokedAt,
    signatureScheme: input.issuerSigner.signatureScheme,
    signerSource: input.issuerSigner.signerSource,
  };
  return {
    ...unsigned,
    signature: await signStablePayloadWithSigner(stablePayload(unsigned), input.issuerSigner),
  };
}

function defaultChapterIssuerParticipantId(chapter: DotChapter, requestedIssuerParticipantId?: string): string {
  if (requestedIssuerParticipantId && chapter.participants.some((participant) => participant.id === requestedIssuerParticipantId)) {
    return requestedIssuerParticipantId;
  }
  const issuer = chapter.participants.find((participant) =>
    participant.roles.some((role) => role === 'organizer' || role === 'treasurer'),
  );
  if (!issuer) throw new Error('Chapter needs an organizer or treasurer to issue native invitations');
  return issuer.id;
}

export async function createDemoDotMembershipGrants(chapter: DotChapter, issuerParticipantId?: string): Promise<DotMembershipGrant[]> {
  const resolvedIssuerParticipantId = defaultChapterIssuerParticipantId(chapter, issuerParticipantId);
  const issuerSigner = getDemoDotSessionSigner(resolvedIssuerParticipantId);
  const issuedAt = '2026-06-09T12:00:00.000Z';
  return Promise.all(
    chapter.participants.map((participant) => {
      const subjectSigner = getDemoDotSessionSigner(participant.id);
      return createDotMembershipGrant({
        id: `grant_${chapter.id}_${participant.id}`,
        chapterId: chapter.id,
        participantId: participant.id,
        signerAddress: subjectSigner.signerAddress,
        roles: participant.roles,
        issuedByParticipantId: resolvedIssuerParticipantId,
        issuerSigner,
        issuedAt,
      });
    }),
  );
}

export function verifyDotMembershipGrant(chapter: DotChapter, grant: DotMembershipGrant, now = new Date().toISOString()): boolean {
  if (!grant.signature || grant.chapterId !== chapter.id) return false;
  const participant = chapter.participants.find((item) => item.id === grant.participantId);
  const issuer = chapter.participants.find((item) => item.id === grant.issuedByParticipantId);
  if (!participant || !issuer) return false;
  if (!issuer.roles.some((role) => role === 'organizer' || role === 'treasurer')) return false;
  if (grant.revokedAt) return false;
  if (grant.expiresAt && grant.expiresAt <= now) return false;
  if (!grant.roles.every((role) => participant.roles.includes(role))) return false;

  const { signature: _signature, ...unsigned } = grant;
  const payload = stablePayload(unsigned);
  if (grant.signatureScheme === 'polkadot-raw') {
    return signatureVerify(stringToU8a(payload), grant.signature, grant.issuedByAddress).isValid;
  }
  const issuerSigner = signerForParticipant(grant.issuedByParticipantId);
  if (!issuerSigner || issuerSigner.signerAddress !== grant.issuedByAddress) return false;
  return signStablePayload(payload, issuerSigner) === grant.signature;
}

export function assertDotMembershipForEvent(chapter: DotChapter, event: DotSessionEvent, options: DotSessionReplayOptions = {}): void {
  const grants = options.membershipGrants;
  if (!grants) return;
  const matchingGrant = grants.find(
    (grant) =>
      grant.chapterId === chapter.id &&
      grant.participantId === event.participantId &&
      grant.signerAddress === event.signerAddress,
  );
  if (!matchingGrant) {
    throw new Error('Session event signer has no membership grant for this participant');
  }
  if (!verifyDotMembershipGrant(chapter, matchingGrant, options.now)) {
    throw new Error('Session event membership grant is invalid, expired, or revoked');
  }
}

export async function createDemoDotInviteKeyPair(participantId: string): Promise<DotInviteKeyPair> {
  const { nacl } = await loadProductSdkCrypto();
  const seed = hexToU8a(blake2AsHex(`chopdot-dot-invite-key:${participantId}`, 256));
  const pair = nacl.box.keyPair.fromSecretKey(seed);
  return {
    publicKeyHex: u8aToHex(pair.publicKey),
    secretKeyHex: u8aToHex(pair.secretKey),
  };
}

export async function createDotChapterInvitation(input: {
  chapter: DotChapter;
  inviteeParticipantId: string;
  inviteeSignerAddress: string;
  inviteeEncryptionPublicKeyHex: string;
  issuedByParticipantId: string;
  issuerSigner: DotSessionSigner;
  chapterKey?: Uint8Array;
  id?: string;
  issuedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
}): Promise<DotChapterInvitation> {
  if (input.issuerSigner.participantId !== input.issuedByParticipantId) {
    throw new Error('Invitation issuer signer does not match issuer participant');
  }
  const invitee = input.chapter.participants.find((participant) => participant.id === input.inviteeParticipantId);
  if (!invitee) throw new Error('Invitation invitee is not a chapter participant');
  const issuer = input.chapter.participants.find((participant) => participant.id === input.issuedByParticipantId);
  if (!issuer?.roles.some((role) => role === 'organizer' || role === 'treasurer')) {
    throw new Error('Only an organizer or treasurer can issue a chapter invitation');
  }

  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const membershipGrant = await createDotMembershipGrant({
    id: `grant_${input.chapter.id}_${input.inviteeParticipantId}_${input.id ?? 'invite'}`,
    chapterId: input.chapter.id,
    participantId: input.inviteeParticipantId,
    signerAddress: input.inviteeSignerAddress,
    roles: invitee.roles,
    issuedByParticipantId: input.issuedByParticipantId,
    issuerSigner: input.issuerSigner,
    issuedAt,
    expiresAt: input.expiresAt,
    revokedAt: input.revokedAt,
  });
  const { sealedBoxEncrypt } = await loadProductSdkCrypto();
  const chapterKey = input.chapterKey ?? demoPrivatePayloadKey(input.chapter.id);
  const encryptedChapterKey = sealedBoxEncrypt(chapterKey, hexToU8a(input.inviteeEncryptionPublicKeyHex));
  const unsigned: Omit<DotChapterInvitation, 'signature'> = {
    id: input.id ?? `dot_invite_${input.chapter.id}_${input.inviteeParticipantId}`,
    chapterId: input.chapter.id,
    inviteeParticipantId: input.inviteeParticipantId,
    inviteeSignerAddress: input.inviteeSignerAddress,
    inviteeEncryptionPublicKeyHex: input.inviteeEncryptionPublicKeyHex,
    roles: invitee.roles,
    issuedByParticipantId: input.issuedByParticipantId,
    issuedByAddress: input.issuerSigner.signerAddress,
    issuedAt,
    expiresAt: input.expiresAt,
    revokedAt: input.revokedAt,
    encryptedChapterKeyHex: u8aToHex(encryptedChapterKey),
    keyEncryption: 'product_sdk_crypto_sealed_box_x25519',
    membershipGrant,
    signatureScheme: input.issuerSigner.signatureScheme,
    signerSource: input.issuerSigner.signerSource,
  };
  return {
    ...unsigned,
    signature: await signStablePayloadWithSigner(stablePayload(unsigned), input.issuerSigner),
  };
}

export function verifyDotChapterInvitation(chapter: DotChapter, invitation: DotChapterInvitation, now = new Date().toISOString()): boolean {
  if (!invitation.signature || invitation.chapterId !== chapter.id) return false;
  if (invitation.revokedAt) return false;
  if (invitation.expiresAt && invitation.expiresAt <= now) return false;
  const invitee = chapter.participants.find((participant) => participant.id === invitation.inviteeParticipantId);
  const issuer = chapter.participants.find((participant) => participant.id === invitation.issuedByParticipantId);
  if (!invitee || !issuer) return false;
  if (!issuer.roles.some((role) => role === 'organizer' || role === 'treasurer')) return false;
  if (!invitation.roles.every((role) => invitee.roles.includes(role))) return false;
  if (invitation.membershipGrant.participantId !== invitation.inviteeParticipantId) return false;
  if (invitation.membershipGrant.signerAddress !== invitation.inviteeSignerAddress) return false;
  if (!verifyDotMembershipGrant(chapter, invitation.membershipGrant, now)) return false;

  const { signature: _signature, ...unsigned } = invitation;
  const payload = stablePayload(unsigned);
  if (invitation.signatureScheme === 'polkadot-raw') {
    return signatureVerify(stringToU8a(payload), invitation.signature, invitation.issuedByAddress).isValid;
  }
  const issuerSigner = signerForParticipant(invitation.issuedByParticipantId);
  if (!issuerSigner || issuerSigner.signerAddress !== invitation.issuedByAddress) return false;
  return signStablePayload(payload, issuerSigner) === invitation.signature;
}

export async function acceptDotChapterInvitation(input: {
  chapter: DotChapter;
  invitation: DotChapterInvitation;
  inviteeParticipantId: string;
  inviteeSignerAddress: string;
  inviteeSecretKeyHex: string;
  now?: string;
}): Promise<DotInvitationAcceptance> {
  if (!verifyDotChapterInvitation(input.chapter, input.invitation, input.now)) {
    throw new Error('Invitation is invalid, expired, or revoked');
  }
  if (
    input.invitation.inviteeParticipantId !== input.inviteeParticipantId ||
    input.invitation.inviteeSignerAddress !== input.inviteeSignerAddress
  ) {
    throw new Error('Invitation cannot be accepted by this participant');
  }
  const { sealedBoxDecrypt } = await loadProductSdkCrypto();
  const chapterKey = sealedBoxDecrypt(hexToU8a(input.invitation.encryptedChapterKeyHex), hexToU8a(input.inviteeSecretKeyHex));
  return {
    invitationId: input.invitation.id,
    chapterId: input.invitation.chapterId,
    participantId: input.invitation.inviteeParticipantId,
    signerAddress: input.invitation.inviteeSignerAddress,
    membershipGrant: input.invitation.membershipGrant,
    chapterKey,
  };
}

export async function createDotInviteAccessEvent(input: {
  chapterId: string;
  participantId: string;
  deviceId: string;
  action: DotInviteAccessAction;
  previousEventHash: string;
  signer: DotSessionSigner;
  id?: string;
  timestamp?: string;
}): Promise<DotInviteAccessEvent> {
  if (input.signer.participantId !== input.participantId) {
    throw new Error('Access event signer does not match participant');
  }
  const unsigned: Omit<DotInviteAccessEvent, 'signature'> = {
    id: input.id ?? `dot_invite_access_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    chapterId: input.chapterId,
    participantId: input.participantId,
    deviceId: input.deviceId,
    action: input.action,
    previousEventHash: input.previousEventHash,
    timestamp: input.timestamp ?? new Date().toISOString(),
    signerAddress: input.signer.signerAddress,
    signatureScheme: input.signer.signatureScheme,
    signerSource: input.signer.signerSource,
  };
  return {
    ...unsigned,
    signature: await signStablePayloadWithSigner(inviteAccessSigningPayload(unsigned), input.signer),
  };
}

export function verifyDotInviteAccessEvent(chapter: DotChapter, event: DotInviteAccessEvent, now = new Date().toISOString()): boolean {
  if (!event.signature || event.chapterId !== chapter.id) return false;
  const { signature: _signature, ...unsigned } = event;
  const payload = inviteAccessSigningPayload(unsigned);
  const signatureIsValid =
    event.signatureScheme === 'polkadot-raw'
      ? signatureVerify(stringToU8a(payload), event.signature, event.signerAddress).isValid
      : (() => {
          const signer = signerForParticipant(event.participantId);
          return Boolean(signer && signer.signerAddress === event.signerAddress && signStablePayload(payload, signer) === event.signature);
        })();
  if (!signatureIsValid) return false;

  if (event.action.type === 'accept_invitation') {
    const invitation = event.action.invitation;
    return (
      verifyDotChapterInvitation(chapter, invitation, now) &&
      event.participantId === invitation.inviteeParticipantId &&
      event.signerAddress === invitation.inviteeSignerAddress
    );
  }

  const invitation = event.action.invitation;
  return (
    verifyDotChapterInvitation(chapter, invitation, now) &&
    event.participantId === invitation.issuedByParticipantId &&
    event.signerAddress === invitation.issuedByAddress
  );
}

export function reduceDotInviteAccessEvents(chapter: DotChapter, events: DotInviteAccessEvent[], now = new Date().toISOString()): {
  acceptedInvitations: DotChapterInvitation[];
  revokedInvitationIds: string[];
  membershipGrants: DotMembershipGrant[];
} {
  let previousHash = DOT_SESSION_GENESIS_HASH;
  const seenIds = new Set<string>();
  const seenHashes = new Set<string>();
  const accepted = new Map<string, DotChapterInvitation>();
  const revoked = new Set<string>();

  for (const event of events) {
    const eventHash = dotInviteAccessEventHash(event);
    if (seenIds.has(event.id) || seenHashes.has(eventHash)) {
      throw new Error('Duplicate invite access event');
    }
    if (event.previousEventHash !== previousHash) {
      throw new Error('Invite access event chain is out of order');
    }
    if (!verifyDotInviteAccessEvent(chapter, event, now)) {
      throw new Error('Invite access event is invalid');
    }
    if (event.action.type === 'accept_invitation') {
      if (!revoked.has(event.action.invitation.id)) {
        accepted.set(event.action.invitation.id, event.action.invitation);
      }
    } else {
      revoked.add(event.action.invitation.id);
      accepted.delete(event.action.invitation.id);
    }
    seenIds.add(event.id);
    seenHashes.add(eventHash);
    previousHash = eventHash;
  }

  const acceptedInvitations = [...accepted.values()];
  return {
    acceptedInvitations,
    revokedInvitationIds: [...revoked],
    membershipGrants: acceptedInvitations.map((invitation) => invitation.membershipGrant),
  };
}

export async function createDemoDotInvitationAccess(chapter: DotChapter, activeParticipantId?: string, issuerParticipantId?: string): Promise<DotInvitationAccessBundle> {
  const resolvedIssuerParticipantId = defaultChapterIssuerParticipantId(chapter, issuerParticipantId);
  const issuerSigner = getDemoDotSessionSigner(resolvedIssuerParticipantId);
  const issuedAt = '2026-06-09T12:00:00.000Z';
  const chapterKey = demoPrivatePayloadKey(chapter.id);
  const invitations = await Promise.all(
    chapter.participants.map(async (participant) => {
      const inviteeSigner = getDemoDotSessionSigner(participant.id);
      const inviteKey = await createDemoDotInviteKeyPair(participant.id);
      return createDotChapterInvitation({
        id: `invite_${chapter.id}_${participant.id}`,
        chapter,
        inviteeParticipantId: participant.id,
        inviteeSignerAddress: inviteeSigner.signerAddress,
        inviteeEncryptionPublicKeyHex: inviteKey.publicKeyHex,
        issuedByParticipantId: resolvedIssuerParticipantId,
        issuerSigner,
        chapterKey,
        issuedAt,
      });
    }),
  );
  const accessEvents: DotInviteAccessEvent[] = [];
  for (const invitation of invitations) {
    const signer = getDemoDotSessionSigner(invitation.inviteeParticipantId);
    accessEvents.push(
      await createDotInviteAccessEvent({
        id: `access_accept_${invitation.id}`,
        chapterId: chapter.id,
        participantId: invitation.inviteeParticipantId,
        deviceId: `invite_device_${invitation.inviteeParticipantId}`,
        action: { type: 'accept_invitation', invitation },
        previousEventHash: accessEvents.length ? dotInviteAccessEventHash(accessEvents[accessEvents.length - 1] as DotInviteAccessEvent) : DOT_SESSION_GENESIS_HASH,
        signer,
        timestamp: issuedAt,
      }),
    );
  }
  const derivedAccess = reduceDotInviteAccessEvents(chapter, accessEvents, issuedAt);
  const activeInvitation = activeParticipantId
    ? invitations.find((invitation) => invitation.inviteeParticipantId === activeParticipantId)
    : undefined;
  const activeKeyPair = activeParticipantId ? await createDemoDotInviteKeyPair(activeParticipantId) : undefined;
  const activeSigner = activeParticipantId ? getDemoDotSessionSigner(activeParticipantId) : undefined;
  const acceptedInvitation =
    activeInvitation && activeKeyPair && activeSigner
      ? await acceptDotChapterInvitation({
          chapter,
          invitation: activeInvitation,
          inviteeParticipantId: activeInvitation.inviteeParticipantId,
          inviteeSignerAddress: activeSigner.signerAddress,
          inviteeSecretKeyHex: activeKeyPair.secretKeyHex,
          now: issuedAt,
        })
      : undefined;
  return {
    invitations,
    accessEvents,
    membershipGrants: derivedAccess.membershipGrants,
    acceptedInvitation,
    chapterKey: acceptedInvitation?.chapterKey ?? chapterKey,
  };
}

export function getDemoDotSessionSigner(participantId: string): DotSessionSigner {
  const signer = signerForParticipant(participantId);
  if (!signer) {
    throw new Error(`Missing product-account lab signer for ${participantId}`);
  }
  return signer;
}

export class DemoDotSessionSignerAdapter implements DotSessionSignerAdapter {
  readonly kind = 'demo_product_account_lab';

  async getSigner(participantId: string): Promise<DotSessionSigner> {
    return getDemoDotSessionSigner(participantId);
  }
}

export type ProductAccountDotSessionSignerOptions = {
  dotNsIdentifier?: string;
  derivationIndex?: number;
  fallback?: DotSessionSignerAdapter;
  providerType?: 'host' | 'dev';
  requireProductAccount?: boolean;
  shouldAttemptHost?: () => boolean;
};

export class ProductAccountDotSessionSignerAdapter implements DotSessionSignerAdapter {
  readonly kind = 'product_account_signer';
  private readonly dotNsIdentifier: string;
  private readonly derivationIndex: number;
  private readonly fallback?: DotSessionSignerAdapter;
  private readonly providerType: 'host' | 'dev';
  private readonly requireProductAccount: boolean;
  private readonly shouldAttemptHost: () => boolean;
  private manager: ProductSdkSignerManager | null = null;
  private account: SignerAccount | null = null;

  constructor(options: ProductAccountDotSessionSignerOptions = {}) {
    this.dotNsIdentifier = options.dotNsIdentifier ?? 'chopdot.dot';
    this.derivationIndex = options.derivationIndex ?? 0;
    this.fallback = options.fallback;
    this.providerType = options.providerType ?? 'host';
    this.requireProductAccount = options.requireProductAccount ?? false;
    this.shouldAttemptHost = options.shouldAttemptHost ?? likelyInsideProductHost;
  }

  async getSigner(participantId: string): Promise<DotSessionSigner> {
    try {
      const account = await this.getAccount();
      return {
        participantId,
        signerAddress: account.address,
        signatureScheme: 'polkadot-raw',
        signerSource: this.providerType === 'host' ? 'product_account_host' : 'product_sdk_dev',
        signRaw: async (payload) => {
          const result = await this.manager?.signRaw(payload);
          if (!result?.ok) {
            throw result?.error ?? new Error('Product Account signing failed');
          }
          return result.value;
        },
      };
    } catch (error) {
      if (this.requireProductAccount || !this.fallback) {
        throw error;
      }
      return this.fallback.getSigner(participantId);
    }
  }

  destroy(): void {
    this.manager?.destroy();
    this.manager = null;
    this.account = null;
  }

  private async getAccount(): Promise<SignerAccount> {
    if (this.account) return this.account;
    if (this.providerType === 'host' && !this.shouldAttemptHost()) {
      throw new Error('Product Account host is unavailable in this browser context');
    }
    const { SignerManager } = await loadProductSdkSigner();
    const manager = new SignerManager({
      dappName: 'chopdot-dot',
      hostTimeout: 2_000,
    });
    const connected = await manager.connect(this.providerType);
    if (!connected.ok) {
      manager.destroy();
      throw connected.error;
    }
    let account: SignerAccount | null = null;
    if (this.providerType === 'host') {
      const productAccount = await manager.getProductAccount(this.dotNsIdentifier, this.derivationIndex);
      if (!productAccount.ok) {
        manager.destroy();
        throw productAccount.error;
      }
      account = productAccount.value;
      manager.selectAccount(account.address);
    } else {
      account = connected.value[0] ?? null;
      if (account) manager.selectAccount(account.address);
    }
    if (!account) {
      manager.destroy();
      throw new Error('No Product SDK signing account is available');
    }
    this.manager = manager;
    this.account = account;
    return account;
  }
}

function likelyInsideProductHost(): boolean {
  if (typeof window === 'undefined') return false;
  const maybeWindow = window as typeof window & {
    __POLKADOT_HOST__?: unknown;
    __NOVA_HOST__?: unknown;
    webkit?: { messageHandlers?: unknown };
  };
  return window.parent !== window || Boolean(maybeWindow.__POLKADOT_HOST__ || maybeWindow.__NOVA_HOST__ || maybeWindow.webkit?.messageHandlers);
}

async function loadProductSdkSigner(): Promise<typeof import('@parity/product-sdk-signer')> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<typeof import('@parity/product-sdk-signer')>;
  return dynamicImport('@parity/product-sdk-signer');
}

async function loadProductSdkCloudStorage(): Promise<typeof import('@parity/product-sdk-cloud-storage')> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<typeof import('@parity/product-sdk-cloud-storage')>;
  return dynamicImport('@parity/product-sdk-cloud-storage');
}

async function loadProductSdkTx(): Promise<typeof import('@parity/product-sdk-tx')> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<typeof import('@parity/product-sdk-tx')>;
  return dynamicImport('@parity/product-sdk-tx');
}

async function loadProductSdkStatementStore(): Promise<typeof import('@parity/product-sdk-statement-store')> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<typeof import('@parity/product-sdk-statement-store')>;
  return dynamicImport('@parity/product-sdk-statement-store');
}

async function loadProductSdkCrypto(): Promise<typeof import('@parity/product-sdk-crypto')> {
  return import('@parity/product-sdk-crypto');
}

function latestClaimId(chapter: DotChapter, obligationId: string): string {
  const claim = [...chapter.contributionClaims].reverse().find((item) => item.obligationId === obligationId);
  if (!claim) throw new Error('Contribution must be claimed before confirmation');
  return claim.id;
}

function latestReleaseId(chapter: DotChapter): string {
  const release = chapter.releaseRequests.at(-1);
  if (!release) throw new Error('Release has not been prepared');
  return release.id;
}

function normalizeCreatedTimes(before: DotChapter, after: DotChapter, event: DotSessionEvent): DotChapter {
  let next = after;
  if (after.contributionClaims.length > before.contributionClaims.length) {
    next = {
      ...next,
      contributionClaims: next.contributionClaims.map((item, index) =>
        index === next.contributionClaims.length - 1 ? { ...item, createdAt: event.timestamp } : item,
      ),
    };
  }
  if (after.releaseRequests.length > before.releaseRequests.length) {
    next = {
      ...next,
      releaseRequests: next.releaseRequests.map((item, index) =>
        index === next.releaseRequests.length - 1 ? { ...item, createdAt: event.timestamp } : item,
      ),
      approvalRequests: next.approvalRequests.map((item, index) =>
        index === next.approvalRequests.length - 1 ? { ...item, createdAt: event.timestamp } : item,
      ),
    };
  }
  if (after.approvalDecisions.length > before.approvalDecisions.length) {
    next = {
      ...next,
      approvalDecisions: next.approvalDecisions.map((item, index) =>
        index === next.approvalDecisions.length - 1 ? { ...item, createdAt: event.timestamp } : item,
      ),
    };
  }
  if (after.confirmations.length > before.confirmations.length) {
    const latestConfirmation = after.confirmations.at(-1);
    next = {
      ...next,
      confirmations: next.confirmations.map((item, index) =>
        index === next.confirmations.length - 1 ? { ...item, createdAt: event.timestamp } : item,
      ),
      contributionClaims: next.contributionClaims.map((item) =>
        latestConfirmation?.subjectType === 'contribution_claim' && item.id === latestConfirmation.subjectId
          ? { ...item, confirmedAt: event.timestamp }
          : item,
      ),
      releaseRequests: next.releaseRequests.map((item) =>
        latestConfirmation?.subjectType === 'release_request' && item.id === latestConfirmation.subjectId
          ? { ...item, confirmedAt: event.timestamp }
          : item,
      ),
    };
  }
  if (after.exceptions.length > before.exceptions.length) {
    next = {
      ...next,
      exceptions: next.exceptions.map((item, index) =>
        index === next.exceptions.length - 1 ? { ...item, createdAt: event.timestamp } : item,
      ),
    };
  }
  if (after.closeoutSnapshots.length > before.closeoutSnapshots.length) {
    next = {
      ...next,
      closedAt: event.timestamp,
      closeoutSnapshots: next.closeoutSnapshots.map((item, index) =>
        index === next.closeoutSnapshots.length - 1 ? { ...item, createdAt: event.timestamp } : item,
      ),
      exceptions: next.exceptions.map((item, index) =>
        index === next.exceptions.length - 1 && item.subjectType === 'chapter'
          ? { ...item, createdAt: event.timestamp }
          : item,
      ),
    };
  }
  if (event.action.type === 'claim_release') {
    const releaseRequestId = event.action.releaseRequestId;
    next = {
      ...next,
      releaseRequests: next.releaseRequests.map((item) =>
        item.id === releaseRequestId ? { ...item, claimedAt: event.timestamp } : item,
      ),
    };
  }
  return next;
}

function sharedNoteLooksSensitive(note: string | undefined): boolean {
  if (!note) return false;
  return /\b(iban|bank|account|medical|secret|seed|private key|phone|email|passport|address)\b|0x[a-f0-9]{8,}/i.test(note);
}

function assertDotSessionEventPrivacy(event: DotSessionEvent): void {
  const action = event.action;

  if (action.type === 'claim_contribution') {
    if (action.privatePayloadRef && action.assetHubReference) {
      throw new Error('Private payment reference must stay in the private payload sidecar');
    }
    if (action.privatePayloadRef && sharedNoteLooksSensitive(action.note)) {
      throw new Error('Private payment note must stay in the private payload sidecar');
    }
  }

  if (action.type === 'claim_release' && action.privatePayloadRef && action.assetHubReference) {
    throw new Error('Private release reference must stay in the private payload sidecar');
  }

  if (action.type === 'record_exception' && action.privatePayloadRef && sharedNoteLooksSensitive(action.note)) {
    throw new Error('Private exception note must stay in the private payload sidecar');
  }
}

export function applyDotSessionEvent(chapter: DotChapter, event: DotSessionEvent, options: DotSessionReplayOptions = {}): DotSessionReplayResult {
  if (event.chapterId !== chapter.id) {
    throw new Error('Session event belongs to a different chapter');
  }
  if (!verifyDotSessionEvent(event)) {
    throw new Error('Session event signature is invalid');
  }
  if (!chapter.participants.some((participant) => participant.id === event.participantId)) {
    throw new Error('Session event participant is unknown');
  }
  assertDotMembershipForEvent(chapter, event, options);
  assertDotSessionEventPrivacy(event);

  const before = chapter;
  let nextChapter = chapter;
  let receipt: DotReceipt | undefined;
  const assetHubReferences: DotAssetHubReference[] = [];
  const escrowEvidenceRefs: DotEscrowEvidenceReference[] = [];
  const privatePayloadRefs: DotPrivatePayloadRef[] = [];
  const savedReceiptRefs: DotReceiptArchiveRef[] = [];
  const closeoutProofRefs: DotCloseoutProofRef[] = [];

  switch (event.action.type) {
    case 'claim_contribution':
      if (event.action.assetHubReference) assetHubReferences.push(event.action.assetHubReference);
      if (event.action.privatePayloadRef) privatePayloadRefs.push(event.action.privatePayloadRef);
      nextChapter = claimDotContribution(chapter, {
        obligationId: event.action.obligationId,
        claimantId: event.participantId,
        note: event.action.note ?? 'Marked paid. Receiver still needs to confirm.',
        evidenceVisibility: chapter.mode === 'emergency_pot' ? 'organizer_operational' : 'counterparty_visible',
      });
      break;
    case 'confirm_contribution':
      nextChapter = confirmDotContributionClaim(chapter, {
        claimId: latestClaimId(chapter, event.action.obligationId),
        confirmerId: event.participantId,
      });
      break;
    case 'record_exception':
      if (event.action.privatePayloadRef) privatePayloadRefs.push(event.action.privatePayloadRef);
      nextChapter = recordDotException(chapter, {
        subjectType: event.action.subjectType,
        subjectId: event.action.subjectId,
        actorId: event.participantId,
        note: event.action.note,
        visibility: event.action.visibility ?? 'organizer_operational',
      });
      break;
    case 'create_release':
      nextChapter = createDotReleaseRequest(chapter, event.action.release);
      break;
    case 'approve_release': {
      const releaseRequestId = event.action.releaseRequestId;
      const approval = chapter.approvalRequests.find((item) => item.releaseRequestId === releaseRequestId);
      if (!approval) throw new Error('Approval request has not been prepared');
      nextChapter = decideDotApproval(chapter, {
        approvalRequestId: approval.id,
        approverId: event.participantId,
        decision: 'approved',
      });
      break;
    }
    case 'claim_release':
      if (event.action.assetHubReference) assetHubReferences.push(event.action.assetHubReference);
      if (event.action.privatePayloadRef) privatePayloadRefs.push(event.action.privatePayloadRef);
      nextChapter = claimDotRelease(chapter, {
        releaseRequestId: event.action.releaseRequestId || latestReleaseId(chapter),
        actorId: event.participantId,
      });
      break;
    case 'confirm_release':
      nextChapter = confirmDotRelease(chapter, {
        releaseRequestId: event.action.releaseRequestId || latestReleaseId(chapter),
        confirmerId: event.participantId,
      });
      break;
    case 'close_chapter':
      nextChapter = closeDotChapter(chapter, {
        actorId: event.participantId,
        allowOpenItems: event.action.allowOpenItems,
        annotation: event.action.annotation,
      });
      receipt = exportDotReceipt(nextChapter, { redaction: 'redacted' });
      break;
    case 'asset_hub_reference':
      assetHubReferences.push(event.action.reference);
      break;
    case 'escrow_evidence':
      escrowEvidenceRefs.push(event.action.reference);
      break;
    case 'save_receipt':
      savedReceiptRefs.push({
        receiptHash: event.action.receiptHash,
        storage: event.action.storage,
        cid: event.action.cid,
        blockNumber: event.action.blockNumber,
        extrinsicIndex: event.action.extrinsicIndex,
      });
      break;
    case 'anchor_receipt':
      closeoutProofRefs.push(event.action.proof);
      break;
    case 'transport_probe':
      break;
    default:
      event.action satisfies never;
  }

  return {
    chapter: normalizeCreatedTimes(before, nextChapter, event),
    receipt,
    assetHubReferences,
    escrowEvidenceRefs,
    privatePayloadRefs,
    savedReceiptRefs,
    closeoutProofRefs,
  };
}

export function reduceDotSessionEvents(initialChapter: DotChapter, events: DotSessionEvent[], options: DotSessionReplayOptions = {}): DotSessionReplayResult {
  let chapter = initialChapter;
  let previousHash = DOT_SESSION_GENESIS_HASH;
  let receipt: DotReceipt | undefined;
  const seenIds = new Set<string>();
  const seenHashes = new Set<string>();
  const assetHubReferences: DotAssetHubReference[] = [];
  const escrowEvidenceRefs: DotEscrowEvidenceReference[] = [];
  const privatePayloadRefs: DotPrivatePayloadRef[] = [];
  const savedReceiptRefs: DotReceiptArchiveRef[] = [];
  const closeoutProofRefs: DotCloseoutProofRef[] = [];

  for (const event of events) {
    const eventHash = dotSessionEventHash(event);
    if (seenIds.has(event.id) || seenHashes.has(eventHash)) {
      throw new Error('Duplicate session event');
    }
    if (event.previousEventHash !== previousHash) {
      throw new Error('Session event chain is out of order');
    }
    const result = applyDotSessionEvent(chapter, event, options);
    chapter = result.chapter;
    receipt = result.receipt ?? receipt;
    assetHubReferences.push(...result.assetHubReferences);
    escrowEvidenceRefs.push(...result.escrowEvidenceRefs);
    privatePayloadRefs.push(...result.privatePayloadRefs);
    savedReceiptRefs.push(...result.savedReceiptRefs);
    closeoutProofRefs.push(...result.closeoutProofRefs);
    seenIds.add(event.id);
    seenHashes.add(eventHash);
    previousHash = eventHash;
  }

  return { chapter, receipt, assetHubReferences, escrowEvidenceRefs, privatePayloadRefs, savedReceiptRefs, closeoutProofRefs };
}

function storageKey(chapterId: string): string {
  return `chopdot_dot_native_session:${chapterId}`;
}

function accessStorageKey(chapterId: string): string {
  return `chopdot_dot_native_access:${chapterId}`;
}

function readEventsFromStorage(chapterId: string): DotSessionEvent[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(chapterId));
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as DotSessionEvent[];
}

function writeEventsToStorage(chapterId: string, events: DotSessionEvent[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(chapterId), JSON.stringify(events));
}

function readAccessEventsFromStorage(chapterId: string): DotInviteAccessEvent[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(accessStorageKey(chapterId));
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as DotInviteAccessEvent[];
}

function writeAccessEventsToStorage(chapterId: string, events: DotInviteAccessEvent[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(accessStorageKey(chapterId), JSON.stringify(events));
}

export class LocalSignedSessionAdapter implements DotSessionTransportAdapter, DotInviteAccessTransportAdapter {
  readonly kind: string = 'local_signed_session';

  async loadEvents(chapterId: string): Promise<DotSessionEvent[]> {
    return readEventsFromStorage(chapterId);
  }

  async appendEvent(chapter: DotChapter, signer: DotSessionSigner, deviceId: string, action: DotSessionAction, options: DotSessionReplayOptions = {}): Promise<DotSessionEvent[]> {
    const events = await this.loadEvents(chapter.id);
    const previousEventHash = events.length ? dotSessionEventHash(events[events.length - 1] as DotSessionEvent) : DOT_SESSION_GENESIS_HASH;
    const event = await createDotSessionEventAsync({
      chapterId: chapter.id,
      participantId: signer.participantId,
      deviceId,
      action,
      previousEventHash,
      signer,
    });
    const nextEvents = [...events, event];
    applyDotSessionEvent(chapter, event, options);
    writeEventsToStorage(chapter.id, nextEvents);
    return nextEvents;
  }

  async loadAccessEvents(chapterId: string): Promise<DotInviteAccessEvent[]> {
    return readAccessEventsFromStorage(chapterId);
  }

  async appendAccessEvent(chapter: DotChapter, signer: DotSessionSigner, deviceId: string, action: DotInviteAccessAction): Promise<DotInviteAccessEvent[]> {
    const events = await this.loadAccessEvents(chapter.id);
    const previousEventHash = events.length ? dotInviteAccessEventHash(events[events.length - 1] as DotInviteAccessEvent) : DOT_SESSION_GENESIS_HASH;
    const event = await createDotInviteAccessEvent({
      chapterId: chapter.id,
      participantId: signer.participantId,
      deviceId,
      action,
      previousEventHash,
      signer,
    });
    const nextEvents = [...events, event];
    reduceDotInviteAccessEvents(chapter, nextEvents);
    writeAccessEventsToStorage(chapter.id, nextEvents);
    return nextEvents;
  }

  subscribe(chapterId: string, callback: (events: DotSessionEvent[]) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey(chapterId)) {
        callback(readEventsFromStorage(chapterId));
      }
    };
    const interval = window.setInterval(() => callback(readEventsFromStorage(chapterId)), 1500);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(interval);
    };
  }

  subscribeAccess(chapterId: string, callback: (events: DotInviteAccessEvent[]) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === accessStorageKey(chapterId)) {
        callback(readAccessEventsFromStorage(chapterId));
      }
    };
    const interval = window.setInterval(() => callback(readAccessEventsFromStorage(chapterId)), 1500);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(interval);
    };
  }
}

export class StatementStoreSessionAdapter implements DotSessionTransportAdapter, DotInviteAccessTransportAdapter {
  readonly kind = 'statement_store_lab';
  private readonly endpoint: string;
  private readonly sessionId: string;
  private readonly cache = new Map<string, DotSessionEvent[]>();

  constructor(endpoint = '/__chopdot_dot_statement_store', sessionId = 'default') {
    this.endpoint = endpoint;
    this.sessionId = sessionId;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (typeof fetch === 'undefined') {
      throw new Error('Statement Store transport is unavailable in this environment');
    }
    const response = await fetch(`${this.endpoint}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(body || `Statement Store transport failed with ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async loadEvents(chapterId: string): Promise<DotSessionEvent[]> {
    const result = await this.request<{ events: DotSessionEvent[] }>(
      `/events?chapterId=${encodeURIComponent(chapterId)}&sessionId=${encodeURIComponent(this.sessionId)}`,
    );
    this.cache.set(chapterId, result.events);
    return result.events;
  }

  async loadAccessEvents(chapterId: string): Promise<DotInviteAccessEvent[]> {
    const result = await this.request<{ events: DotInviteAccessEvent[] }>(
      `/access-events?chapterId=${encodeURIComponent(chapterId)}&sessionId=${encodeURIComponent(this.sessionId)}`,
    );
    return result.events;
  }

  async appendEvent(chapter: DotChapter, signer: DotSessionSigner, deviceId: string, action: DotSessionAction, options: DotSessionReplayOptions = {}): Promise<DotSessionEvent[]> {
    const events = await this.loadEvents(chapter.id);
    const previousEventHash = events.length ? dotSessionEventHash(events[events.length - 1] as DotSessionEvent) : DOT_SESSION_GENESIS_HASH;
    const event = await createDotSessionEventAsync({
      chapterId: chapter.id,
      participantId: signer.participantId,
      deviceId,
      action,
      previousEventHash,
      signer,
    });
    applyDotSessionEvent(chapter, event, options);
    const result = await this.request<{ events: DotSessionEvent[] }>('/append', {
      method: 'POST',
      body: JSON.stringify({ chapterId: chapter.id, sessionId: this.sessionId, event }),
    });
    this.cache.set(chapter.id, result.events);
    return result.events;
  }

  async appendAccessEvent(chapter: DotChapter, signer: DotSessionSigner, deviceId: string, action: DotInviteAccessAction): Promise<DotInviteAccessEvent[]> {
    const events = await this.loadAccessEvents(chapter.id);
    const previousEventHash = events.length ? dotInviteAccessEventHash(events[events.length - 1] as DotInviteAccessEvent) : DOT_SESSION_GENESIS_HASH;
    const event = await createDotInviteAccessEvent({
      chapterId: chapter.id,
      participantId: signer.participantId,
      deviceId,
      action,
      previousEventHash,
      signer,
    });
    reduceDotInviteAccessEvents(chapter, [...events, event]);
    try {
      const result = await this.request<{ events: DotInviteAccessEvent[] }>('/append-access', {
        method: 'POST',
        body: JSON.stringify({ chapterId: chapter.id, sessionId: this.sessionId, event }),
      });
      return result.events;
    } catch (error) {
      const latestEvents = await this.loadAccessEvents(chapter.id);
      const matchingEvent = latestEvents.find(
        (candidate) => candidate.id === event.id && dotInviteAccessEventHash(candidate) === dotInviteAccessEventHash(event),
      );
      if (matchingEvent) {
        reduceDotInviteAccessEvents(chapter, latestEvents);
        return latestEvents;
      }
      throw error;
    }
  }

  subscribe(chapterId: string, callback: (events: DotSessionEvent[]) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    let cancelled = false;
    let lastSnapshot = stableStringify(this.cache.get(chapterId) ?? []);

    const refresh = async () => {
      try {
        const events = await this.loadEvents(chapterId);
        const snapshot = stableStringify(events);
        if (!cancelled && snapshot !== lastSnapshot) {
          lastSnapshot = snapshot;
          callback(events);
        }
      } catch {
        if (!cancelled) callback(this.cache.get(chapterId) ?? []);
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }

  subscribeAccess(chapterId: string, callback: (events: DotInviteAccessEvent[]) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    let cancelled = false;
    let lastSnapshot = stableStringify([]);

    const refresh = async () => {
      try {
        const events = await this.loadAccessEvents(chapterId);
        const snapshot = stableStringify(events);
        if (!cancelled && snapshot !== lastSnapshot) {
          lastSnapshot = snapshot;
          callback(events);
        }
      } catch {
        // Access refresh failures are surfaced by later action attempts.
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }
}

export type ProductSdkStatementStoreSessionAdapterOptions = {
  appName?: string;
  ttlSeconds?: number;
  accountPrefix?: number;
  shouldAttemptHost?: () => boolean;
  clientFactory?: () => ProductSdkStatementStoreClientLike | Promise<ProductSdkStatementStoreClientLike>;
};

type ProductSdkStatementStoreClientLike = {
  connect(credentials: ConnectionCredentials): Promise<void>;
  publish<T>(data: T, options?: PublishOptions): Promise<boolean>;
  subscribe<T>(
    callback: (statement: ReceivedStatement<T>) => void,
    options?: { topic2?: string },
  ): Unsubscribable;
  query?<T>(options?: { topic2?: string }): Promise<Array<ReceivedStatement<T>>>;
  isConnected?(): boolean;
  destroy(): void;
};

type DotStatementStoreSessionPayload = {
  v: 1;
  k: 'session';
  i: string;
  p: string;
  d: string;
  a: DotSessionAction;
  h: string;
  t: string;
  sa: string;
  ss?: DotSessionSignatureScheme;
  src?: DotSessionSignerSource;
  s: string;
};

type DotStatementStoreAccessPayload = {
  v: 1;
  k: 'access';
  i: string;
  p: string;
  d: string;
  a: DotInviteAccessAction;
  h: string;
  t: string;
  sa: string;
  ss?: DotSessionSignatureScheme;
  src?: DotSessionSignerSource;
  s: string;
};

type DotStatementStorePayload = DotStatementStoreSessionPayload | DotStatementStoreAccessPayload;

const STATEMENT_STORE_MAX_PAYLOAD_BYTES = 512;

function statementPayloadSize(payload: DotStatementStorePayload): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

function assertStatementPayloadFits(payload: DotStatementStorePayload): void {
  const size = statementPayloadSize(payload);
  if (size > STATEMENT_STORE_MAX_PAYLOAD_BYTES) {
    throw new Error(`Statement Store event payload too large: ${size} bytes exceeds ${STATEMENT_STORE_MAX_PAYLOAD_BYTES}`);
  }
}

function sessionEventToStatementPayload(event: DotSessionEvent): DotStatementStoreSessionPayload {
  const payload: DotStatementStoreSessionPayload = {
    v: 1,
    k: 'session',
    i: event.id,
    p: event.participantId,
    d: event.deviceId,
    a: event.action,
    h: event.previousEventHash,
    t: event.timestamp,
    sa: event.signerAddress,
    ss: event.signatureScheme,
    src: event.signerSource,
    s: event.signature,
  };
  assertStatementPayloadFits(payload);
  return payload;
}

function statementPayloadToSessionEvent(chapterId: string, payload: DotStatementStoreSessionPayload): DotSessionEvent {
  return {
    id: payload.i,
    chapterId,
    participantId: payload.p,
    deviceId: payload.d,
    action: payload.a,
    previousEventHash: payload.h,
    timestamp: payload.t,
    signerAddress: payload.sa,
    signatureScheme: payload.ss,
    signerSource: payload.src,
    signature: payload.s,
  };
}

function inviteAccessEventToStatementPayload(event: DotInviteAccessEvent): DotStatementStoreAccessPayload {
  const payload: DotStatementStoreAccessPayload = {
    v: 1,
    k: 'access',
    i: event.id,
    p: event.participantId,
    d: event.deviceId,
    a: event.action,
    h: event.previousEventHash,
    t: event.timestamp,
    sa: event.signerAddress,
    ss: event.signatureScheme,
    src: event.signerSource,
    s: event.signature,
  };
  assertStatementPayloadFits(payload);
  return payload;
}

function statementPayloadToInviteAccessEvent(chapterId: string, payload: DotStatementStoreAccessPayload): DotInviteAccessEvent {
  return {
    id: payload.i,
    chapterId,
    participantId: payload.p,
    deviceId: payload.d,
    action: payload.a,
    previousEventHash: payload.h,
    timestamp: payload.t,
    signerAddress: payload.sa,
    signatureScheme: payload.ss,
    signerSource: payload.src,
    signature: payload.s,
  };
}

function orderDotSessionEventChain(events: DotSessionEvent[]): DotSessionEvent[] {
  const remaining = [...events];
  const ordered: DotSessionEvent[] = [];
  let previousHash = DOT_SESSION_GENESIS_HASH;

  while (remaining.length > 0) {
    const nextIndex = remaining.findIndex((event) => event.previousEventHash === previousHash);
    if (nextIndex === -1) break;
    const [next] = remaining.splice(nextIndex, 1);
    if (!next) break;
    ordered.push(next);
    previousHash = dotSessionEventHash(next);
  }

  return [
    ...ordered,
    ...remaining.sort((left, right) =>
      left.timestamp === right.timestamp
        ? dotSessionEventHash(left).localeCompare(dotSessionEventHash(right))
        : left.timestamp.localeCompare(right.timestamp),
    ),
  ];
}

function orderDotInviteAccessEventChain(events: DotInviteAccessEvent[]): DotInviteAccessEvent[] {
  const remaining = [...events];
  const ordered: DotInviteAccessEvent[] = [];
  let previousHash = DOT_SESSION_GENESIS_HASH;

  while (remaining.length > 0) {
    const nextIndex = remaining.findIndex((event) => event.previousEventHash === previousHash);
    if (nextIndex === -1) break;
    const [next] = remaining.splice(nextIndex, 1);
    if (!next) break;
    ordered.push(next);
    previousHash = dotInviteAccessEventHash(next);
  }

  return [
    ...ordered,
    ...remaining.sort((left, right) =>
      left.timestamp === right.timestamp
        ? dotInviteAccessEventHash(left).localeCompare(dotInviteAccessEventHash(right))
        : left.timestamp.localeCompare(right.timestamp),
    ),
  ];
}

export class ProductSdkStatementStoreSessionAdapter implements DotSessionTransportAdapter, DotInviteAccessTransportAdapter {
  readonly kind = 'product_sdk_statement_store_required';
  private readonly appName: string;
  private readonly ttlSeconds: number;
  private readonly accountPrefix: number;
  private readonly shouldAttemptHost: () => boolean;
  private readonly clientFactory?: ProductSdkStatementStoreSessionAdapterOptions['clientFactory'];
  private client: ProductSdkStatementStoreClientLike | null = null;
  private connected = false;
  private readonly sessionCache = new Map<string, DotSessionEvent[]>();
  private readonly accessCache = new Map<string, DotInviteAccessEvent[]>();
  private readonly subscriptions = new Map<string, Unsubscribable>();

  constructor(options: ProductSdkStatementStoreSessionAdapterOptions = {}) {
    this.appName = options.appName ?? 'chopdot-dot-session';
    this.ttlSeconds = options.ttlSeconds ?? 3600;
    this.accountPrefix = options.accountPrefix ?? 42;
    this.shouldAttemptHost = options.shouldAttemptHost ?? likelyInsideProductHost;
    this.clientFactory = options.clientFactory;
  }

  private assertHostAttemptAllowed(): void {
    if (!this.shouldAttemptHost()) {
      throw new Error('Product SDK Statement Store host transport is unavailable in this browser context');
    }
  }

  private async ensureClient(): Promise<ProductSdkStatementStoreClientLike> {
    this.assertHostAttemptAllowed();
    if (this.client) return this.client;
    if (this.clientFactory) {
      this.client = await this.clientFactory();
      return this.client;
    }
    const { StatementStoreClient } = await loadProductSdkStatementStore();
    this.client = new StatementStoreClient({
      appName: this.appName,
      defaultTtlSeconds: this.ttlSeconds,
    });
    return this.client;
  }

  private async ensureConnected(signer: DotSessionSigner): Promise<ProductSdkStatementStoreClientLike> {
    const client = await this.ensureClient();
    if (!this.connected && !client.isConnected?.()) {
      await client.connect({
        mode: 'host',
        accountId: [signer.signerAddress, this.accountPrefix],
      });
      this.connected = true;
    }
    return client;
  }

  private topicForChapter(chapterId: string): string {
    return `chapter:${chapterId}`;
  }

  private async queryPayloads(chapterId: string): Promise<DotStatementStorePayload[]> {
    const client = await this.ensureClient();
    if (!this.connected && !client.isConnected?.()) {
      throw new Error('Product SDK Statement Store host transport needs a signed append before load in this build');
    }
    const query = client.query;
    if (!query) {
      return [];
    }
    const statements = await query<DotStatementStorePayload>({ topic2: this.topicForChapter(chapterId) });
    return statements.map((statement) => statement.data);
  }

  private mergeSessionEvents(chapterId: string, nextEvents: DotSessionEvent[]): DotSessionEvent[] {
    const current = this.sessionCache.get(chapterId) ?? [];
    const byHash = new Map(current.map((event) => [dotSessionEventHash(event), event]));
    for (const event of nextEvents) {
      byHash.set(dotSessionEventHash(event), event);
    }
    const ordered = orderDotSessionEventChain([...byHash.values()]);
    this.sessionCache.set(chapterId, ordered);
    return ordered;
  }

  private mergeAccessEvents(chapterId: string, nextEvents: DotInviteAccessEvent[]): DotInviteAccessEvent[] {
    const current = this.accessCache.get(chapterId) ?? [];
    const byHash = new Map(current.map((event) => [dotInviteAccessEventHash(event), event]));
    for (const event of nextEvents) {
      byHash.set(dotInviteAccessEventHash(event), event);
    }
    const ordered = orderDotInviteAccessEventChain([...byHash.values()]);
    this.accessCache.set(chapterId, ordered);
    return ordered;
  }

  async loadEvents(chapterId: string): Promise<DotSessionEvent[]> {
    const payloads = await this.queryPayloads(chapterId);
    const events = payloads
      .filter((payload): payload is DotStatementStoreSessionPayload => payload.v === 1 && payload.k === 'session')
      .map((payload) => statementPayloadToSessionEvent(chapterId, payload));
    return this.mergeSessionEvents(chapterId, events);
  }

  async appendEvent(
    chapter: DotChapter,
    signer: DotSessionSigner,
    deviceId: string,
    action: DotSessionAction,
    options: DotSessionReplayOptions = {},
  ): Promise<DotSessionEvent[]> {
    const client = await this.ensureConnected(signer);
    const events = await this.loadEvents(chapter.id).catch(() => this.sessionCache.get(chapter.id) ?? []);
    const previousEventHash = events.length ? dotSessionEventHash(events[events.length - 1] as DotSessionEvent) : DOT_SESSION_GENESIS_HASH;
    const event = await createDotSessionEventAsync({
      chapterId: chapter.id,
      participantId: signer.participantId,
      deviceId,
      action,
      previousEventHash,
      signer,
    });
    applyDotSessionEvent(chapter, event, options);
    const accepted = await client.publish(sessionEventToStatementPayload(event), {
      topic2: this.topicForChapter(chapter.id),
      channel: `session/${chapter.id}/${event.id}`,
      ttlSeconds: this.ttlSeconds,
    });
    if (!accepted) {
      throw new Error('Product SDK Statement Store rejected session event publish');
    }
    this.mergeSessionEvents(chapter.id, [event]);
    return this.loadEvents(chapter.id);
  }

  async loadAccessEvents(chapterId: string): Promise<DotInviteAccessEvent[]> {
    const payloads = await this.queryPayloads(chapterId);
    const events = payloads
      .filter((payload): payload is DotStatementStoreAccessPayload => payload.v === 1 && payload.k === 'access')
      .map((payload) => statementPayloadToInviteAccessEvent(chapterId, payload));
    return this.mergeAccessEvents(chapterId, events);
  }

  async appendAccessEvent(
    chapter: DotChapter,
    signer: DotSessionSigner,
    deviceId: string,
    action: DotInviteAccessAction,
  ): Promise<DotInviteAccessEvent[]> {
    const client = await this.ensureConnected(signer);
    const events = await this.loadAccessEvents(chapter.id).catch(() => this.accessCache.get(chapter.id) ?? []);
    const previousEventHash = events.length ? dotInviteAccessEventHash(events[events.length - 1] as DotInviteAccessEvent) : DOT_SESSION_GENESIS_HASH;
    const event = await createDotInviteAccessEvent({
      chapterId: chapter.id,
      participantId: signer.participantId,
      deviceId,
      action,
      previousEventHash,
      signer,
    });
    reduceDotInviteAccessEvents(chapter, [...events, event]);
    const accepted = await client.publish(inviteAccessEventToStatementPayload(event), {
      topic2: this.topicForChapter(chapter.id),
      channel: `access/${chapter.id}/${event.id}`,
      ttlSeconds: this.ttlSeconds,
    });
    if (!accepted) {
      throw new Error('Product SDK Statement Store rejected access event publish');
    }
    this.mergeAccessEvents(chapter.id, [event]);
    return this.loadAccessEvents(chapter.id);
  }

  subscribe(chapterId: string, callback: (events: DotSessionEvent[]) => void): () => void {
    void this.ensureClient()
      .then((client) => {
        const subscription = client.subscribe<DotStatementStorePayload>((statement) => {
          const payload = statement.data;
          if (payload.v !== 1 || payload.k !== 'session') return;
          callback(this.mergeSessionEvents(chapterId, [statementPayloadToSessionEvent(chapterId, payload)]));
        }, { topic2: this.topicForChapter(chapterId) });
        this.subscriptions.set(`session:${chapterId}`, subscription);
      })
      .catch(() => undefined);
    return () => {
      this.subscriptions.get(`session:${chapterId}`)?.unsubscribe();
      this.subscriptions.delete(`session:${chapterId}`);
    };
  }

  subscribeAccess(chapterId: string, callback: (events: DotInviteAccessEvent[]) => void): () => void {
    void this.ensureClient()
      .then((client) => {
        const subscription = client.subscribe<DotStatementStorePayload>((statement) => {
          const payload = statement.data;
          if (payload.v !== 1 || payload.k !== 'access') return;
          callback(this.mergeAccessEvents(chapterId, [statementPayloadToInviteAccessEvent(chapterId, payload)]));
        }, { topic2: this.topicForChapter(chapterId) });
        this.subscriptions.set(`access:${chapterId}`, subscription);
      })
      .catch(() => undefined);
    return () => {
      this.subscriptions.get(`access:${chapterId}`)?.unsubscribe();
      this.subscriptions.delete(`access:${chapterId}`);
    };
  }

  destroy(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    this.client?.destroy();
    this.client = null;
    this.connected = false;
  }
}

export type ProductSdkPrivatePayloadAdapterOptions = {
  chapterId: string;
  key?: Uint8Array;
};

export class ProductSdkPrivatePayloadAdapter implements DotPrivatePayloadAdapter {
  readonly kind = 'product_sdk_crypto_private_payload';
  private readonly chapterId: string;
  private readonly key: Uint8Array;

  constructor(options: ProductSdkPrivatePayloadAdapterOptions) {
    this.chapterId = options.chapterId;
    this.key = options.key ?? demoPrivatePayloadKey(options.chapterId);
  }

  async encryptPayload(input: DotPrivatePayloadInput): Promise<DotPrivatePayloadRef> {
    const payload = stableStringify(input.payload);
    const { xchachaEncryptText } = await loadProductSdkCrypto();
    const encrypted = xchachaEncryptText(payload, this.key);
    return {
      id: `private_payload_${this.chapterId}_${input.subjectId}_${input.kind}_${blake2AsHex(payload, 128).slice(2, 10)}`,
      subjectId: input.subjectId,
      kind: input.kind,
      visibility: input.visibility,
      recipients: input.recipients,
      algorithm: 'product_sdk_crypto_xchacha20_poly1305',
      payloadHash: blake2AsHex(payload, 256),
      ciphertextHex: u8aToHex(encrypted.ciphertext),
      nonceHex: u8aToHex(encrypted.nonce),
    };
  }

  async decryptPayload(ref: DotPrivatePayloadRef): Promise<unknown> {
    if (ref.algorithm !== 'product_sdk_crypto_xchacha20_poly1305') {
      throw new Error(`Unsupported private payload algorithm: ${ref.algorithm}`);
    }
    const { xchachaDecryptText } = await loadProductSdkCrypto();
    const payload = xchachaDecryptText(hexToU8a(ref.ciphertextHex), this.key, hexToU8a(ref.nonceHex));
    if (blake2AsHex(payload, 256) !== ref.payloadHash) {
      throw new Error('Private payload hash mismatch');
    }
    return JSON.parse(payload) as unknown;
  }
}

export function demoPrivatePayloadKey(chapterId: string): Uint8Array {
  return hexToU8a(blake2AsHex(`chopdot-dot-private-payload:${chapterId}`, 256));
}

export class BulletinReceiptAdapter implements DotReceiptArchiveAdapter {
  readonly kind = 'bulletin_receipt_lab';
  private readonly receipts = new Map<string, DotReceipt>();

  saveReceipt(receipt: DotReceipt): DotReceiptArchiveRef {
    const receiptHash = blake2AsHex(stableStringify(receipt), 256);
    this.receipts.set(receiptHash, receipt);
    return {
      receiptHash,
      storage: 'bulletin_lab',
    };
  }

  loadReceipt(ref: DotReceiptArchiveRef): DotReceipt {
    const receipt = this.receipts.get(ref.receiptHash);
    if (!receipt) {
      throw new Error('Bulletin lab receipt is unavailable');
    }
    return receipt;
  }
}

export type ProductSdkCloudStorageReceiptAdapterOptions = {
  fallback?: DotReceiptArchiveAdapter;
  shouldAttemptCloudStorage?: () => boolean;
  requireCloudStorage?: boolean;
  getPolkadotSigner?: () => Promise<unknown>;
  environment?: 'paseo' | 'summit';
  storeReceipt?: (payload: Uint8Array) => Promise<{ cid?: string; blockNumber?: number; extrinsicIndex?: number }>;
  retrieveReceipt?: (ref: DotReceiptArchiveRef) => Promise<DotReceipt>;
};

export class ProductSdkCloudStorageReceiptAdapter implements DotReceiptArchiveAdapter {
  readonly kind = 'product_sdk_cloud_storage_receipt';
  private readonly fallback: DotReceiptArchiveAdapter;
  private readonly shouldAttemptCloudStorage: () => boolean;
  private readonly requireCloudStorage: boolean;
  private readonly getPolkadotSigner?: () => Promise<unknown>;
  private readonly environment: 'paseo' | 'summit';
  private readonly storeReceiptOverride?: (payload: Uint8Array) => Promise<{ cid?: string; blockNumber?: number; extrinsicIndex?: number }>;
  private readonly retrieveReceiptOverride?: (ref: DotReceiptArchiveRef) => Promise<DotReceipt>;

  constructor(options: ProductSdkCloudStorageReceiptAdapterOptions = {}) {
    this.fallback = options.fallback ?? new BulletinReceiptAdapter();
    this.shouldAttemptCloudStorage = options.shouldAttemptCloudStorage ?? likelyInsideProductHost;
    this.requireCloudStorage = options.requireCloudStorage ?? false;
    this.getPolkadotSigner = options.getPolkadotSigner;
    this.environment = options.environment ?? 'paseo';
    this.storeReceiptOverride = options.storeReceipt;
    this.retrieveReceiptOverride = options.retrieveReceipt;
  }

  async saveReceipt(receipt: DotReceipt): Promise<DotReceiptArchiveRef> {
    const receiptHash = blake2AsHex(stableStringify(receipt), 256);
    if (!this.shouldAttemptCloudStorage()) {
      if (this.requireCloudStorage) {
        throw new Error('Product SDK Cloud Storage host archive is unavailable in this browser context');
      }
      return this.fallback.saveReceipt(receipt);
    }
    try {
      const payload = stringToU8a(stableStringify(receipt));
      const stored = this.storeReceiptOverride
        ? await this.storeReceiptOverride(payload)
        : await this.storeWithProductSdk(payload);
      return {
        receiptHash,
        storage: 'product_sdk_cloud_storage',
        cid: stored.cid,
        blockNumber: stored.blockNumber,
        extrinsicIndex: stored.extrinsicIndex,
      };
    } catch (error) {
      if (this.requireCloudStorage) {
        throw error;
      }
      return this.fallback.saveReceipt(receipt);
    }
  }

  async loadReceipt(ref: DotReceiptArchiveRef): Promise<DotReceipt> {
    if (ref.storage !== 'product_sdk_cloud_storage') {
      return this.fallback.loadReceipt(ref);
    }
    if (!this.shouldAttemptCloudStorage()) {
      if (this.requireCloudStorage) {
        throw new Error('Product SDK Cloud Storage host archive retrieval is unavailable in this browser context');
      }
      return this.fallback.loadReceipt(ref);
    }
    try {
      const receipt = this.retrieveReceiptOverride
        ? await this.retrieveReceiptOverride(ref)
        : await this.retrieveWithProductSdk(ref);
      const receiptHash = blake2AsHex(stableStringify(receipt), 256);
      if (receiptHash !== ref.receiptHash) {
        throw new Error('Receipt archive retrieval hash mismatch');
      }
      return receipt;
    } catch (error) {
      if (this.requireCloudStorage) {
        throw error;
      }
      return this.fallback.loadReceipt(ref);
    }
  }

  private async storeWithProductSdk(payload: Uint8Array): Promise<{ cid?: string; blockNumber?: number; extrinsicIndex?: number }> {
    const signer = await this.getPolkadotSigner?.();
    if (!signer) throw new Error('Cloud Storage requires a Polkadot signer');
    const { CloudStorageClient } = await loadProductSdkCloudStorage();
    const client = await CloudStorageClient.create({ environment: this.environment, signer: signer as never });
    const result = await client.store(payload).send();
    return {
      cid: result.cid?.toString(),
      blockNumber: result.blockNumber,
      extrinsicIndex: result.extrinsicIndex,
    };
  }

  private async retrieveWithProductSdk(_ref: DotReceiptArchiveRef): Promise<DotReceipt> {
    throw new Error('Product SDK Cloud Storage receipt retrieval is not wired in this build');
  }
}

export class AssetHubReferenceAdapter implements DotAssetHubEvidenceAdapter {
  readonly kind = 'asset_hub_reference_lab';

  finalizedReference(input: Omit<DotAssetHubReference, 'lifecycle'>): DotAssetHubReference {
    return { ...input, lifecycle: 'finalized' };
  }

  evidenceForClaim(input: DotAssetHubEvidenceInput): DotAssetHubReference {
    return this.finalizedReference(input);
  }
}

export type ProductSdkAssetHubEvidenceAdapterOptions = {
  fallback?: DotAssetHubEvidenceAdapter;
  shouldAttemptProductSdkTx?: () => boolean;
  requireProductSdkTx?: boolean;
  waitFor?: 'best-block' | 'finalized';
  submitTx?: (input: DotAssetHubEvidenceInput, onStatus: (status: string) => void) => Promise<{
    txHash: string;
    ok?: boolean;
    block?: { number?: number; index?: number };
  }>;
};

export class ProductSdkAssetHubEvidenceAdapter implements DotAssetHubEvidenceAdapter {
  readonly kind = 'product_sdk_asset_hub_evidence';
  private readonly fallback: DotAssetHubEvidenceAdapter;
  private readonly shouldAttemptProductSdkTx: () => boolean;
  private readonly requireProductSdkTx: boolean;
  private readonly waitFor: 'best-block' | 'finalized';
  private readonly submitTxOverride?: ProductSdkAssetHubEvidenceAdapterOptions['submitTx'];

  constructor(options: ProductSdkAssetHubEvidenceAdapterOptions = {}) {
    this.fallback = options.fallback ?? new AssetHubReferenceAdapter();
    this.shouldAttemptProductSdkTx = options.shouldAttemptProductSdkTx ?? likelyInsideProductHost;
    this.requireProductSdkTx = options.requireProductSdkTx ?? false;
    this.waitFor = options.waitFor ?? 'finalized';
    this.submitTxOverride = options.submitTx;
  }

  async evidenceForClaim(input: DotAssetHubEvidenceInput): Promise<DotAssetHubReference> {
    if (!this.shouldAttemptProductSdkTx()) {
      if (this.requireProductSdkTx) {
        throw new Error('Product SDK tx evidence host path is unavailable in this browser context');
      }
      return this.fallback.evidenceForClaim(input);
    }

    if (!input.tx || !input.signer) {
      if (this.requireProductSdkTx) {
        throw new Error('Product SDK tx evidence requires a tx and signer');
      }
      return this.fallback.evidenceForClaim(input);
    }

    let latestLifecycle: DotAssetHubReference['lifecycle'] = 'signing';
    const onStatus = (status: string) => {
      latestLifecycle = productSdkTxStatusToLifecycle(status);
    };

    try {
      const result = this.submitTxOverride
        ? await this.submitTxOverride(input, onStatus)
        : await this.submitWithProductSdk(input, onStatus);

      return {
        subjectId: input.subjectId,
        txHash: result.txHash,
        lifecycle: result.ok === false ? 'failed' : latestLifecycle,
        amount: input.amount,
        currency: input.currency,
        blockNumber: result.block?.number,
        extrinsicIndex: result.block?.index,
      };
    } catch (error) {
      if (this.requireProductSdkTx) throw error;
      return {
        subjectId: input.subjectId,
        txHash: input.txHash,
        lifecycle: 'failed',
        amount: input.amount,
        currency: input.currency,
      };
    }
  }

  private async submitWithProductSdk(input: DotAssetHubEvidenceInput, onStatus: (status: string) => void): Promise<{
    txHash: string;
    ok?: boolean;
    block?: { number?: number; index?: number };
  }> {
    if (!input.tx || !input.signer) throw new Error('Product SDK tx evidence requires a tx and signer');
    const { submitAndWatch } = await loadProductSdkTx();
    return submitAndWatch(input.tx as never, input.signer as never, {
      waitFor: this.waitFor,
      onStatus,
    });
  }
}

function productSdkTxStatusToLifecycle(status: string): DotAssetHubReference['lifecycle'] {
  switch (status) {
    case 'signing':
      return 'signing';
    case 'broadcasting':
      return 'broadcasting';
    case 'in-block':
      return 'in_block';
    case 'finalized':
      return 'finalized';
    case 'error':
      return 'failed';
    default:
      return 'broadcasting';
  }
}

export class ProofAnchorAdapter implements DotCloseoutProofAdapter {
  readonly kind = 'proof_anchor_lab';

  hashOnly(receipt: DotReceipt): string {
    return blake2AsHex(stableStringify({ chapterId: receipt.chapterId, summary: receipt.summary, blockers: receipt.blockers }), 256);
  }

  anchorReceipt(receipt: DotReceipt): DotCloseoutProofRef {
    return {
      receiptHash: blake2AsHex(stableStringify(receipt), 256),
      anchorHash: this.hashOnly(receipt),
      storage: 'hash_only_lab',
    };
  }
}

function assertAssetHubEvidenceMatches(reference: DotAssetHubReference, expected: DotAssetHubEvidenceInput): void {
  if (reference.lifecycle !== 'finalized') {
    throw new Error('Asset Hub evidence did not reach finalized host state');
  }
  if (!reference.txHash) {
    throw new Error('Asset Hub evidence did not return a transaction hash');
  }
  if (reference.subjectId !== expected.subjectId) {
    throw new Error('Asset Hub evidence subject does not match the claim');
  }
  if (reference.amount !== expected.amount || reference.currency !== expected.currency) {
    throw new Error('Asset Hub evidence amount or currency does not match the claim');
  }
}

export type ProductSdkCloseoutProofAdapterOptions = {
  fallback?: DotCloseoutProofAdapter;
  shouldAttemptHostProof?: () => boolean;
  requireHostProof?: boolean;
  submitAnchor?: (receipt: DotReceipt, anchorHash: string) => Promise<{
    txHash: string;
    lifecycle?: DotAssetHubReference['lifecycle'];
    blockNumber?: number;
    extrinsicIndex?: number;
  }>;
};

export class ProductSdkCloseoutProofAdapter implements DotCloseoutProofAdapter {
  readonly kind = 'product_sdk_closeout_proof_anchor';
  private readonly fallback: DotCloseoutProofAdapter;
  private readonly shouldAttemptHostProof: () => boolean;
  private readonly requireHostProof: boolean;
  private readonly submitAnchorOverride?: ProductSdkCloseoutProofAdapterOptions['submitAnchor'];

  constructor(options: ProductSdkCloseoutProofAdapterOptions = {}) {
    this.fallback = options.fallback ?? new ProofAnchorAdapter();
    this.shouldAttemptHostProof = options.shouldAttemptHostProof ?? likelyInsideProductHost;
    this.requireHostProof = options.requireHostProof ?? false;
    this.submitAnchorOverride = options.submitAnchor;
  }

  async anchorReceipt(receipt: DotReceipt): Promise<DotCloseoutProofRef> {
    const receiptHash = blake2AsHex(stableStringify(receipt), 256);
    const anchorHash = blake2AsHex(stableStringify({ chapterId: receipt.chapterId, summary: receipt.summary, blockers: receipt.blockers }), 256);
    if (!this.shouldAttemptHostProof()) {
      if (this.requireHostProof) {
        throw new Error('Product SDK closeout proof host anchor is unavailable in this browser context');
      }
      return this.fallback.anchorReceipt(receipt);
    }
    if (!this.submitAnchorOverride) {
      if (this.requireHostProof) {
        throw new Error('Product SDK closeout proof host anchor requires a host submitter');
      }
      return this.fallback.anchorReceipt(receipt);
    }
    try {
      const anchored = await this.submitAnchorOverride(receipt, anchorHash);
      return {
        receiptHash,
        anchorHash,
        storage: 'product_sdk_tx_anchor',
        txHash: anchored.txHash,
        lifecycle: anchored.lifecycle ?? 'finalized',
        blockNumber: anchored.blockNumber,
        extrinsicIndex: anchored.extrinsicIndex,
      };
    } catch (error) {
      if (this.requireHostProof) throw error;
      return this.fallback.anchorReceipt(receipt);
    }
  }
}

async function preflightGate(
  result: Omit<DotNativeHostPreflightResult, 'status' | 'detail'>,
  check: () => Promise<string>,
): Promise<DotNativeHostPreflightResult> {
  try {
    return {
      ...result,
      status: 'pass',
      detail: await check(),
    };
  } catch (error) {
    return {
      ...result,
      status: 'fail',
      detail: error instanceof Error ? error.message : 'Host gate failed.',
    };
  }
}

export async function runDotNativeHostPreflight(input: DotNativeHostPreflightInput): Promise<DotNativeHostPreflightResult[]> {
  const obligation = input.chapter.obligations[0];
  const defaultEvidenceInput: DotAssetHubEvidenceInput = input.assetHubEvidenceInput ?? {
    subjectId: obligation?.id ?? input.chapter.id,
    txHash: `preflight-${input.chapter.id}`,
    amount: obligation?.amount ?? 0,
    currency: obligation?.currency === 'DOT' ? 'TEST_DOT' : obligation?.currency === 'USDC' ? 'TEST_USDC' : 'TEST_USD',
  };

  return Promise.all([
    preflightGate(
      {
        id: 'identity',
        label: 'Product Account signing',
        adapterKind: input.signerAdapter.kind,
      },
      async () => {
        const participantIds = input.requireDistinctParticipantSigners
          ? Array.from(
              new Set([
                input.participantId,
                ...(input.identityParticipantIds?.length ? input.identityParticipantIds : input.chapter.participants.map((participant) => participant.id)),
              ]),
            )
          : [input.participantId];
        const signers = await Promise.all(
          participantIds.map(async (participantId) => ({
            participantId,
            signer: await input.signerAdapter.getSigner(participantId),
          })),
        );

        for (const { participantId, signer } of signers) {
          if (signer.signatureScheme !== 'polkadot-raw' || signer.signerSource !== 'product_account_host') {
            throw new Error('Product Account host signer did not return a host-backed Polkadot signature path');
          }
          if (input.requireMembershipGrant) {
            const matchingGrant = input.membershipGrants?.find(
              (grant) =>
                grant.chapterId === input.chapter.id &&
                grant.participantId === participantId &&
                grant.signerAddress === signer.signerAddress,
            );
            if (!matchingGrant) {
              throw new Error('Product Account host signer has no membership grant for this participant');
            }
            if (!verifyDotMembershipGrant(input.chapter, matchingGrant, input.now)) {
              throw new Error('Product Account host signer membership grant is invalid, expired, or revoked');
            }
          }
        }

        if (input.requireDistinctParticipantSigners && signers.length > 1) {
          const uniqueSignerAddresses = new Set(signers.map(({ signer }) => signer.signerAddress));
          if (uniqueSignerAddresses.size !== signers.length) {
            throw new Error('Product Account host signer returned the same address for multiple participants');
          }
        }

        return input.requireDistinctParticipantSigners
          ? `Host signers ready for ${signers.length} participants`
          : `Host signer ready for ${input.participantId}`;
      },
    ),
    preflightGate(
      {
        id: 'transport',
        label: 'Statement Store transport',
        adapterKind: input.transportAdapter.kind,
      },
      async () => {
        const probeAction: DotSessionAction = {
          type: 'transport_probe',
          probeId: `preflight_${input.chapter.id}_${input.deviceId}`,
          issuedAt: input.now ?? new Date().toISOString(),
        };
        const probeSigner = getDemoDotSessionSigner(input.participantId);
        const appendedEvents = await input.transportAdapter.appendEvent(input.chapter, probeSigner, input.deviceId, probeAction);
        const appendedProbe = appendedEvents.find(
          (event) => event.action.type === 'transport_probe' && event.action.probeId === probeAction.probeId,
        );
        if (!appendedProbe) {
          throw new Error('Statement Store transport append did not return the preflight probe event');
        }
        reduceDotSessionEvents(input.chapter, appendedEvents);

        const loadedEvents = await input.transportAdapter.loadEvents(input.chapter.id);
        const probeHash = dotSessionEventHash(appendedProbe);
        const loadedProbe = loadedEvents.find((event) => dotSessionEventHash(event) === probeHash);
        if (!loadedProbe) {
          throw new Error('Statement Store transport load did not return the preflight probe event');
        }
        reduceDotSessionEvents(input.chapter, loadedEvents);
        return `Host transport appended, loaded, and replayed ${loadedEvents.length} event(s)`;
      },
    ),
    preflightGate(
      {
        id: 'archive',
        label: 'Bulletin/cloud receipt archive',
        adapterKind: input.receiptAdapter.kind,
      },
      async () => {
        const saved = await input.receiptAdapter.saveReceipt(input.receipt);
        if (saved.storage !== 'product_sdk_cloud_storage' || (!saved.cid && saved.blockNumber === undefined)) {
          throw new Error('Receipt archive did not return a host cloud-storage reference');
        }
        const expectedReceiptHash = blake2AsHex(stableStringify(input.receipt), 256);
        if (saved.receiptHash !== expectedReceiptHash) {
          throw new Error('Receipt archive saved hash does not match the redacted receipt');
        }
        const retrieved = await input.receiptAdapter.loadReceipt(saved);
        const retrievedReceiptHash = blake2AsHex(stableStringify(retrieved), 256);
        if (retrievedReceiptHash !== expectedReceiptHash) {
          throw new Error('Receipt archive retrieval hash mismatch');
        }
        return saved.cid ? `Receipt archive saved and retrieved ${saved.cid}` : `Receipt archive saved and retrieved block ${saved.blockNumber}`;
      },
    ),
    preflightGate(
      {
        id: 'closeout_proof',
        label: 'Closeout proof anchor',
        adapterKind: input.closeoutProofAdapter.kind,
      },
      async () => {
        const proof = await input.closeoutProofAdapter.anchorReceipt(input.receipt);
        if (proof.storage !== 'product_sdk_tx_anchor' || !proof.txHash) {
          throw new Error('Closeout proof did not return a host transaction anchor');
        }
        return `Closeout proof returned ${proof.txHash}`;
      },
    ),
    preflightGate(
      {
        id: 'payout_evidence',
        label: 'Asset Hub payment evidence',
        adapterKind: input.assetHubEvidenceAdapter.kind,
      },
      async () => {
        const reference = await input.assetHubEvidenceAdapter.evidenceForClaim(defaultEvidenceInput);
        assertAssetHubEvidenceMatches(reference, defaultEvidenceInput);
        const evidenceEvent = await createDotSessionEventAsync({
          chapterId: input.chapter.id,
          participantId: input.participantId,
          deviceId: input.deviceId,
          action: { type: 'asset_hub_reference', reference },
          previousEventHash: DOT_SESSION_GENESIS_HASH,
          signer: getDemoDotSessionSigner(input.participantId),
          timestamp: input.now,
        });
        const evidenceReplay = reduceDotSessionEvents(input.chapter, [evidenceEvent]);
        if (evidenceReplay.chapter.state !== input.chapter.state || evidenceReplay.chapter.confirmations.length !== input.chapter.confirmations.length) {
          throw new Error('Asset Hub evidence changed product truth instead of staying evidence-only');
        }
        if (buildDotStatus(evidenceReplay.chapter).closeoutReadiness !== buildDotStatus(input.chapter).closeoutReadiness) {
          throw new Error('Asset Hub evidence changed closeout readiness instead of staying evidence-only');
        }
        return `Payment evidence finalized at ${reference.txHash}`;
      },
    ),
  ]);
}

export function sessionStatusLabel(events: DotSessionEvent[], initialChapter: DotChapter): 'up to date' | 'needs refresh' {
  try {
    reduceDotSessionEvents(initialChapter, events);
    return 'up to date';
  } catch {
    return 'needs refresh';
  }
}

export function sessionCloseoutReady(events: DotSessionEvent[], initialChapter: DotChapter): boolean {
  const result = reduceDotSessionEvents(initialChapter, events);
  return buildDotStatus(result.chapter).closeoutReadiness === 'ready';
}

export function dotSessionEventsToActivity(events: DotSessionEvent[]): Array<{ label: string; detail: string; kind: 'success' | 'blocked' | 'info' }> {
  return [...events].reverse().map((event) => {
    switch (event.action.type) {
      case 'claim_contribution':
        return { label: 'Marked paid', detail: `${event.participantId} marked a payment. Confirmation is still separate.`, kind: 'success' };
      case 'confirm_contribution':
        return { label: 'Confirmed received', detail: `${event.participantId} confirmed receipt.`, kind: 'success' };
      case 'record_exception':
        return { label: 'Delay recorded', detail: `${event.participantId} added a note.`, kind: 'success' };
      case 'create_release':
        return { label: 'Payout prepared', detail: `${event.participantId} prepared the payout.`, kind: 'success' };
      case 'approve_release':
        return { label: 'Payout approved', detail: `${event.participantId} approved readiness.`, kind: 'success' };
      case 'claim_release':
        return { label: 'Released outside ChopDot', detail: `${event.participantId} recorded money moved outside ChopDot.`, kind: 'success' };
      case 'confirm_release':
        return { label: 'Release confirmed', detail: `${event.participantId} confirmed receipt.`, kind: 'success' };
      case 'close_chapter':
        return { label: event.action.allowOpenItems ? 'Closed with note' : 'Closed', detail: `${event.participantId} closed the record.`, kind: 'success' };
      case 'asset_hub_reference':
        return { label: 'Payment reference added', detail: `Payment reference is ${event.action.reference.lifecycle}.`, kind: 'info' };
      case 'escrow_evidence':
        return { label: 'Escrow evidence added', detail: `Escrow event is ${event.action.reference.lifecycle}.`, kind: 'info' };
      case 'save_receipt':
        return { label: 'Receipt saved', detail: 'Receipt saved for later review.', kind: 'info' };
      case 'anchor_receipt':
        return { label: 'Receipt anchored', detail: 'Receipt proof saved for later review.', kind: 'info' };
      case 'transport_probe':
        return { label: 'Sync checked', detail: 'Transport readiness was checked.', kind: 'info' };
      default:
        event.action satisfies never;
        return { label: 'Updated', detail: 'Chapter updated.', kind: 'info' };
    }
  });
}
