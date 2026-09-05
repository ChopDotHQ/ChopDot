import {membershipKey, type InvitationStatus} from '../../membership/membershipLifecycle.ts';
import type {SignedMembershipState} from '../../membership/signedMembershipEvents.ts';

export type MembershipInvitationUiStatus =
  | 'idle'
  | 'pending'
  | 'ready_to_grant'
  | 'accepted_waiting_grant'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired'
  | 'grant_failed';

export function projectMembershipInvitationStatus(input: {
  state: SignedMembershipState;
  invitationId: string;
  groupId: string;
  participantId: string;
}): MembershipInvitationUiStatus {
  const invitation = input.state.lifecycle.invitations[input.invitationId];
  if (!invitation) return 'idle';

  const membership = input.state.lifecycle.memberships[membershipKey(input.groupId, input.participantId)];
  if (invitation.status === 'accepted') {
    return membership?.invitationId === input.invitationId ? 'accepted' : 'grant_failed';
  }
  if (membership?.invitationId === input.invitationId) return 'grant_failed';
  if (input.state.pendingAcceptances[input.invitationId]) return 'ready_to_grant';
  return invitationStatusToUi(invitation.status);
}

function invitationStatusToUi(status: InvitationStatus): MembershipInvitationUiStatus {
  switch (status) {
    case 'invited': return 'pending';
    case 'accepted': return 'grant_failed';
    case 'declined': return 'declined';
    case 'revoked': return 'revoked';
    case 'expired': return 'expired';
  }
}
