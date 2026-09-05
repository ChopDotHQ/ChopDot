import assert from 'node:assert/strict';
import test from 'node:test';
import type {GroupInvitation, MembershipGrant} from '../../membership/membershipLifecycle.ts';
import {createSignedMembershipState} from '../../membership/signedMembershipEvents.ts';
import {projectMembershipInvitationStatus} from './membershipInvitationView.ts';

const invitation: GroupInvitation = {
  invitationId: 'invite-leo', groupId: 'zurich-dinner', inviterId: 'mina', inviteeId: 'leo',
  inviteeAccountPublicKeyHex: `0x${'22'.repeat(32)}`, role: 'member', route: 'existing_friend',
  status: 'invited', createdAt: '2026-08-12T12:00:00.000Z', expiresAt: '2099-08-13T12:00:00.000Z',
};

const project = (state: ReturnType<typeof createSignedMembershipState>) => projectMembershipInvitationStatus({
  state, invitationId: invitation.invitationId, groupId: invitation.groupId, participantId: invitation.inviteeId,
});

test('friendship without a signed invitation remains idle', () => {
  assert.equal(project(createSignedMembershipState()), 'idle');
});

test('recipient acceptance becomes ready for an organizer grant, never accepted membership', () => {
  const state = createSignedMembershipState();
  state.lifecycle.invitations[invitation.invitationId] = invitation;
  assert.equal(project(state), 'pending');
  state.pendingAcceptances[invitation.invitationId] = {} as never;
  assert.equal(project(state), 'ready_to_grant');
});

test('accepted UI requires the matching membership grant', () => {
  const state = createSignedMembershipState();
  state.lifecycle.invitations[invitation.invitationId] = {...invitation, status: 'accepted'};
  assert.equal(project(state), 'grant_failed');
  const grant: MembershipGrant = {
    groupId: invitation.groupId, participantId: invitation.inviteeId,
    accountPublicKeyHex: invitation.inviteeAccountPublicKeyHex!, role: 'member',
    acceptedAt: '2026-08-12T12:03:00.000Z', invitationId: invitation.invitationId,
    keyVersion: 1, groupKeyEnvelopeId: 'leo-envelope-v1',
  };
  state.lifecycle.memberships[`${invitation.groupId}:${invitation.inviteeId}`] = grant;
  assert.equal(project(state), 'accepted');
});

test('declined signed invitation never appears accepted', () => {
  const state = createSignedMembershipState();
  state.lifecycle.invitations[invitation.invitationId] = {...invitation, status: 'declined'};
  assert.equal(project(state), 'declined');
});
