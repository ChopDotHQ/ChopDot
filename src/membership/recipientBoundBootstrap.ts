import type {AccountMessageSigner, AccountMessageVerifier} from './groupKeyHandoff.ts';
import {verifyProductAccountSignature} from './groupKeyHandoff.ts';
import {
  assertSignedMembershipEvent,
  type SignedMembershipEventV1,
} from './signedMembershipEvents.ts';
import {
  projectCanonicalEvents,
  type CanonicalEventV1,
} from '../core/moneyEventKernel.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';

const encoder = new TextEncoder();
const BOOTSTRAP_DOMAIN = 'chopdot:recipient-bound-membership-bootstrap:v1';
const BOOTSTRAP_FRAGMENT_KEY = 'chopdot-invite';

export const MAX_RECIPIENT_BOOTSTRAP_BYTES = 8 * 1024;

export interface RecipientBoundBootstrapV1 {
  v: 1;
  kind: 'chopdot.recipient-bound-membership';
  returnRoute: {kind: 'chat_room'; roomId: string};
  invitationEvent: SignedMembershipEventV1;
  signature: string;
}

export interface RecipientBoundBootstrapV2 {
  v: 2;
  kind: 'chopdot.recipient-bound-membership';
  returnRoute: {kind: 'chat_room'; roomId: string};
  invitationEvent: SignedMembershipEventV1;
  /** Signed canonical group genesis; proves organizer authority, not identity. */
  organizerGroupEvent: CanonicalEventV1;
  signature: string;
}

export type RecipientBoundBootstrap = RecipientBoundBootstrapV1 | RecipientBoundBootstrapV2;

/** Call only after `verifyRecipientBoundBootstrap` succeeds. */
export function organizerGrantFromVerifiedBootstrap(value: RecipientBoundBootstrap): MembershipGrant | null {
  if (value.v !== 2 || !organizerProofMatchesInvitation(value.organizerGroupEvent, value.invitationEvent)) return null;
  if (value.invitationEvent.event.type !== 'INVITATION_CREATED') return null;
  const event = value.organizerGroupEvent;
  const member = organizerMemberFromOrigin(event, value.invitationEvent.event.invitation.inviterId);
  if (!member) return null;
  return {
    groupId: event.groupId,
    participantId: event.actorId,
    accountPublicKeyHex: event.actorAccountPublicKeyHex,
    role: 'organizer',
    acceptedAt: member.acceptedAt,
    invitationId: member.invitationId,
    keyVersion: member.keyVersion,
    groupKeyEnvelopeId: member.groupKeyEnvelopeId,
  };
}

export async function createRecipientBoundBootstrap(input: {
  invitationEvent: SignedMembershipEventV1;
  returnRoomId: string;
  signer: AccountMessageSigner;
}): Promise<RecipientBoundBootstrapV1> {
  assertBootstrapInvitationEvent(input.invitationEvent);
  const unsigned = canonicalUnsigned({
    v: 1,
    kind: 'chopdot.recipient-bound-membership',
    returnRoute: {kind: 'chat_room', roomId: input.returnRoomId},
    invitationEvent: input.invitationEvent,
  });
  const signature = await input.signer.signBytes(signingBytes(unsigned));
  if (signature.byteLength !== 64) throw new Error('Invitation bootstrap could not be signed.');
  const result = {...unsigned, signature: bytesToHex(signature)};
  assertBootstrapSize(result);
  return result;
}

export async function createOriginBoundRecipientBootstrap(input: {
  invitationEvent: SignedMembershipEventV1;
  organizerGroupEvent: CanonicalEventV1;
  returnRoomId: string;
  signer: AccountMessageSigner;
}): Promise<RecipientBoundBootstrapV2> {
  assertBootstrapInvitationEvent(input.invitationEvent);
  if (!organizerProofMatchesInvitation(input.organizerGroupEvent, input.invitationEvent)) {
    throw new Error('Invitation organizer proof does not match this group.');
  }
  const unsigned = canonicalUnsignedV2({
    v: 2,
    kind: 'chopdot.recipient-bound-membership',
    returnRoute: {kind: 'chat_room', roomId: input.returnRoomId},
    invitationEvent: input.invitationEvent,
    organizerGroupEvent: input.organizerGroupEvent,
  });
  const signature = await input.signer.signBytes(signingBytes(unsigned));
  if (signature.byteLength !== 64) throw new Error('Invitation bootstrap could not be signed.');
  const result = {...unsigned, signature: bytesToHex(signature)};
  assertBootstrapSize(result);
  return result;
}

export async function verifyRecipientBoundBootstrap(input: {
  bootstrap: RecipientBoundBootstrap;
  expectedRecipientAccountPublicKeyHex: string;
  now?: string;
  verifier?: AccountMessageVerifier;
}): Promise<boolean> {
  try {
    const canonical = canonicalBootstrap(input.bootstrap);
    const invitation = invitationFrom(canonical);
    const now = input.now ?? new Date().toISOString();
    if (
      invitation.inviteeAccountPublicKeyHex !== normalizeAccountKey(input.expectedRecipientAccountPublicKeyHex)
      || !isTimestamp(now)
      || Date.parse(now) >= Date.parse(invitation.expiresAt)
    ) return false;
    const verify = input.verifier ?? verifyProductAccountSignature;
    const carrierValid = await verify(
      canonical.invitationEvent.actorAccountPublicKeyHex,
      signingBytes(unsignedBootstrap(canonical)),
      hexToBytes(canonical.signature),
    );
    if (!carrierValid) return false;
    if (canonical.v === 1) return true;
    const organizerProof = await projectCanonicalEvents([canonical.organizerGroupEvent], (bytes, signature, publicKeyHex) => (
      verify(publicKeyHex, bytes, signature)
    ));
    return organizerProof.state.eventIds.includes(canonical.organizerGroupEvent.eventId)
      && organizerProofMatchesInvitation(canonical.organizerGroupEvent, canonical.invitationEvent);
  } catch {
    return false;
  }
}

export function encodeRecipientBoundBootstrap(value: RecipientBoundBootstrap): string {
  const canonical = canonicalBootstrap(value);
  assertBootstrapSize(canonical);
  return bytesToBase64Url(encoder.encode(JSON.stringify(canonical)));
}

export function decodeRecipientBoundBootstrap(value: string): RecipientBoundBootstrap {
  const encoded = value.trim();
  if (!encoded || encoded.length > Math.ceil(MAX_RECIPIENT_BOOTSTRAP_BYTES * 4 / 3) + 8) {
    throw new Error('Invitation bootstrap is invalid.');
  }
  const bytes = base64UrlToBytes(encoded);
  if (bytes.byteLength > MAX_RECIPIENT_BOOTSTRAP_BYTES) throw new Error('Invitation bootstrap is invalid.');
  const parsed = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)) as unknown;
  return canonicalBootstrap(parsed as RecipientBoundBootstrap);
}

/** QR content is exactly this URL; no second QR-only payload format exists. */
export function recipientBoundBootstrapUrl(baseUrl: string, bootstrap: RecipientBoundBootstrap): string {
  const url = new URL(baseUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invitation destination is invalid.');
  }
  url.hash = `${BOOTSTRAP_FRAGMENT_KEY}=${encodeURIComponent(encodeRecipientBoundBootstrap(bootstrap))}`;
  return url.toString();
}

export function recipientBoundBootstrapQrText(baseUrl: string, bootstrap: RecipientBoundBootstrap): string {
  return recipientBoundBootstrapUrl(baseUrl, bootstrap);
}

export function bootstrapFromUrl(value: string): RecipientBoundBootstrap {
  const url = new URL(value);
  const params = new URLSearchParams(url.hash.replace(/^#/u, ''));
  const encoded = params.get(BOOTSTRAP_FRAGMENT_KEY);
  if (!encoded) throw new Error('Invitation bootstrap is missing.');
  return decodeRecipientBoundBootstrap(encoded);
}

function canonicalBootstrap(value: RecipientBoundBootstrap): RecipientBoundBootstrap {
  if (value?.v === 2) {
    assertExactKeys(value, ['v', 'kind', 'returnRoute', 'invitationEvent', 'organizerGroupEvent', 'signature']);
  } else {
    assertExactKeys(value, ['v', 'kind', 'returnRoute', 'invitationEvent', 'signature']);
  }
  if (![1, 2].includes(value.v) || value.kind !== 'chopdot.recipient-bound-membership') {
    throw new Error('Invitation bootstrap is invalid.');
  }
  const unsigned = value.v === 2 ? canonicalUnsignedV2(value) : canonicalUnsigned(value);
  const signature = value.signature.trim().toLowerCase();
  if (!/^0x[0-9a-f]{128}$/u.test(signature)) throw new Error('Invitation bootstrap is invalid.');
  const result = {...unsigned, signature};
  assertBootstrapSize(result);
  return result;
}

function canonicalUnsigned(
  value: Omit<RecipientBoundBootstrapV1, 'signature'>,
): Omit<RecipientBoundBootstrapV1, 'signature'> {
  assertExactKeys(value.returnRoute, ['kind', 'roomId']);
  if (value.returnRoute.kind !== 'chat_room' || !value.returnRoute.roomId.trim()) {
    throw new Error('Invitation bootstrap is invalid.');
  }
  assertBootstrapInvitationEvent(value.invitationEvent);
  return {
    v: 1,
    kind: 'chopdot.recipient-bound-membership',
    returnRoute: {kind: 'chat_room', roomId: value.returnRoute.roomId.trim()},
    invitationEvent: value.invitationEvent,
  };
}

function canonicalUnsignedV2(
  value: Omit<RecipientBoundBootstrapV2, 'signature'>,
): Omit<RecipientBoundBootstrapV2, 'signature'> {
  assertExactKeys(value.returnRoute, ['kind', 'roomId']);
  if (value.returnRoute.kind !== 'chat_room' || !value.returnRoute.roomId.trim()) {
    throw new Error('Invitation bootstrap is invalid.');
  }
  assertBootstrapInvitationEvent(value.invitationEvent);
  if (!organizerProofMatchesInvitation(value.organizerGroupEvent, value.invitationEvent)) {
    throw new Error('Invitation organizer proof does not match this group.');
  }
  return {
    v: 2,
    kind: 'chopdot.recipient-bound-membership',
    returnRoute: {kind: 'chat_room', roomId: value.returnRoute.roomId.trim()},
    invitationEvent: value.invitationEvent,
    organizerGroupEvent: value.organizerGroupEvent,
  };
}

function assertBootstrapInvitationEvent(event: SignedMembershipEventV1): void {
  assertSignedMembershipEvent(event);
  assertExactKeys(event, [
    'v', 'eventId', 'actorId', 'actorAccountPublicKeyHex', 'occurredAt', 'event',
    ...(event.causal ? ['causal'] : []),
    'signature',
  ]);
  if (event.event.type !== 'INVITATION_CREATED') throw new Error('Bootstrap must contain one invitation.');
  assertExactKeys(event.event, ['type', 'invitation']);
  const invitation = event.event.invitation;
  assertExactKeys(invitation, [
    'invitationId', 'groupId', 'inviterId', 'inviteeId', 'inviteeAccountPublicKeyHex',
    'role', 'route', 'status', 'createdAt', 'expiresAt',
  ]);
  if (
    invitation.status !== 'invited'
    || !['join_link', 'qr'].includes(invitation.route)
    || !['organizer', 'member'].includes(invitation.role)
    || invitation.inviterId !== event.actorId
    || invitation.createdAt !== event.occurredAt
    || !requiredString(invitation.invitationId)
    || !requiredString(invitation.groupId)
    || !requiredString(invitation.inviterId)
    || !requiredString(invitation.inviteeId)
    || !isTimestamp(invitation.createdAt)
    || !isTimestamp(invitation.expiresAt)
    || Date.parse(invitation.expiresAt) <= Date.parse(invitation.createdAt)
    || !normalizeAccountKey(invitation.inviteeAccountPublicKeyHex ?? '')
  ) throw new Error('Bootstrap must contain one account-bound invitation.');
  if (event.causal) assertBootstrapCausal(event.causal, invitation.groupId);
}

function assertBootstrapCausal(
  causal: NonNullable<SignedMembershipEventV1['causal']>,
  expectedGroupId: string,
): void {
  assertExactKeys(causal, ['groupId', 'expectedVersion', 'parentEventId', 'expectedFrontierHash']);
  const groupId = causal.groupId.trim();
  const parentEventId = causal.parentEventId === null
    ? null
    : typeof causal.parentEventId === 'string' && causal.parentEventId.trim()
      ? causal.parentEventId.trim()
      : undefined;
  const expectedFrontierHash = typeof causal.expectedFrontierHash === 'string'
    ? causal.expectedFrontierHash.toLowerCase()
    : '';
  if (
    groupId !== expectedGroupId.trim()
    || !Number.isSafeInteger(causal.expectedVersion)
    || causal.expectedVersion < 0
    || parentEventId === undefined
    || !/^0x[0-9a-f]{64}$/u.test(expectedFrontierHash)
    || (
      causal.expectedVersion === 0
      && (parentEventId !== null || expectedFrontierHash !== `0x${'00'.repeat(32)}`)
    )
    || (causal.expectedVersion > 0 && parentEventId === null)
  ) throw new Error('Bootstrap membership frontier is invalid.');
}

function invitationFrom(value: RecipientBoundBootstrap) {
  if (value.invitationEvent.event.type !== 'INVITATION_CREATED') throw new Error('Invalid invitation.');
  return value.invitationEvent.event.invitation;
}

function unsignedBootstrap(value: RecipientBoundBootstrap): Omit<RecipientBoundBootstrap, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function signingBytes(value: Omit<RecipientBoundBootstrap, 'signature'>): Uint8Array {
  return encoder.encode(stableSerialize([BOOTSTRAP_DOMAIN, value]));
}

function assertBootstrapSize(value: RecipientBoundBootstrap): void {
  if (encoder.encode(JSON.stringify(value)).byteLength > MAX_RECIPIENT_BOOTSTRAP_BYTES) {
    throw new Error('Invitation bootstrap is too large.');
  }
}

function organizerProofMatchesInvitation(
  event: CanonicalEventV1,
  invitationEvent: SignedMembershipEventV1,
): boolean {
  if (invitationEvent.event.type !== 'INVITATION_CREATED') return false;
  const invitation = invitationEvent.event.invitation;
  if (event.eventType !== 'GROUP_CREATED' || event.expectedVersion !== 0 || event.parentEventId !== null) return false;
  if (event.groupId !== invitation.groupId || event.actorId !== invitation.inviterId) return false;
  if (event.actorRole !== 'organizer' || event.actorAccountPublicKeyHex !== invitationEvent.actorAccountPublicKeyHex) return false;
  const payload = event.payload as {organizerId?: string; members?: unknown[]};
  const organizer = organizerMemberFromOrigin(event, invitation.inviterId);
  return payload.organizerId === invitation.inviterId
    && Array.isArray(payload.members)
    && organizer?.accountPublicKeyHex === invitationEvent.actorAccountPublicKeyHex
    && organizer.keyVersion === event.keyVersion;
}

function organizerMemberFromOrigin(event: CanonicalEventV1, organizerId: string): {
  participantId: string;
  accountPublicKeyHex: string;
  role: 'organizer';
  acceptedAt: string;
  invitationId: string;
  keyVersion: number;
  groupKeyEnvelopeId: string;
} | null {
  const payload = event.payload as {members?: unknown[]};
  if (!Array.isArray(payload.members)) return null;
  const candidate = payload.members.find(value => isRecord(value)
    && value.participantId === organizerId
    && value.role === 'organizer');
  if (!isRecord(candidate)) return null;
  const accountPublicKeyHex = normalizeAccountKey(typeof candidate.accountPublicKeyHex === 'string' ? candidate.accountPublicKeyHex : '');
  const acceptedAt = typeof candidate.acceptedAt === 'string' ? candidate.acceptedAt : '';
  const invitationId = typeof candidate.invitationId === 'string' ? candidate.invitationId.trim() : '';
  const groupKeyEnvelopeId = typeof candidate.groupKeyEnvelopeId === 'string' ? candidate.groupKeyEnvelopeId.trim() : '';
  if (!accountPublicKeyHex || candidate.active === false || !isTimestamp(acceptedAt) || !invitationId
    || !Number.isSafeInteger(candidate.keyVersion) || Number(candidate.keyVersion) < 1
    || !/^sha256:[0-9a-f]{64}$/u.test(groupKeyEnvelopeId)) return null;
  return {
    participantId: organizerId,
    accountPublicKeyHex,
    role: 'organizer',
    acceptedAt: new Date(acceptedAt).toISOString(),
    invitationId,
    keyVersion: Number(candidate.keyVersion),
    groupKeyEnvelopeId,
  };
}

function assertExactKeys(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invitation bootstrap is invalid.');
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error('Invitation bootstrap contains unsupported data.');
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeAccountKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function requiredString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.replace(/^0x/u, '');
  if (!/^[0-9a-f]+$/u.test(normalized) || normalized.length % 2 !== 0) throw new Error('Invalid signature.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function bytesToBase64Url(value: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(value).toString('base64url');
  let binary = '';
  value.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invitation bootstrap is invalid.');
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64url'));
  const padded = value.replace(/-/gu, '+').replace(/_/gu, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
