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
const ZERO_FRONTIER_HASH = `0x${'00'.repeat(32)}`;

export type MembershipEventV1 =
  | {type: 'INVITATION_CREATED'; invitation: GroupInvitation}
  | {type: 'INVITATION_ACCEPTED'; acceptance: MembershipAcceptanceV1}
  | {type: 'MEMBERSHIP_GRANTED'; handoff: GroupKeyHandoffV1; groupKeyEnvelopeId: string}
  | {type: 'INVITATION_DECLINED'; invitationId: string}
  | {type: 'INVITATION_REVOKED'; invitationId: string}
  | {
      type: 'MEMBERSHIP_REMOVED';
      groupId: string;
      participantId: string;
      nextKeyVersion: number;
      groupKeyEnvelopes: Record<string, MembershipKeyEnvelopeBindingV1>;
    }
  | {
      type: 'MEMBERSHIP_ROLES_CHANGED';
      groupId: string;
      roles: Record<string, 'organizer' | 'member'>;
      nextKeyVersion: number;
      groupKeyEnvelopes: Record<string, MembershipKeyEnvelopeBindingV1>;
    }
  | {
      type: 'GROUP_KEY_ROTATED';
      groupId: string;
      nextKeyVersion: number;
      groupKeyEnvelopes: Record<string, MembershipKeyEnvelopeBindingV1>;
    };

export interface MembershipKeyEnvelopeBindingV1 {
  participantId: string;
  recipientAccountPublicKeyHex: string;
  keyVersion: number;
  groupKeyEnvelopeId: string;
}

export interface MembershipKeyEnvelopeResolver {
  resolve(input: {
    groupId: string;
    keyVersion: number;
    binding: MembershipKeyEnvelopeBindingV1;
  }): Promise<boolean>;
}

export interface SignedMembershipEventV1 {
  v: 1;
  eventId: string;
  actorId: string;
  actorAccountPublicKeyHex: string;
  occurredAt: string;
  event: MembershipEventV1;
  /**
   * Required on the production coordinator path and on every active-authority
   * mutation. Legacy invitation packets remain readable during migration but
   * cannot remove, re-role, or rotate a group.
   */
  causal?: MembershipCausalV1;
  signature: string;
}

export interface MembershipCausalV1 {
  groupId: string;
  expectedVersion: number;
  parentEventId: string | null;
  expectedFrontierHash: string;
}

export interface MembershipGroupFrontierV1 {
  groupId: string;
  version: number;
  lastEventId: string | null;
  frontierHash: string;
}

export interface MembershipAuthorityIntervalV1 {
  groupId: string;
  participantId: string;
  accountPublicKeyHex: string;
  role: 'organizer' | 'member';
  effectiveFromVersion: number;
  effectiveUntilVersion: number | null;
  openedByEventId: string;
  closedByEventId?: string;
}

export interface SignedMembershipState {
  lifecycle: MembershipLifecycleState;
  pendingAcceptances: Record<string, MembershipAcceptanceV1>;
  events: Record<string, SignedMembershipEventV1>;
  groupFrontiers: Record<string, MembershipGroupFrontierV1>;
  authorityIntervals: MembershipAuthorityIntervalV1[];
}

export interface SignedMembershipTransition {
  state: SignedMembershipState;
  outcome: 'applied' | 'idempotent' | 'deferred' | 'conflict' | 'rejected';
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
    groupFrontiers: {},
    authorityIntervals: organizers.map(grant => ({
      groupId: grant.groupId,
      participantId: grant.participantId,
      accountPublicKeyHex: normalizeKey(grant.accountPublicKeyHex),
      role: grant.role,
      effectiveFromVersion: 0,
      effectiveUntilVersion: null,
      openedByEventId: grant.invitationId,
    })),
  };
}

export async function createSignedMembershipEvent(input: {
  eventId?: string;
  actorId: string;
  actorAccountPublicKeyHex: string;
  occurredAt?: string;
  event: MembershipEventV1;
  causal?: MembershipCausalV1;
  signer: AccountMessageSigner;
}): Promise<SignedMembershipEventV1> {
  const unsigned = canonicalUnsigned({
    eventId: input.eventId ?? crypto.randomUUID(),
    actorId: input.actorId,
    actorAccountPublicKeyHex: input.actorAccountPublicKeyHex,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    event: input.event,
    ...(input.causal ? {causal: input.causal} : {}),
  });
  const signature = await input.signer.signBytes(membershipEventSigningBytes(unsigned));
  if (signature.byteLength !== 64) throw new Error('Membership action could not be signed.');
  return {...unsigned, signature: bytesToHex(signature)};
}

/** Build a production event against one exact group frontier. */
export async function createCausalSignedMembershipEvent(
  current: SignedMembershipState,
  input: Omit<Parameters<typeof createSignedMembershipEvent>[0], 'causal'> & {groupId?: string},
): Promise<SignedMembershipEventV1> {
  const groupId = (input.groupId ?? membershipEventGroupId(input.event)).trim();
  if (!groupId || membershipEventGroupId(input.event, current) !== groupId) {
    throw new Error('Membership action group is invalid.');
  }
  const frontier = membershipGroupFrontier(current, groupId);
  return createSignedMembershipEvent({
    ...input,
    causal: {
      groupId,
      expectedVersion: frontier.version,
      parentEventId: frontier.lastEventId,
      expectedFrontierHash: frontier.frontierHash,
    },
  });
}

export async function applySignedMembershipEvent(
  current: SignedMembershipState,
  envelope: SignedMembershipEventV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
  keyEnvelopes?: MembershipKeyEnvelopeResolver,
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

  if (requiresCausalAuthority(canonical.event) && !canonical.causal) {
    return rejected(current, 'This membership action requires an exact group frontier.');
  }
  if (!canonical.causal) {
    const legacyGroupId = membershipEventGroupId(canonical.event, current);
    if (legacyGroupId && membershipGroupFrontier(current, legacyGroupId).version > 0) {
      return rejected(current, 'Legacy membership actions cannot be admitted after a causal frontier.');
    }
  }
  if (canonical.causal) {
    const actualGroupId = membershipEventGroupId(canonical.event, current);
    if (actualGroupId !== canonical.causal.groupId) {
      return rejected(current, 'Membership action group does not match its frontier.');
    }
    const frontier = membershipGroupFrontier(current, canonical.causal.groupId);
    const exact = canonical.causal.expectedVersion === frontier.version
      && canonical.causal.parentEventId === frontier.lastEventId
      && canonical.causal.expectedFrontierHash === frontier.frontierHash;
    if (!exact) {
      if (canonical.causal.expectedVersion > frontier.version) {
        return deferred(current, 'Membership action depends on an event that has not arrived yet.');
      }
      return conflicted(current, 'Membership action conflicts with the accepted group frontier.');
    }
  }

  const transition = await applyVerifiedEvent(current, canonical, verifier, keyEnvelopes);
  if (transition.outcome !== 'applied') return transition;
  let state = {
    ...transition.state,
    events: {...transition.state.events, [canonical.eventId]: canonical},
  };
  if (canonical.causal) {
    const nextVersion = canonical.causal.expectedVersion + 1;
    const nextFrontier: MembershipGroupFrontierV1 = {
      groupId: canonical.causal.groupId,
      version: nextVersion,
      lastEventId: canonical.eventId,
      frontierHash: await nextMembershipFrontierHash(canonical.causal.expectedFrontierHash, canonical),
    };
    state = {
      ...state,
      groupFrontiers: {...state.groupFrontiers, [nextFrontier.groupId]: nextFrontier},
      authorityIntervals: updateAuthorityIntervals(current, state, canonical, nextVersion),
    };
  }
  return {
    ...transition,
    state,
  };
}

export async function membershipEventFrontier(state: SignedMembershipState): Promise<string> {
  const canonical = Object.values(state.events)
    .sort((left, right) => left.eventId.localeCompare(right.eventId))
    .map(event => stableSerialize(event));
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(stableSerialize(canonical)));
  return bytesToHex(new Uint8Array(digest));
}

export function membershipGroupFrontier(
  state: SignedMembershipState,
  groupIdValue: string,
): MembershipGroupFrontierV1 {
  const groupId = groupIdValue.trim();
  const existing = state.groupFrontiers[groupId];
  return existing
    ? {...existing}
    : {groupId, version: 0, lastEventId: null, frontierHash: ZERO_FRONTIER_HASH};
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
  keyEnvelopes?: MembershipKeyEnvelopeResolver,
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

    case 'MEMBERSHIP_REMOVED': {
      if (!isOrganizer(current, event.groupId, envelope.actorId, envelope.actorAccountPublicKeyHex)) {
        return rejected(current, 'Only the current organizer can remove a member.');
      }
      const envelopeIds = await validateKeyEnvelopeBindings(current, event, keyEnvelopes, event.participantId);
      if (!envelopeIds) return rejected(current, 'Future protected group access is not bound to every remaining account.');
      return fromLifecycle(current, applyMembershipDecision(current.lifecycle, {
        type: 'REMOVE_MEMBER',
        actorId: envelope.actorId,
        groupId: event.groupId,
        participantId: event.participantId,
        decidedAt: envelope.occurredAt,
        nextKeyVersion: event.nextKeyVersion,
        groupKeyEnvelopeIds: envelopeIds,
      }));
    }

    case 'MEMBERSHIP_ROLES_CHANGED': {
      if (!isOrganizer(current, event.groupId, envelope.actorId, envelope.actorAccountPublicKeyHex)) {
        return rejected(current, 'Only the current organizer can transfer group roles.');
      }
      const envelopeIds = await validateKeyEnvelopeBindings(current, event, keyEnvelopes);
      if (!envelopeIds) return rejected(current, 'Future protected group access is not bound to every current account.');
      return fromLifecycle(current, applyMembershipDecision(current.lifecycle, {
        type: 'CHANGE_MEMBERSHIP_ROLES',
        actorId: envelope.actorId,
        groupId: event.groupId,
        decidedAt: envelope.occurredAt,
        roles: event.roles,
        nextKeyVersion: event.nextKeyVersion,
        groupKeyEnvelopeIds: envelopeIds,
      }));
    }

    case 'GROUP_KEY_ROTATED': {
      if (!isOrganizer(current, event.groupId, envelope.actorId, envelope.actorAccountPublicKeyHex)) {
        return rejected(current, 'Only the current organizer can rotate protected group access.');
      }
      const envelopeIds = await validateKeyEnvelopeBindings(current, event, keyEnvelopes);
      if (!envelopeIds) return rejected(current, 'Future protected group access is not bound to every current account.');
      return fromLifecycle(current, applyMembershipDecision(current.lifecycle, {
        type: 'ROTATE_GROUP_KEY',
        actorId: envelope.actorId,
        groupId: event.groupId,
        decidedAt: envelope.occurredAt,
        nextKeyVersion: event.nextKeyVersion,
        groupKeyEnvelopeIds: envelopeIds,
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
    ...(value.causal ? {causal: canonicalCausal(value.causal)} : {}),
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
    case 'MEMBERSHIP_REMOVED':
      return nonempty(value.groupId)
        && nonempty(value.participantId)
        && validKeyRotation(value.nextKeyVersion, value.groupKeyEnvelopes);
    case 'MEMBERSHIP_ROLES_CHANGED':
      return nonempty(value.groupId)
        && validRoleRecord(value.roles)
        && validKeyRotation(value.nextKeyVersion, value.groupKeyEnvelopes);
    case 'GROUP_KEY_ROTATED':
      return nonempty(value.groupId)
        && validKeyRotation(value.nextKeyVersion, value.groupKeyEnvelopes);
    default: return false;
  }
}

function canonicalCausal(value: MembershipCausalV1): MembershipCausalV1 {
  const groupId = typeof value?.groupId === 'string' ? value.groupId.trim() : '';
  const parentEventId = value?.parentEventId === null
    ? null
    : typeof value?.parentEventId === 'string' && value.parentEventId.trim()
      ? value.parentEventId.trim()
      : undefined;
  const expectedFrontierHash = typeof value?.expectedFrontierHash === 'string'
    ? value.expectedFrontierHash.toLowerCase()
    : '';
  if (
    !groupId
    || !Number.isSafeInteger(value.expectedVersion)
    || value.expectedVersion < 0
    || parentEventId === undefined
    || !/^0x[0-9a-f]{64}$/u.test(expectedFrontierHash)
    || (value.expectedVersion === 0 && (parentEventId !== null || expectedFrontierHash !== ZERO_FRONTIER_HASH))
    || (value.expectedVersion > 0 && parentEventId === null)
  ) throw new Error('Invalid membership causal frontier.');
  return {groupId, expectedVersion: value.expectedVersion, parentEventId, expectedFrontierHash};
}

export function membershipEventGroupId(
  event: MembershipEventV1,
  state?: SignedMembershipState,
): string {
  switch (event.type) {
    case 'INVITATION_CREATED': return event.invitation.groupId.trim();
    case 'INVITATION_ACCEPTED': return event.acceptance.groupId.trim();
    case 'MEMBERSHIP_GRANTED': return event.handoff.groupId.trim();
    case 'MEMBERSHIP_REMOVED':
    case 'MEMBERSHIP_ROLES_CHANGED':
    case 'GROUP_KEY_ROTATED': return event.groupId.trim();
    case 'INVITATION_DECLINED':
    case 'INVITATION_REVOKED': return state?.lifecycle.invitations[event.invitationId]?.groupId ?? '';
  }
}

function requiresCausalAuthority(event: MembershipEventV1): boolean {
  return ['MEMBERSHIP_REMOVED', 'MEMBERSHIP_ROLES_CHANGED', 'GROUP_KEY_ROTATED'].includes(event.type);
}

async function nextMembershipFrontierHash(
  previousHash: string,
  event: SignedMembershipEventV1,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(stableSerialize(['chopdot:membership-frontier:v1', previousHash, event])),
  );
  return bytesToHex(new Uint8Array(digest));
}

function updateAuthorityIntervals(
  before: SignedMembershipState,
  after: SignedMembershipState,
  event: SignedMembershipEventV1,
  effectiveVersion: number,
): MembershipAuthorityIntervalV1[] {
  const intervals = before.authorityIntervals.map(interval => ({...interval}));
  const close = (groupId: string, participantId: string) => {
    let active: MembershipAuthorityIntervalV1 | undefined;
    for (let index = intervals.length - 1; index >= 0; index -= 1) {
      const interval = intervals[index];
      if (interval.groupId === groupId
        && interval.participantId === participantId
        && interval.effectiveUntilVersion === null) {
        active = interval;
        break;
      }
    }
    if (active) {
      active.effectiveUntilVersion = effectiveVersion;
      active.closedByEventId = event.eventId;
    }
  };
  const open = (grant: MembershipGrant) => {
    intervals.push({
      groupId: grant.groupId,
      participantId: grant.participantId,
      accountPublicKeyHex: normalizeKey(grant.accountPublicKeyHex),
      role: grant.role,
      effectiveFromVersion: effectiveVersion,
      effectiveUntilVersion: null,
      openedByEventId: event.eventId,
    });
  };

  switch (event.event.type) {
    case 'MEMBERSHIP_GRANTED': {
      const participantId = event.event.handoff.recipientId;
      const key = membershipKey(event.event.handoff.groupId, participantId);
      if (!before.lifecycle.memberships[key] && after.lifecycle.memberships[key]) open(after.lifecycle.memberships[key]);
      break;
    }
    case 'MEMBERSHIP_REMOVED':
      close(event.event.groupId, event.event.participantId);
      break;
    case 'MEMBERSHIP_ROLES_CHANGED':
      for (const [participantId, nextRole] of Object.entries(event.event.roles)) {
        const key = membershipKey(event.event.groupId, participantId);
        const prior = before.lifecycle.memberships[key];
        const next = after.lifecycle.memberships[key];
        if (prior && next && prior.role !== nextRole) {
          close(event.event.groupId, participantId);
          open(next);
        }
      }
      break;
    default:
      break;
  }
  return intervals;
}

function validKeyRotation(version: unknown, envelopes: unknown): envelopes is Record<string, MembershipKeyEnvelopeBindingV1> {
  return typeof version === 'number'
    && Number.isSafeInteger(version)
    && version > 1
    && isRecord(envelopes)
    && Object.keys(envelopes).length > 0
    && Object.entries(envelopes).every(([participantId, binding]) => isRecord(binding)
      && nonempty(participantId)
      && binding.participantId === participantId
      && Boolean(normalizeKey(binding.recipientAccountPublicKeyHex))
      && binding.keyVersion === version
      && nonempty(binding.groupKeyEnvelopeId));
}

function validRoleRecord(value: unknown): value is Record<string, 'organizer' | 'member'> {
  return isRecord(value)
    && Object.keys(value).length > 0
    && Object.entries(value).every(([participantId, role]) => nonempty(participantId) && ['organizer', 'member'].includes(role));
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

async function validateKeyEnvelopeBindings(
  state: SignedMembershipState,
  event: Extract<MembershipEventV1, {type: 'MEMBERSHIP_REMOVED' | 'MEMBERSHIP_ROLES_CHANGED' | 'GROUP_KEY_ROTATED'}>,
  resolver?: MembershipKeyEnvelopeResolver,
  removedParticipantId?: string,
): Promise<Record<string, string> | null> {
  if (!resolver) return null;
  const expected = Object.values(state.lifecycle.memberships)
    .filter(grant => grant.groupId === event.groupId && grant.participantId !== removedParticipantId)
    .sort((a, b) => a.participantId.localeCompare(b.participantId));
  const bindingIds = Object.keys(event.groupKeyEnvelopes).sort();
  if (stableSerialize(expected.map(grant => grant.participantId)) !== stableSerialize(bindingIds)) return null;
  const envelopeIds: Record<string, string> = {};
  for (const grant of expected) {
    const binding = event.groupKeyEnvelopes[grant.participantId];
    if (
      !binding
      || binding.participantId !== grant.participantId
      || normalizeKey(binding.recipientAccountPublicKeyHex) !== normalizeKey(grant.accountPublicKeyHex)
      || binding.keyVersion !== event.nextKeyVersion
      || !binding.groupKeyEnvelopeId.trim()
    ) return null;
    try {
      if (!await resolver.resolve({groupId: event.groupId, keyVersion: event.nextKeyVersion, binding})) return null;
    } catch {
      return null;
    }
    envelopeIds[grant.participantId] = binding.groupKeyEnvelopeId.trim();
  }
  return envelopeIds;
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

function conflicted(state: SignedMembershipState, reason: string): SignedMembershipTransition {
  return {state, outcome: 'conflict', reason};
}
