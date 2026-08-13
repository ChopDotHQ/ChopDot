import type {AccountMessageSigner, AccountMessageVerifier} from './groupKeyHandoff.ts';
import {verifyProductAccountSignature} from './groupKeyHandoff.ts';
import {
  assertSignedMembershipEvent,
  type SignedMembershipEventV1,
} from './signedMembershipEvents.ts';

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

export async function verifyRecipientBoundBootstrap(input: {
  bootstrap: RecipientBoundBootstrapV1;
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
    return (input.verifier ?? verifyProductAccountSignature)(
      canonical.invitationEvent.actorAccountPublicKeyHex,
      signingBytes(unsignedBootstrap(canonical)),
      hexToBytes(canonical.signature),
    );
  } catch {
    return false;
  }
}

export function encodeRecipientBoundBootstrap(value: RecipientBoundBootstrapV1): string {
  const canonical = canonicalBootstrap(value);
  assertBootstrapSize(canonical);
  return bytesToBase64Url(encoder.encode(JSON.stringify(canonical)));
}

export function decodeRecipientBoundBootstrap(value: string): RecipientBoundBootstrapV1 {
  const encoded = value.trim();
  if (!encoded || encoded.length > Math.ceil(MAX_RECIPIENT_BOOTSTRAP_BYTES * 4 / 3) + 8) {
    throw new Error('Invitation bootstrap is invalid.');
  }
  const bytes = base64UrlToBytes(encoded);
  if (bytes.byteLength > MAX_RECIPIENT_BOOTSTRAP_BYTES) throw new Error('Invitation bootstrap is invalid.');
  const parsed = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)) as unknown;
  return canonicalBootstrap(parsed as RecipientBoundBootstrapV1);
}

/** QR content is exactly this URL; no second QR-only payload format exists. */
export function recipientBoundBootstrapUrl(baseUrl: string, bootstrap: RecipientBoundBootstrapV1): string {
  const url = new URL(baseUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invitation destination is invalid.');
  }
  url.hash = `${BOOTSTRAP_FRAGMENT_KEY}=${encodeURIComponent(encodeRecipientBoundBootstrap(bootstrap))}`;
  return url.toString();
}

export function recipientBoundBootstrapQrText(baseUrl: string, bootstrap: RecipientBoundBootstrapV1): string {
  return recipientBoundBootstrapUrl(baseUrl, bootstrap);
}

export function bootstrapFromUrl(value: string): RecipientBoundBootstrapV1 {
  const url = new URL(value);
  const params = new URLSearchParams(url.hash.replace(/^#/u, ''));
  const encoded = params.get(BOOTSTRAP_FRAGMENT_KEY);
  if (!encoded) throw new Error('Invitation bootstrap is missing.');
  return decodeRecipientBoundBootstrap(encoded);
}

function canonicalBootstrap(value: RecipientBoundBootstrapV1): RecipientBoundBootstrapV1 {
  assertExactKeys(value, ['v', 'kind', 'returnRoute', 'invitationEvent', 'signature']);
  if (value.v !== 1 || value.kind !== 'chopdot.recipient-bound-membership') {
    throw new Error('Invitation bootstrap is invalid.');
  }
  const unsigned = canonicalUnsigned(value);
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

function assertBootstrapInvitationEvent(event: SignedMembershipEventV1): void {
  assertSignedMembershipEvent(event);
  assertExactKeys(event, ['v', 'eventId', 'actorId', 'actorAccountPublicKeyHex', 'occurredAt', 'event', 'signature']);
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
}

function invitationFrom(value: RecipientBoundBootstrapV1) {
  if (value.invitationEvent.event.type !== 'INVITATION_CREATED') throw new Error('Invalid invitation.');
  return value.invitationEvent.event.invitation;
}

function unsignedBootstrap(value: RecipientBoundBootstrapV1): Omit<RecipientBoundBootstrapV1, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function signingBytes(value: Omit<RecipientBoundBootstrapV1, 'signature'>): Uint8Array {
  return encoder.encode(stableSerialize([BOOTSTRAP_DOMAIN, value]));
}

function assertBootstrapSize(value: RecipientBoundBootstrapV1): void {
  if (encoder.encode(JSON.stringify(value)).byteLength > MAX_RECIPIENT_BOOTSTRAP_BYTES) {
    throw new Error('Invitation bootstrap is too large.');
  }
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
