import {
  applyMembershipDecision,
  membershipKey,
  type GroupInvitation,
  type MembershipGrant,
  type MembershipLifecycleState,
} from './membershipLifecycle.ts';
import {
  verifyGroupKeyHandoff,
  verifyMembershipAcceptance,
  verifyProductAccountSignature,
  type AccountMessageSigner,
  type AccountMessageVerifier,
  type GroupKeyHandoffV1,
  type MembershipAcceptanceV1,
} from './groupKeyHandoff.ts';

const encoder = new TextEncoder();
const SIGNING_DOMAIN = 'chopdot:signed-membership-event:v1';

export type MembershipEventV1 =
  | {type: 'INVITATION_CREATED'; invitation: GroupInvitation}
  | {type: 'INVITATION_ACCEPTED'; acceptance: MembershipAcceptanceV1}
  | {type: 'MEMBERSHIP_GRANTED'; handoff: GroupKeyHandoffV1; groupKeyEnvelopeId: string}
  | {type: 'INVITATION_DECLINED'; invitationId: string}
  | {type: 'INVITATION_REVOKED'; invitationId: string};

export interface SignedMembershipEventV1 {
  v: 1;
  eventId: string;
  actorId: string;
  actorAccountPublicKeyHex: string;
  occurredAt: string;
  event: MembershipEventV1;
  signature: string;
}

export interface SignedMembershipState {
  lifecycle: MembershipLifecycleState;
  pendingAcceptances: Record<string, MembershipAcceptanceV1>;
  events: Record<string, SignedMembershipEventV1>;
}

export interface SignedMembershipTransition {
  state: SignedMembershipState;
  outcome: 'applied' | 'idempotent' | 'deferred' | 'rejected';
  reason?: string;
}

export function createSignedMembershipState(
  organizers: MembershipGrant[] = [],
): SignedMembershipState {
  const memberships = Object.fromEntries(
    organizers.map(grant => [membershipKey(grant.groupId, grant.participantId), grant]),
  );
  return {
    lifecycle: {invitations: {}, memberships},
    pendingAcceptances: {},
    events: {},
  };
}

export async function createSignedMembershipEvent(input: {
  eventId?: string;
  actorId: string;
  actorAccountPublicKeyHex: string;
  occurredAt?: string;
  event: MembershipEventV1;
  signer: AccountMessageSigner;
}): Promise<SignedMembershipEventV1> {
  const unsigned = canonicalUnsigned({
    eventId: input.eventId ?? crypto.randomUUID(),
    actorId: input.actorId,
    actorAccountPublicKeyHex: input.actorAccountPublicKeyHex,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    event: input.event,
  });
  const signature = await input.signer.signBytes(membershipEventSigningBytes(unsigned));
  if (signature.byteLength !== 64) throw new Error('Membership action could not be signed.');
  return {...unsigned, signature: bytesToHex(signature)};
}

export async function applySignedMembershipEvent(
  current: SignedMembershipState,
  envelope: SignedMembershipEventV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<SignedMembershipTransition> {
  let canonical: SignedMembershipEventV1;
  try {
    canonical = canonicalEnvelope(envelope);
  } catch {
    return rejected(current, 'Membership action is invalid.');
  }

  const existing = current.events[canonical.eventId];
  if (existing) {
    return stableSerialize(existing) === stableSerialize(canonical)
      ? {state: current, outcome: 'idempotent'}
      : rejected(current, 'Membership action identifier is already in use.');
  }

  if (!await verifier(
    canonical.actorAccountPublicKeyHex,
    membershipEventSigningBytes(unsignedEnvelope(canonical)),
    hexToBytes(canonical.signature),
  )) return rejected(current, 'Membership action could not be verified.');

  const transition = await applyVerifiedEvent(current, canonical, verifier);
  if (transition.outcome !== 'applied') return transition;
  return {
    ...transition,
    state: {
      ...transition.state,
      events: {...transition.state.events, [canonical.eventId]: canonical},
    },
  };
}

export async function membershipEventFrontier(state: SignedMembershipState): Promise<string> {
  const canonical = Object.values(state.events)
    .sort((left, right) => left.eventId.localeCompare(right.eventId))
    .map(event => stableSerialize(event));
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(stableSerialize(canonical)));
  return bytesToHex(new Uint8Array(digest));
}

export function assertSignedMembershipEvent(value: unknown): asserts value is SignedMembershipEventV1 {
  canonicalEnvelope(value as SignedMembershipEventV1);
}

export function membershipEventFingerprint(value: SignedMembershipEventV1): string {
  return stableSerialize(canonicalEnvelope(value));
}

async function applyVerifiedEvent(
  current: SignedMembershipState,
  envelope: SignedMembershipEventV1,
  verifier: AccountMessageVerifier,
): Promise<SignedMembershipTransition> {
  const {event} = envelope;
  switch (event.type) {
    case 'INVITATION_CREATED': {
      const invitation = event.invitation;
      if (
        invitation.status !== 'invited'
        || invitation.inviterId !== envelope.actorId
        || invitation.createdAt !== envelope.occurredAt
        || !isOrganizer(current, invitation.groupId, envelope.actorId, envelope.actorAccountPublicKeyHex)
      ) return rejected(current, 'Only the current organizer can invite this person.');
      const {status: _status, decidedAt: _decidedAt, ...draft} = invitation;
      const result = applyMembershipDecision(current.lifecycle, {
        type: 'INVITE_MEMBER',
        actorId: envelope.actorId,
        invitation: draft,
      });
      return fromLifecycle(current, result);
    }

    case 'INVITATION_ACCEPTED': {
      const acceptance = event.acceptance;
      const invitation = current.lifecycle.invitations[acceptance.invitationId];
      if (!invitation) return deferred(current, 'Invitation has not arrived yet.');
      if (
        envelope.actorId !== acceptance.recipientId
        || normalizeKey(envelope.actorAccountPublicKeyHex) !== normalizeKey(acceptance.recipientAccountPublicKeyHex)
        || invitation.groupId !== acceptance.groupId
        || invitation.inviteeId !== acceptance.recipientId
        || (invitation.inviteeAccountPublicKeyHex
          && normalizeKey(invitation.inviteeAccountPublicKeyHex) !== normalizeKey(acceptance.recipientAccountPublicKeyHex))
        || invitation.status !== 'invited'
      ) return rejected(current, 'This invitation is not for this account.');
      if (
        Date.parse(envelope.occurredAt) < Date.parse(invitation.createdAt)
        || Date.parse(envelope.occurredAt) >= Date.parse(invitation.expiresAt)
      ) {
        return rejected(current, 'This invitation has expired.');
      }
      if (!await verifyMembershipAcceptance(acceptance, verifier)) {
        return rejected(current, 'Invitation acceptance could not be verified.');
      }
      const existing = current.pendingAcceptances[acceptance.invitationId];
      if (existing) {
        return stableSerialize(existing) === stableSerialize(acceptance)
          ? {state: current, outcome: 'idempotent'}
          : rejected(current, 'This invitation already has another acceptance.');
      }
      return {
        state: {
          ...current,
          pendingAcceptances: {...current.pendingAcceptances, [acceptance.invitationId]: acceptance},
        },
        outcome: 'applied',
      };
    }

    case 'MEMBERSHIP_GRANTED': {
      const handoff = event.handoff;
      const invitation = current.lifecycle.invitations[handoff.invitationId];
      const acceptance = current.pendingAcceptances[handoff.invitationId];
      if (!invitation || !acceptance) return deferred(current, 'Acceptance has not arrived yet.');
      if (
        envelope.actorId !== handoff.organizerId
        || normalizeKey(envelope.actorAccountPublicKeyHex) !== normalizeKey(handoff.organizerAccountPublicKeyHex)
        || !isOrganizer(current, handoff.groupId, envelope.actorId, envelope.actorAccountPublicKeyHex)
        || invitation.groupId !== handoff.groupId
        || invitation.inviteeId !== handoff.recipientId
        || invitation.role !== handoff.role
        || handoff.createdAt !== envelope.occurredAt
        || stableSerialize(acceptance) !== stableSerialize(acceptanceForHandoff(handoff, acceptance))
        || event.groupKeyEnvelopeId.trim() !== handoff.groupKeyEnvelopeId
      ) return rejected(current, 'Protected group access does not match this invitation.');
      if (!await verifyGroupKeyHandoff(handoff, verifier)) {
        return rejected(current, 'Protected group access could not be verified.');
      }
      const result = applyMembershipDecision(current.lifecycle, {
        type: 'ACCEPT_INVITATION',
        actorId: handoff.recipientId,
        actorAccountPublicKeyHex: handoff.recipientAccountPublicKeyHex,
        invitationId: handoff.invitationId,
        decidedAt: envelope.occurredAt,
        groupKeyEnvelopeId: event.groupKeyEnvelopeId,
        keyVersion: handoff.keyVersion,
      });
      return fromLifecycle(current, result);
    }

    case 'INVITATION_DECLINED': {
      const invitation = current.lifecycle.invitations[event.invitationId];
      if (!invitation) return deferred(current, 'Invitation has not arrived yet.');
      if (
        envelope.actorId !== invitation.inviteeId
        || (invitation.inviteeAccountPublicKeyHex
          && normalizeKey(envelope.actorAccountPublicKeyHex) !== normalizeKey(invitation.inviteeAccountPublicKeyHex))
      ) return rejected(current, 'Only the invited account can decline.');
      return fromLifecycle(current, applyMembershipDecision(current.lifecycle, {
        type: 'DECLINE_INVITATION', actorId: envelope.actorId,
        invitationId: event.invitationId, decidedAt: envelope.occurredAt,
      }));
    }

    case 'INVITATION_REVOKED': {
      const invitation = current.lifecycle.invitations[event.invitationId];
      if (!invitation) return deferred(current, 'Invitation has not arrived yet.');
      if (
        envelope.actorId !== invitation.inviterId
        || !isOrganizer(current, invitation.groupId, envelope.actorId, envelope.actorAccountPublicKeyHex)
      ) return rejected(current, 'Only the current organizer can revoke this invitation.');
      return fromLifecycle(current, applyMembershipDecision(current.lifecycle, {
        type: 'REVOKE_INVITATION', actorId: envelope.actorId,
        invitationId: event.invitationId, decidedAt: envelope.occurredAt,
      }));
    }
  }
}

function isOrganizer(
  state: SignedMembershipState,
  groupId: string,
  participantId: string,
  accountPublicKeyHex: string,
): boolean {
  const membership = state.lifecycle.memberships[membershipKey(groupId, participantId)];
  return Boolean(
    membership?.role === 'organizer'
    && normalizeKey(membership.accountPublicKeyHex) === normalizeKey(accountPublicKeyHex),
  );
}

function acceptanceForHandoff(
  handoff: GroupKeyHandoffV1,
  acceptance: MembershipAcceptanceV1,
): MembershipAcceptanceV1 {
  return {
    ...acceptance,
    invitationId: handoff.invitationId,
    groupId: handoff.groupId,
    recipientId: handoff.recipientId,
    recipientAccountPublicKeyHex: handoff.recipientAccountPublicKeyHex,
    recipientEcdhPublicKey: handoff.recipientEcdhPublicKey,
    nonce: handoff.nonce,
    expiresAt: acceptance.expiresAt,
  };
}

function fromLifecycle(
  current: SignedMembershipState,
  transition: ReturnType<typeof applyMembershipDecision>,
): SignedMembershipTransition {
  if (transition.outcome === 'rejected') return rejected(current, transition.reason ?? 'Membership action was rejected.');
  return {
    state: {...current, lifecycle: transition.state},
    outcome: transition.outcome === 'idempotent' ? 'idempotent' : 'applied',
  };
}

function canonicalEnvelope(value: SignedMembershipEventV1): SignedMembershipEventV1 {
  if (value.v !== 1 || !isMembershipEvent(value.event)) throw new Error('Invalid membership event.');
  const unsigned = canonicalUnsigned(value);
  if (!/^0x[0-9a-f]{128}$/u.test(value.signature.toLowerCase())) throw new Error('Invalid signature.');
  return {...unsigned, signature: value.signature.toLowerCase()};
}

function canonicalUnsigned(value: Omit<SignedMembershipEventV1, 'v' | 'signature'>): Omit<SignedMembershipEventV1, 'signature'> {
  const actorAccountPublicKeyHex = normalizeKey(value.actorAccountPublicKeyHex);
  if (
    !value.eventId.trim()
    || !value.actorId.trim()
    || !actorAccountPublicKeyHex
    || Number.isNaN(Date.parse(value.occurredAt))
    || !isMembershipEvent(value.event)
  ) throw new Error('Invalid membership event.');
  return {
    v: 1,
    eventId: value.eventId.trim(),
    actorId: value.actorId.trim(),
    actorAccountPublicKeyHex,
    occurredAt: new Date(value.occurredAt).toISOString(),
    event: value.event,
  };
}

function unsignedEnvelope(value: SignedMembershipEventV1): Omit<SignedMembershipEventV1, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function membershipEventSigningBytes(value: Omit<SignedMembershipEventV1, 'signature'>): Uint8Array {
  return encoder.encode(stableSerialize([SIGNING_DOMAIN, value]));
}

function isMembershipEvent(value: unknown): value is MembershipEventV1 {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  switch (value.type) {
    case 'INVITATION_CREATED': return isRecord(value.invitation);
    case 'INVITATION_ACCEPTED': return isRecord(value.acceptance);
    case 'MEMBERSHIP_GRANTED': return isRecord(value.handoff) && typeof value.groupKeyEnvelopeId === 'string';
    case 'INVITATION_DECLINED':
    case 'INVITATION_REVOKED': return typeof value.invitationId === 'string' && Boolean(value.invitationId.trim());
    default: return false;
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  if (!/^[0-9a-f]+$/u.test(normalized) || normalized.length % 2 !== 0) throw new Error('Invalid hex.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejected(state: SignedMembershipState, reason: string): SignedMembershipTransition {
  return {state, outcome: 'rejected', reason};
}

function deferred(state: SignedMembershipState, reason: string): SignedMembershipTransition {
  return {state, outcome: 'deferred', reason};
}
