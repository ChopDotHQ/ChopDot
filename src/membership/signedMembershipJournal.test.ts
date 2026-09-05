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
  createCausalSignedMembershipEvent,
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

test('membership journal corruption fails closed instead of replaying an empty authority history', () => {
  const storage = new MemoryStorage();
  storage.write('chopdot-signed-membership-events-v1', '{broken-json');
  assert.throws(() => new SignedMembershipEventJournal(storage).list(), /journal is corrupt/u);
  storage.write('chopdot-signed-membership-events-v1', '[{"v":1}]');
  assert.throws(() => new SignedMembershipEventJournal(storage).list(), /journal is corrupt/u);
});

test('legacy prefix migrates deterministically and no legacy event is admitted after the causal frontier', async () => {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const account = `0x${Buffer.from(mina.publicKey).toString('hex')}`;
  const organizer: MembershipGrant = {
    groupId, participantId: 'mina', accountPublicKeyHex: account, role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z', invitationId: 'group-created',
    keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const signer: AccountMessageSigner = {signBytes: async data => sr25519Sign(data, mina)};
  const legacyInvite = await createSignedMembershipEvent({
    eventId: 'legacy-invite', actorId: 'mina', actorAccountPublicKeyHex: account,
    occurredAt: '2026-08-12T12:01:00.000Z', signer,
    event: {type: 'INVITATION_CREATED', invitation: {
      invitationId: 'invite-migration', groupId, inviterId: 'mina', inviteeId: 'leo',
      inviteeAccountPublicKeyHex: `0x${'22'.repeat(32)}`, role: 'member', route: 'existing_friend',
      status: 'invited', createdAt: '2026-08-12T12:01:00.000Z', expiresAt,
    }},
  });
  const storage = new MemoryStorage();
  const journal = new SignedMembershipEventJournal(storage);
  const initial = createSignedMembershipState([organizer]);
  const invited = await journal.accept(initial, legacyInvite);
  assert.equal(invited.outcome, 'applied');
  const causalRevoke = await createCausalSignedMembershipEvent(invited.state, {
    groupId,
    eventId: 'causal-revoke', actorId: 'mina', actorAccountPublicKeyHex: account,
    occurredAt: '2026-08-12T12:02:00.000Z', signer,
    event: {type: 'INVITATION_REVOKED', invitationId: 'invite-migration'},
  });
  const live = await journal.accept(invited.state, causalRevoke);
  assert.equal(live.outcome, 'applied');
  assert.equal(live.state.groupFrontiers[groupId].version, 1);

  const lateLegacy = await createSignedMembershipEvent({
    eventId: 'late-legacy-invite', actorId: 'mina', actorAccountPublicKeyHex: account,
    occurredAt: '2026-08-12T12:03:00.000Z', signer,
    event: {type: 'INVITATION_CREATED', invitation: {
      invitationId: 'invite-after-migration', groupId, inviterId: 'mina', inviteeId: 'nina',
      inviteeAccountPublicKeyHex: `0x${'33'.repeat(32)}`, role: 'member', route: 'existing_friend',
      status: 'invited', createdAt: '2026-08-12T12:03:00.000Z', expiresAt,
    }},
  });
  const denied = await journal.accept(live.state, lateLegacy);
  assert.equal(denied.outcome, 'rejected');
  assert.match(denied.reason ?? '', /after a causal frontier/u);
  assert.equal(journal.list().length, 2);

  const restored = await replaySignedMembershipJournal(initial, new SignedMembershipEventJournal(storage));
  assert.deepEqual(restored.state, live.state);
  assert.deepEqual(restored.deferred, []);
  assert.deepEqual(restored.rejected, []);

  // Exact corrupt/mixed-journal repro: even if old software appended a legacy
  // action after migration, current replay rejects it instead of changing state.
  storage.write('chopdot-signed-membership-events-v1', JSON.stringify([legacyInvite, causalRevoke, lateLegacy]));
  const mixed = await replaySignedMembershipJournal(initial, new SignedMembershipEventJournal(storage));
  assert.deepEqual(mixed.state, live.state);
  assert.equal(mixed.rejected.length, 1);
  assert.equal(mixed.rejected[0].event.eventId, 'late-legacy-invite');
  assert.match(mixed.rejected[0].reason, /after the causal migration frontier/u);
});
