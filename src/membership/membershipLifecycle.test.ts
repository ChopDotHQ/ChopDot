import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyMembershipDecision,
  createMembershipLifecycleState,
  membershipKey,
  type MembershipDecision,
  type MembershipLifecycleState,
} from './membershipLifecycle.ts';

const now = '2026-08-12T12:00:00.000Z';
const later = '2026-08-13T12:00:00.000Z';
const leoKey = `0x${'22'.repeat(32)}`;

function invitationDecision(overrides: Partial<MembershipDecision & {type: 'INVITE_MEMBER'}> = {}): MembershipDecision {
  return {
    type: 'INVITE_MEMBER',
    actorId: 'mina',
    invitation: {
      invitationId: 'invite-leo',
      groupId: 'zurich-dinner',
      inviterId: 'mina',
      inviteeId: 'leo',
      inviteeAccountPublicKeyHex: leoKey,
      role: 'member',
      route: 'existing_friend',
      createdAt: now,
      expiresAt: later,
    },
    ...overrides,
  } as MembershipDecision;
}

function invitedState(): MembershipLifecycleState {
  return applyMembershipDecision(createMembershipLifecycleState(), invitationDecision()).state;
}

test('friendship creates only a pending invitation, never membership', () => {
  const result = applyMembershipDecision(createMembershipLifecycleState(), invitationDecision());
  assert.equal(result.outcome, 'applied');
  assert.equal(result.state.invitations['invite-leo'].status, 'invited');
  assert.deepEqual(result.state.memberships, {});
});

test('only the invited approved account can accept with protected group access', () => {
  const decision: MembershipDecision = {
    type: 'ACCEPT_INVITATION',
    actorId: 'leo',
    actorAccountPublicKeyHex: leoKey,
    invitationId: 'invite-leo',
    decidedAt: '2026-08-12T12:05:00.000Z',
    groupKeyEnvelopeId: 'envelope-leo-v1',
    keyVersion: 1,
  };
  const result = applyMembershipDecision(invitedState(), decision);
  assert.equal(result.outcome, 'applied');
  assert.equal(result.state.invitations['invite-leo'].status, 'accepted');
  assert.deepEqual(result.state.memberships[membershipKey('zurich-dinner', 'leo')], {
    groupId: 'zurich-dinner',
    participantId: 'leo',
    accountPublicKeyHex: leoKey,
    role: 'member',
    acceptedAt: '2026-08-12T12:05:00.000Z',
    invitationId: 'invite-leo',
    keyVersion: 1,
    groupKeyEnvelopeId: 'envelope-leo-v1',
  });
  assert.equal(applyMembershipDecision(result.state, decision).outcome, 'idempotent');
  assert.equal(applyMembershipDecision(result.state, {...decision, keyVersion: 2}).outcome, 'rejected');
  assert.equal(applyMembershipDecision(result.state, {...decision, groupKeyEnvelopeId: 'another-envelope'}).outcome, 'rejected');
  assert.equal(applyMembershipDecision(result.state, {
    ...decision, decidedAt: '2026-08-12T12:06:00.000Z',
  }).outcome, 'rejected');
});

test('wrong person, account, or missing envelope cannot accept', () => {
  const cases: MembershipDecision[] = [
    {
      type: 'ACCEPT_INVITATION', actorId: 'nina', actorAccountPublicKeyHex: leoKey,
      invitationId: 'invite-leo', decidedAt: now, groupKeyEnvelopeId: 'env', keyVersion: 1,
    },
    {
      type: 'ACCEPT_INVITATION', actorId: 'leo', actorAccountPublicKeyHex: `0x${'33'.repeat(32)}`,
      invitationId: 'invite-leo', decidedAt: now, groupKeyEnvelopeId: 'env', keyVersion: 1,
    },
    {
      type: 'ACCEPT_INVITATION', actorId: 'leo', actorAccountPublicKeyHex: leoKey,
      invitationId: 'invite-leo', decidedAt: now, groupKeyEnvelopeId: '', keyVersion: 1,
    },
  ];
  for (const decision of cases) {
    const result = applyMembershipDecision(invitedState(), decision);
    assert.equal(result.outcome, 'rejected');
    assert.deepEqual(result.state.memberships, {});
  }
});

test('invitee may decline and inviter may revoke, with honest terminal states', () => {
  const declined = applyMembershipDecision(invitedState(), {
    type: 'DECLINE_INVITATION', actorId: 'leo', invitationId: 'invite-leo', decidedAt: now,
  });
  assert.equal(declined.state.invitations['invite-leo'].status, 'declined');
  assert.equal(applyMembershipDecision(declined.state, {
    type: 'ACCEPT_INVITATION', actorId: 'leo', actorAccountPublicKeyHex: leoKey,
    invitationId: 'invite-leo', decidedAt: now, groupKeyEnvelopeId: 'env', keyVersion: 1,
  }).outcome, 'rejected');

  const revoked = applyMembershipDecision(invitedState(), {
    type: 'REVOKE_INVITATION', actorId: 'mina', invitationId: 'invite-leo', decidedAt: now,
  });
  assert.equal(revoked.state.invitations['invite-leo'].status, 'revoked');
});

test('expired invitation cannot be accepted', () => {
  const result = applyMembershipDecision(invitedState(), {
    type: 'ACCEPT_INVITATION', actorId: 'leo', actorAccountPublicKeyHex: leoKey,
    invitationId: 'invite-leo', decidedAt: '2026-08-14T12:00:00.000Z',
    groupKeyEnvelopeId: 'env', keyVersion: 1,
  });
  assert.equal(result.outcome, 'applied');
  assert.equal(result.state.invitations['invite-leo'].status, 'expired');
  assert.deepEqual(result.state.memberships, {});
});

test('duplicate route or identifier cannot create a second membership identity', () => {
  const first = applyMembershipDecision(createMembershipLifecycleState(), invitationDecision());
  assert.equal(applyMembershipDecision(first.state, invitationDecision()).outcome, 'idempotent');
  const conflict = invitationDecision({
    invitation: {
      ...(invitationDecision() as Extract<MembershipDecision, {type: 'INVITE_MEMBER'}>).invitation,
      inviteeId: 'nina',
      inviteeAccountPublicKeyHex: `0x${'33'.repeat(32)}`,
      route: 'join_link',
    },
  } as never);
  assert.equal(applyMembershipDecision(first.state, conflict).outcome, 'rejected');
});

test('existing contacts must be prebound to an approved account', () => {
  const unbound = invitationDecision({
    invitation: {
      ...(invitationDecision() as Extract<MembershipDecision, {type: 'INVITE_MEMBER'}>).invitation,
      inviteeAccountPublicKeyHex: undefined,
    },
  } as never);
  const result = applyMembershipDecision(createMembershipLifecycleState(), unbound);
  assert.equal(result.outcome, 'rejected');
  assert.match(result.reason ?? '', /approved account/u);

  const link = invitationDecision({
    invitation: {
      ...(unbound as Extract<MembershipDecision, {type: 'INVITE_MEMBER'}>).invitation,
      route: 'join_link',
    },
  } as never);
  assert.equal(applyMembershipDecision(createMembershipLifecycleState(), link).outcome, 'applied');
});

test('accept, decline, and revoke reject decisions dated before the invitation', () => {
  const before = '2026-08-12T11:59:59.000Z';
  const accept = applyMembershipDecision(invitedState(), {
    type: 'ACCEPT_INVITATION', actorId: 'leo', actorAccountPublicKeyHex: leoKey,
    invitationId: 'invite-leo', decidedAt: before, groupKeyEnvelopeId: 'env', keyVersion: 1,
  });
  assert.equal(accept.outcome, 'rejected');
  assert.equal(applyMembershipDecision(invitedState(), {
    type: 'DECLINE_INVITATION', actorId: 'leo', invitationId: 'invite-leo', decidedAt: before,
  }).outcome, 'rejected');
  assert.equal(applyMembershipDecision(invitedState(), {
    type: 'REVOKE_INVITATION', actorId: 'mina', invitationId: 'invite-leo', decidedAt: before,
  }).outcome, 'rejected');
});

test('no-app route stays action-scoped and cannot become membership', () => {
  const limited = invitationDecision({
    invitation: {
      ...(invitationDecision() as Extract<MembershipDecision, {type: 'INVITE_MEMBER'}>).invitation,
      role: 'limited',
      route: 'no_app_action',
    },
  } as never);
  const state = applyMembershipDecision(createMembershipLifecycleState(), limited).state;
  const accepted = applyMembershipDecision(state, {
    type: 'ACCEPT_INVITATION', actorId: 'leo', actorAccountPublicKeyHex: leoKey,
    invitationId: 'invite-leo', decidedAt: now, groupKeyEnvelopeId: 'env', keyVersion: 1,
  });
  assert.equal(accepted.outcome, 'rejected');
  assert.deepEqual(accepted.state.memberships, {});
});
