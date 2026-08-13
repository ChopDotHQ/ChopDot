import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  createGroupKeyHandoff,
  createMembershipAcceptance,
  verifyProductAccountSignature,
  type AccountMessageSigner,
} from './groupKeyHandoff.ts';
import type {GroupInvitation, MembershipGrant} from './membershipLifecycle.ts';
import {
  createSignedMembershipEvent,
  createSignedMembershipState,
} from './signedMembershipEvents.ts';
import {
  replaySignedMembershipJournal,
  SignedMembershipEventJournal,
} from './signedMembershipJournal.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

const groupId = 'zurich-dinner';
const expiresAt = '2099-08-13T12:00:00.000Z';

test('signed membership journal rebuilds accepted membership after provider recreation', async () => {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const leo = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  const account = (pair: typeof mina) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signer = (pair: typeof mina): AccountMessageSigner => ({signBytes: async data => sr25519Sign(data, pair)});
  const organizer: MembershipGrant = {
    groupId, participantId: 'mina', accountPublicKeyHex: account(mina), role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z', invitationId: 'group-created',
    keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const invite: GroupInvitation = {
    invitationId: 'invite-leo', groupId, inviterId: 'mina', inviteeId: 'leo',
    inviteeAccountPublicKeyHex: account(leo), role: 'member', route: 'existing_friend',
    status: 'invited', createdAt: '2026-08-12T12:01:00.000Z', expiresAt,
  };
  const pending = await createMembershipAcceptance({
    invitationId: invite.invitationId, groupId, recipientId: 'leo',
    recipientAccountPublicKeyHex: account(leo), nonce: 'journal-nonce', expiresAt,
    signer: signer(leo),
  });
  const handoff = await createGroupKeyHandoff({
    acceptance: pending.acceptance, verifyRecipient: verifyProductAccountSignature,
    groupKeyEnvelopeId: 'leo-envelope-v1',
    organizerId: 'mina', organizerAccountPublicKeyHex: account(mina), role: 'member',
    keyVersion: 1, groupKey: new Uint8Array(32).fill(9),
    createdAt: '2026-08-12T12:03:00.000Z', expiresAt, signer: signer(mina),
  });
  const events = [
    await createSignedMembershipEvent({
      eventId: 'event-invite', actorId: 'mina', actorAccountPublicKeyHex: account(mina),
      occurredAt: invite.createdAt, event: {type: 'INVITATION_CREATED', invitation: invite}, signer: signer(mina),
    }),
    await createSignedMembershipEvent({
      eventId: 'event-accept', actorId: 'leo', actorAccountPublicKeyHex: account(leo),
      occurredAt: '2026-08-12T12:02:00.000Z', event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
      signer: signer(leo),
    }),
    await createSignedMembershipEvent({
      eventId: 'event-grant', actorId: 'mina', actorAccountPublicKeyHex: account(mina),
      occurredAt: handoff.createdAt, event: {type: 'MEMBERSHIP_GRANTED', handoff, groupKeyEnvelopeId: 'leo-envelope-v1'},
      signer: signer(mina),
    }),
  ];

  const storage = new MemoryStorage();
  const journal = new SignedMembershipEventJournal(storage);
  let state = createSignedMembershipState([organizer]);
  for (const event of events) {
    const transition = await journal.accept(state, event);
    assert.equal(transition.outcome, 'applied');
    state = transition.state;
  }
  assert.equal(journal.list().length, 3);

  const recreated = new SignedMembershipEventJournal(storage);
  const restored = await replaySignedMembershipJournal(createSignedMembershipState([organizer]), recreated);
  assert.equal(restored.deferred.length, 0);
  assert.equal(restored.rejected.length, 0);
  assert.equal(restored.state.lifecycle.invitations['invite-leo'].status, 'accepted');
  assert.equal(restored.state.lifecycle.memberships[`${groupId}:leo`].accountPublicKeyHex, account(leo));
});

test('journal keeps first event id and fails visibly when storage drops an accepted write', async () => {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const account = `0x${Buffer.from(mina.publicKey).toString('hex')}`;
  const organizer: MembershipGrant = {
    groupId, participantId: 'mina', accountPublicKeyHex: account, role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z', invitationId: 'group-created',
    keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const invite: GroupInvitation = {
    invitationId: 'invite-one', groupId, inviterId: 'mina', inviteeId: 'leo',
    role: 'member', route: 'join_link', status: 'invited',
    createdAt: '2026-08-12T12:01:00.000Z', expiresAt,
  };
  const signer: AccountMessageSigner = {signBytes: async data => sr25519Sign(data, mina)};
  const original = await createSignedMembershipEvent({
    eventId: 'same-id', actorId: 'mina', actorAccountPublicKeyHex: account,
    occurredAt: invite.createdAt, event: {type: 'INVITATION_CREATED', invitation: invite}, signer,
  });
  const conflict = await createSignedMembershipEvent({
    eventId: 'same-id', actorId: 'mina', actorAccountPublicKeyHex: account,
    occurredAt: '2026-08-12T12:02:00.000Z', event: {type: 'INVITATION_REVOKED', invitationId: 'invite-one'}, signer,
  });
  const storage = new MemoryStorage();
  const journal = new SignedMembershipEventJournal(storage);
  const initial = createSignedMembershipState([organizer]);
  const accepted = await journal.accept(initial, original);
  assert.equal(accepted.outcome, 'applied');
  assert.equal((await journal.accept(accepted.state, conflict)).outcome, 'rejected');
  assert.equal(journal.list().length, 1);

  const dropping: KeyValueStorage = {read: () => null, write: () => undefined, remove: () => undefined};
  await assert.rejects(
    () => new SignedMembershipEventJournal(dropping).accept(initial, original),
    /could not be persisted/u,
  );
});
