export type MembershipRole = 'organizer' | 'member' | 'limited';
export type InvitationStatus = 'invited' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type InvitationRoute = 'existing_friend' | 'known_identity' | 'join_link' | 'qr' | 'no_app_action';

export interface GroupInvitation {
  invitationId: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  inviteeAccountPublicKeyHex?: string;
  role: MembershipRole;
  route: InvitationRoute;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt?: string;
}

export interface MembershipGrant {
  groupId: string;
  participantId: string;
  accountPublicKeyHex: string;
  role: Exclude<MembershipRole, 'limited'>;
  acceptedAt: string;
  invitationId: string;
  keyVersion: number;
  groupKeyEnvelopeId: string;
}

export interface MembershipLifecycleState {
  invitations: Record<string, GroupInvitation>;
  memberships: Record<string, MembershipGrant>;
}

export type MembershipDecision =
  | {
      type: 'INVITE_MEMBER';
      actorId: string;
      invitation: Omit<GroupInvitation, 'status' | 'decidedAt'>;
    }
  | {
      type: 'ACCEPT_INVITATION';
      actorId: string;
      actorAccountPublicKeyHex: string;
      invitationId: string;
      decidedAt: string;
      groupKeyEnvelopeId: string;
      keyVersion: number;
    }
  | {
      type: 'DECLINE_INVITATION';
      actorId: string;
      invitationId: string;
      decidedAt: string;
    }
  | {
      type: 'REVOKE_INVITATION';
      actorId: string;
      invitationId: string;
      decidedAt: string;
    }
  | {
      type: 'EXPIRE_INVITATION';
      invitationId: string;
      decidedAt: string;
    };

export interface MembershipTransition {
  state: MembershipLifecycleState;
  outcome: 'applied' | 'idempotent' | 'rejected';
  reason?: string;
}

export function createMembershipLifecycleState(): MembershipLifecycleState {
  return {invitations: {}, memberships: {}};
}

export function membershipKey(groupId: string, participantId: string): string {
  return `${groupId.trim()}:${participantId.trim()}`;
}

export function applyMembershipDecision(
  current: MembershipLifecycleState,
  decision: MembershipDecision,
): MembershipTransition {
  switch (decision.type) {
    case 'INVITE_MEMBER': {
      const invitation = canonicalInvitation({...decision.invitation, status: 'invited'});
      if (!invitation || decision.actorId !== invitation.inviterId) {
        return rejected(current, 'Only the named inviter can create this invitation.');
      }
      const existing = current.invitations[invitation.invitationId];
      if (existing) {
        return sameInvitation(existing, invitation)
          ? {state: current, outcome: 'idempotent'}
          : rejected(current, 'Invitation identifier already belongs to another invitation.');
      }
      if (invitation.inviterId === invitation.inviteeId) {
        return rejected(current, 'A person cannot invite themselves.');
      }
      if (current.memberships[membershipKey(invitation.groupId, invitation.inviteeId)]) {
        return rejected(current, 'This person is already a member of the group.');
      }
      if (Object.values(current.memberships).some(grant =>
        grant.groupId === invitation.groupId
        && invitation.inviteeAccountPublicKeyHex
        && grant.accountPublicKeyHex === invitation.inviteeAccountPublicKeyHex)) {
        return rejected(current, 'This approved account is already a member of the group.');
      }
      if (Object.values(current.invitations).some(candidate =>
        candidate.groupId === invitation.groupId
        && (candidate.status === 'invited' || candidate.status === 'accepted')
        && (
          candidate.inviteeId === invitation.inviteeId
          || Boolean(
            invitation.inviteeAccountPublicKeyHex
            && candidate.inviteeAccountPublicKeyHex === invitation.inviteeAccountPublicKeyHex,
          )
        ))) {
        return rejected(current, 'This person already has an active invitation for the group.');
      }
      if (invitation.route === 'no_app_action' && invitation.role !== 'limited') {
        return rejected(current, 'A limited action cannot grant group membership.');
      }
      if (invitation.route !== 'no_app_action' && invitation.role === 'limited') {
        return rejected(current, 'Limited access must use a scoped action route.');
      }
      if (
        (invitation.route === 'existing_friend' || invitation.route === 'known_identity')
        && !invitation.inviteeAccountPublicKeyHex
      ) {
        return rejected(current, 'This contact invitation must name the approved account.');
      }
      return {
        state: {
          ...current,
          invitations: {...current.invitations, [invitation.invitationId]: invitation},
        },
        outcome: 'applied',
      };
    }

    case 'ACCEPT_INVITATION': {
      const invitation = current.invitations[decision.invitationId];
      if (!invitation || invitation.inviteeId !== decision.actorId) {
        return rejected(current, 'Only the invited person can accept.');
      }
      if (invitation.role === 'limited' || invitation.route === 'no_app_action') {
        return rejected(current, 'This invitation permits only the named action.');
      }
      if (invitation.status === 'accepted') {
        const existing = current.memberships[membershipKey(invitation.groupId, invitation.inviteeId)];
        return existing
          && sameGrant(existing, invitation, decision)
          ? {state: current, outcome: 'idempotent'}
          : rejected(current, 'Accepted membership does not match this protected access grant.');
      }
      if (invitation.status !== 'invited') return rejected(current, `Invitation is ${invitation.status}.`);
      if (!isTimestamp(decision.decidedAt) || Date.parse(decision.decidedAt) < Date.parse(invitation.createdAt)) {
        return rejected(current, 'Decision time is invalid.');
      }
      if (isExpired(invitation, decision.decidedAt)) {
        return expireInvitation(current, invitation, decision.decidedAt);
      }
      const accountPublicKeyHex = normalizeKey(decision.actorAccountPublicKeyHex);
      if (!accountPublicKeyHex) return rejected(current, 'An approved account is required.');
      if (
        invitation.inviteeAccountPublicKeyHex
        && invitation.inviteeAccountPublicKeyHex !== accountPublicKeyHex
      ) {
        return rejected(current, 'This invitation belongs to another account.');
      }
      if (!decision.groupKeyEnvelopeId.trim() || !Number.isSafeInteger(decision.keyVersion) || decision.keyVersion < 1) {
        return rejected(current, 'Protected group access is required.');
      }

      const key = membershipKey(invitation.groupId, invitation.inviteeId);
      const existing = current.memberships[key];
      if (existing) {
        return sameGrant(existing, invitation, decision)
          ? {state: current, outcome: 'idempotent'}
          : rejected(current, 'This person already has another protected access grant.');
      }
      const accepted = {...invitation, status: 'accepted' as const, decidedAt: decision.decidedAt};
      const grant: MembershipGrant = {
        groupId: invitation.groupId,
        participantId: invitation.inviteeId,
        accountPublicKeyHex,
        role: invitation.role,
        acceptedAt: decision.decidedAt,
        invitationId: invitation.invitationId,
        keyVersion: decision.keyVersion,
        groupKeyEnvelopeId: decision.groupKeyEnvelopeId.trim(),
      };
      return {
        state: {
          invitations: {...current.invitations, [invitation.invitationId]: accepted},
          memberships: {...current.memberships, [key]: grant},
        },
        outcome: 'applied',
      };
    }

    case 'DECLINE_INVITATION': {
      const invitation = current.invitations[decision.invitationId];
      if (!invitation || invitation.inviteeId !== decision.actorId) {
        return rejected(current, 'Only the invited person can decline.');
      }
      return decideWithoutMembership(current, invitation, 'declined', decision.decidedAt);
    }

    case 'REVOKE_INVITATION': {
      const invitation = current.invitations[decision.invitationId];
      if (!invitation || invitation.inviterId !== decision.actorId) {
        return rejected(current, 'Only the inviter can revoke this invitation.');
      }
      return decideWithoutMembership(current, invitation, 'revoked', decision.decidedAt);
    }

    case 'EXPIRE_INVITATION': {
      const invitation = current.invitations[decision.invitationId];
      if (!invitation || !isExpired(invitation, decision.decidedAt)) {
        return rejected(current, 'Invitation has not expired.');
      }
      return expireInvitation(current, invitation, decision.decidedAt);
    }
  }
}

function decideWithoutMembership(
  current: MembershipLifecycleState,
  invitation: GroupInvitation,
  status: 'declined' | 'revoked',
  decidedAt: string,
): MembershipTransition {
  if (invitation.status === status) return {state: current, outcome: 'idempotent'};
  if (invitation.status !== 'invited') return rejected(current, `Invitation is ${invitation.status}.`);
  if (!isTimestamp(decidedAt) || Date.parse(decidedAt) < Date.parse(invitation.createdAt)) {
    return rejected(current, 'Decision time is invalid.');
  }
  if (isExpired(invitation, decidedAt)) return expireInvitation(current, invitation, decidedAt);
  return {
    state: {
      ...current,
      invitations: {
        ...current.invitations,
        [invitation.invitationId]: {...invitation, status, decidedAt},
      },
    },
    outcome: 'applied',
  };
}

function expireInvitation(
  current: MembershipLifecycleState,
  invitation: GroupInvitation,
  decidedAt: string,
): MembershipTransition {
  if (invitation.status === 'expired') return {state: current, outcome: 'idempotent'};
  if (invitation.status !== 'invited') return rejected(current, `Invitation is ${invitation.status}.`);
  return {
    state: {
      ...current,
      invitations: {
        ...current.invitations,
        [invitation.invitationId]: {...invitation, status: 'expired', decidedAt},
      },
    },
    outcome: 'applied',
  };
}

function canonicalInvitation(value: GroupInvitation): GroupInvitation | null {
  const invitation: GroupInvitation = {
    ...value,
    invitationId: value.invitationId.trim(),
    groupId: value.groupId.trim(),
    inviterId: value.inviterId.trim(),
    inviteeId: value.inviteeId.trim(),
    ...(value.inviteeAccountPublicKeyHex
      ? {inviteeAccountPublicKeyHex: normalizeKey(value.inviteeAccountPublicKeyHex) || undefined}
      : {}),
  };
  if (
    !invitation.invitationId
    || !invitation.groupId
    || !invitation.inviterId
    || !invitation.inviteeId
    || !isTimestamp(invitation.createdAt)
    || !isTimestamp(invitation.expiresAt)
    || Date.parse(invitation.expiresAt) <= Date.parse(invitation.createdAt)
    || !['organizer', 'member', 'limited'].includes(invitation.role)
    || !['existing_friend', 'known_identity', 'join_link', 'qr', 'no_app_action'].includes(invitation.route)
    || (value.inviteeAccountPublicKeyHex !== undefined && !invitation.inviteeAccountPublicKeyHex)
  ) return null;
  return invitation;
}

function sameInvitation(a: GroupInvitation, b: GroupInvitation): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameGrant(
  existing: MembershipGrant,
  invitation: GroupInvitation,
  decision: Extract<MembershipDecision, {type: 'ACCEPT_INVITATION'}>,
): boolean {
  return existing.groupId === invitation.groupId
    && existing.participantId === invitation.inviteeId
    && existing.accountPublicKeyHex === normalizeKey(decision.actorAccountPublicKeyHex)
    && existing.role === invitation.role
    && existing.acceptedAt === decision.decidedAt
    && existing.invitationId === invitation.invitationId
    && existing.keyVersion === decision.keyVersion
    && existing.groupKeyEnvelopeId === decision.groupKeyEnvelopeId.trim();
}

function isExpired(invitation: GroupInvitation, at: string): boolean {
  return isTimestamp(at) && Date.parse(at) >= Date.parse(invitation.expiresAt);
}

function isTimestamp(value: string): boolean {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function normalizeKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function rejected(state: MembershipLifecycleState, reason: string): MembershipTransition {
  return {state, outcome: 'rejected', reason};
}
