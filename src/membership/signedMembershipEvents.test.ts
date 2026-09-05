import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {
  createGroupKeyHandoff,
  createMembershipAcceptance,
  verifyProductAccountSignature,
  type AccountMessageSigner,
} from './groupKeyHandoff.ts';
import type {GroupInvitation, MembershipGrant} from './membershipLifecycle.ts';
import {
  applySignedMembershipEvent,
  createSignedMembershipEvent,
  createSignedMembershipState,
  membershipEventFrontier,
  type SignedMembershipEventV1,
  type SignedMembershipState,
} from './signedMembershipEvents.ts';

const groupId = 'zurich-dinner';
const minaId = 'mina';
const leoId = 'leo';
const expiresAt = '2099-08-13T12:00:00.000Z';

let minaPair: ReturnType<typeof sr25519PairFromSeed>;
let leoPair: ReturnType<typeof sr25519PairFromSeed>;
let ninaPair: ReturnType<typeof sr25519PairFromSeed>;

test.before(async () => {
  await cryptoWaitReady();
  minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  leoPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  ninaPair = sr25519PairFromSeed(new Uint8Array(32).fill(33));
});

function account(pair: ReturnType<typeof sr25519PairFromSeed>): string {
  return `0x${Buffer.from(pair.publicKey).toString('hex')}`;
}

function signer(pair: ReturnType<typeof sr25519PairFromSeed>): AccountMessageSigner {
  return {signBytes: async data => sr25519Sign(data, pair)};
}

function organizerGrant(): MembershipGrant {
  return {
    groupId,
    participantId: minaId,
    accountPublicKeyHex: account(minaPair),
    role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z',
    invitationId: 'group-created',
    keyVersion: 1,
    groupKeyEnvelopeId: 'mina-envelope-v1',
  };
}

function invitation(id = 'invite-leo'): GroupInvitation {
  return {
    invitationId: id,
    groupId,
    inviterId: minaId,
    inviteeId: leoId,
    inviteeAccountPublicKeyHex: account(leoPair),
    role: 'member',
    route: 'existing_friend',
    status: 'invited',
    createdAt: '2026-08-12T12:01:00.000Z',
    expiresAt,
  };
}

async function signed(input: {
  eventId: string;
  actorId: string;
  pair: ReturnType<typeof sr25519PairFromSeed>;
  occurredAt: string;
  event: Parameters<typeof createSignedMembershipEvent>[0]['event'];
}): Promise<SignedMembershipEventV1> {
  return createSignedMembershipEvent({
    eventId: input.eventId,
    actorId: input.actorId,
    actorAccountPublicKeyHex: account(input.pair),
    occurredAt: input.occurredAt,
    event: input.event,
    signer: signer(input.pair),
  });
}

async function inviteLeo(state = createSignedMembershipState([organizerGrant()])) {
  const envelope = await signed({
    eventId: 'event-invite-leo', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-12T12:01:00.000Z',
    event: {type: 'INVITATION_CREATED', invitation: invitation()},
  });
  const transition = await applySignedMembershipEvent(state, envelope);
  assert.equal(transition.outcome, 'applied');
  return {state: transition.state, envelope};
}

async function acceptanceAndHandoff() {
  const pending = await createMembershipAcceptance({
    invitationId: 'invite-leo', groupId, recipientId: leoId,
    recipientAccountPublicKeyHex: account(leoPair), nonce: 'nonce-leo', expiresAt,
    signer: signer(leoPair),
  });
  const handoff = await createGroupKeyHandoff({
    acceptance: pending.acceptance,
    verifyRecipient: verifyProductAccountSignature,
    groupKeyEnvelopeId: 'leo-envelope-v1',
    organizerId: minaId,
    organizerAccountPublicKeyHex: account(minaPair),
    role: 'member',
    keyVersion: 1,
    groupKey: new Uint8Array(32).fill(7),
    createdAt: '2026-08-12T12:03:00.000Z',
    expiresAt,
    signer: signer(minaPair),
  });
  return {pending, handoff};
}

test('Mina invite, Leo acceptance, and Mina protected grant create one membership', async () => {
  const invited = await inviteLeo();
  const {pending, handoff} = await acceptanceAndHandoff();
  const acceptedEnvelope = await signed({
    eventId: 'event-accept-leo', actorId: leoId, pair: leoPair,
    occurredAt: '2026-08-12T12:02:00.000Z',
    event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
  });
  const accepted = await applySignedMembershipEvent(invited.state, acceptedEnvelope);
  assert.equal(accepted.outcome, 'applied');
  assert.equal(accepted.state.lifecycle.memberships[`${groupId}:${leoId}`], undefined);
  assert.equal(accepted.state.lifecycle.invitations['invite-leo'].status, 'invited');

  const duplicateAcceptance = await signed({
    eventId: 'event-accept-leo-duplicate', actorId: leoId, pair: leoPair,
    occurredAt: '2026-08-12T12:02:30.000Z',
    event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
  });
  const duplicate = await applySignedMembershipEvent(accepted.state, duplicateAcceptance);
  assert.equal(duplicate.outcome, 'idempotent');
  assert.equal(duplicate.state.events[duplicateAcceptance.eventId], undefined);

  const grantEnvelope = await signed({
    eventId: 'event-grant-leo', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-12T12:03:00.000Z',
    event: {type: 'MEMBERSHIP_GRANTED', handoff, groupKeyEnvelopeId: 'leo-envelope-v1'},
  });
  const granted = await applySignedMembershipEvent(accepted.state, grantEnvelope);
  assert.equal(granted.outcome, 'applied');
  assert.equal(granted.state.lifecycle.invitations['invite-leo'].status, 'accepted');
  assert.deepEqual(granted.state.lifecycle.memberships[`${groupId}:${leoId}`], {
    groupId,
    participantId: leoId,
    accountPublicKeyHex: account(leoPair),
    role: 'member',
    acceptedAt: '2026-08-12T12:03:00.000Z',
    invitationId: 'invite-leo',
    keyVersion: 1,
    groupKeyEnvelopeId: 'leo-envelope-v1',
  });

  const replay = await applySignedMembershipEvent(granted.state, grantEnvelope);
  assert.equal(replay.outcome, 'idempotent');
  assert.equal(Object.keys(replay.state.lifecycle.memberships).length, 2);
  assert.match(await membershipEventFrontier(replay.state), /^0x[0-9a-f]{64}$/u);

  const substitutedEnvelopeId = await signed({
    eventId: 'event-grant-substituted', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-12T12:03:00.000Z',
    event: {type: 'MEMBERSHIP_GRANTED', handoff, groupKeyEnvelopeId: 'another-envelope'},
  });
  assert.equal((await applySignedMembershipEvent(accepted.state, substitutedEnvelopeId)).outcome, 'rejected');
});

test('acceptance alone never grants membership and an early grant remains retryable', async () => {
  const invited = await inviteLeo();
  const {pending, handoff} = await acceptanceAndHandoff();
  const grantEnvelope = await signed({
    eventId: 'event-grant-early', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-12T12:03:00.000Z',
    event: {type: 'MEMBERSHIP_GRANTED', handoff, groupKeyEnvelopeId: 'leo-envelope-v1'},
  });
  const early = await applySignedMembershipEvent(invited.state, grantEnvelope);
  assert.equal(early.outcome, 'deferred');
  assert.equal(early.state.events[grantEnvelope.eventId], undefined);

  const acceptedEnvelope = await signed({
    eventId: 'event-accept-later', actorId: leoId, pair: leoPair,
    occurredAt: '2026-08-12T12:02:00.000Z',
    event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
  });
  const accepted = await applySignedMembershipEvent(invited.state, acceptedEnvelope);
  assert.equal(accepted.outcome, 'applied');
  assert.equal(accepted.state.lifecycle.memberships[`${groupId}:${leoId}`], undefined);
  const retried = await applySignedMembershipEvent(accepted.state, grantEnvelope);
  assert.equal(retried.outcome, 'applied');
});

test('wrong outer account, tamper, and conflicting event id cannot change membership', async () => {
  const invited = await inviteLeo();
  const {pending} = await acceptanceAndHandoff();
  const wrongAccount = await signed({
    eventId: 'event-wrong-account', actorId: leoId, pair: ninaPair,
    occurredAt: '2026-08-12T12:02:00.000Z',
    event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
  });
  assert.equal((await applySignedMembershipEvent(invited.state, wrongAccount)).outcome, 'rejected');

  const beforeInvitation = await signed({
    eventId: 'event-before-invite', actorId: leoId, pair: leoPair,
    occurredAt: '2026-08-12T12:00:59.000Z',
    event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
  });
  assert.equal((await applySignedMembershipEvent(invited.state, beforeInvitation)).outcome, 'rejected');

  const valid = await signed({
    eventId: 'event-decline', actorId: leoId, pair: leoPair,
    occurredAt: '2026-08-12T12:02:00.000Z',
    event: {type: 'INVITATION_DECLINED', invitationId: 'invite-leo'},
  });
  const declined = await applySignedMembershipEvent(invited.state, valid);
  assert.equal(declined.outcome, 'applied');
  const conflicting = await signed({
    eventId: 'event-decline', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-12T12:03:00.000Z',
    event: {type: 'INVITATION_REVOKED', invitationId: 'invite-leo'},
  });
  const conflict = await applySignedMembershipEvent(declined.state, conflicting);
  assert.equal(conflict.outcome, 'rejected');
  assert.equal(conflict.state.lifecycle.invitations['invite-leo'].status, 'declined');

  const tampered = structuredClone(valid);
  tampered.event = {type: 'INVITATION_REVOKED', invitationId: 'invite-leo'};
  assert.equal((await applySignedMembershipEvent(invited.state, tampered)).outcome, 'rejected');
});

test('Leo may decline and Mina may revoke without creating membership', async () => {
  const first = await inviteLeo();
  const declinedEnvelope = await signed({
    eventId: 'event-decline-leo', actorId: leoId, pair: leoPair,
    occurredAt: '2026-08-12T12:02:00.000Z',
    event: {type: 'INVITATION_DECLINED', invitationId: 'invite-leo'},
  });
  const declined = await applySignedMembershipEvent(first.state, declinedEnvelope);
  assert.equal(declined.outcome, 'applied');
  assert.equal(declined.state.lifecycle.invitations['invite-leo'].status, 'declined');
  assert.equal(declined.state.lifecycle.memberships[`${groupId}:${leoId}`], undefined);

  const secondInvite = {
    ...invitation('invite-leo-2'),
    createdAt: '2026-08-12T12:04:00.000Z',
  };
  const secondEnvelope = await signed({
    eventId: 'event-invite-leo-2', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-12T12:04:00.000Z',
    event: {type: 'INVITATION_CREATED', invitation: secondInvite},
  });
  const second = await applySignedMembershipEvent(declined.state, secondEnvelope);
  assert.equal(second.outcome, 'applied');
  const revokeEnvelope = await signed({
    eventId: 'event-revoke-leo-2', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-12T12:05:00.000Z',
    event: {type: 'INVITATION_REVOKED', invitationId: 'invite-leo-2'},
  });
  const revoked = await applySignedMembershipEvent(second.state, revokeEnvelope);
  assert.equal(revoked.outcome, 'applied');
  assert.equal(revoked.state.lifecycle.invitations['invite-leo-2'].status, 'revoked');
});

test('event frontier is deterministic across object reconstruction', async () => {
  const {state} = await inviteLeo();
  const reconstructed: SignedMembershipState = structuredClone(state);
  assert.equal(await membershipEventFrontier(state), await membershipEventFrontier(reconstructed));
});
