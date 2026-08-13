import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import type {SignedMembershipEventV1} from './signedMembershipEvents.ts';
import {
  TrustedContactInvitationCoordinator,
  type MembershipEventDelivery,
  type PendingAcceptanceRecord,
  type PendingAcceptanceVault,
  type ProtectedGroupKeySink,
  type TrustedContactAccount,
  type TrustedContactAccountResolver,
} from './trustedContactInvitationCoordinator.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class MemoryPendingAcceptanceVault implements PendingAcceptanceVault {
  values = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, record: PendingAcceptanceRecord) { this.values.set(id, record); }
  async remove(id: string) { this.values.delete(id); }
}

class MemoryProtectedKeySink implements ProtectedGroupKeySink {
  values: Array<Parameters<ProtectedGroupKeySink['save']>[0]> = [];
  async save(value: Parameters<ProtectedGroupKeySink['save']>[0]) {
    const existing = this.values.find(candidate => candidate.groupKeyEnvelopeId === value.groupKeyEnvelopeId);
    if (!existing) this.values.push({...value, groupKey: new Uint8Array(value.groupKey)});
  }
  async has(value: Parameters<NonNullable<ProtectedGroupKeySink['has']>>[0]) {
    return this.values.some(candidate => candidate.groupId === value.groupId
      && candidate.participantId === value.participantId
      && candidate.accountPublicKeyHex === value.accountPublicKeyHex
      && candidate.keyVersion === value.keyVersion
      && candidate.groupKeyEnvelopeId === value.groupKeyEnvelopeId);
  }
}

class StaticContacts implements TrustedContactAccountResolver {
  constructor(private readonly byRoomAndContact: Map<string, TrustedContactAccount>) {}
  async resolve(input: {selectedRoomId: string; contactId: string}) {
    return this.byRoomAndContact.get(`${input.selectedRoomId}:${input.contactId}`) ?? null;
  }
}

const groupId = 'zurich-dinner';
const expiresAt = '2099-08-13T12:00:00.000Z';
const groupKey = new Uint8Array(32).fill(7);

test('Mina and Leo complete the signed existing-contact ceremony through separate local transports', async () => {
  const harness = await createHarness();
  await harness.mina.inviteExistingContact(inviteInput(harness.leoAccount));
  assert.equal(harness.mina.pendingDeliveryCount(), 1);
  await harness.flushMina();
  assert.equal(harness.leo.state.lifecycle.invitations['invite-leo'].status, 'invited');
  assert.equal(harness.leo.state.lifecycle.memberships[`${groupId}:leo`], undefined);

  await harness.leo.acceptInvitation({
    invitationId: 'invite-leo', eventId: 'event-accept-leo', nonce: 'nonce-leo',
    acceptedAt: '2026-08-12T12:02:00.000Z',
  });
  await harness.flushLeo();
  assert.equal(harness.mina.state.pendingAcceptances['invite-leo'].recipientAccountPublicKeyHex, harness.leoAccount);
  assert.equal(harness.mina.state.lifecycle.memberships[`${groupId}:leo`], undefined);

  await harness.mina.grantAcceptedInvitation({
    invitationId: 'invite-leo', eventId: 'event-grant-leo', groupKeyEnvelopeId: 'leo-envelope-v1',
    keyVersion: 1, groupKey, createdAt: '2026-08-12T12:03:00.000Z', expiresAt,
  });
  await harness.flushMina();
  assert.equal(harness.leo.state.lifecycle.invitations['invite-leo'].status, 'accepted');
  assert.equal(harness.leo.state.lifecycle.memberships[`${groupId}:leo`].accountPublicKeyHex, harness.leoAccount);
  assert.deepEqual(harness.leoKeys.values[0].groupKey, groupKey);
});

test('room and peer are delivery metadata, while resolver-backed Product Accounts control authority', async () => {
  const harness = await createHarness();
  await assert.rejects(
    () => harness.mina.inviteExistingContact(inviteInput(`0x${'33'.repeat(32)}`)),
    /does not match/u,
  );
  const invite = await harness.mina.inviteExistingContact(inviteInput(harness.leoAccount));
  const accepted = await harness.leo.receive({roomId: 'friends-room', peer: 'completely-untrusted-peer-label', event: invite});
  assert.equal(accepted.outcome, 'applied');

  const wrongRoom = await createHarness();
  const rejected = await wrongRoom.leo.receive({roomId: 'another-room', peer: 'mina', event: invite});
  assert.equal(rejected.outcome, 'rejected');
  assert.equal(rejected.state.lifecycle.invitations['invite-leo'], undefined);

  const tampered = structuredClone(invite);
  if (tampered.event.type !== 'INVITATION_CREATED') throw new Error('Expected invitation.');
  tampered.event.invitation.inviteeAccountPublicKeyHex = `0x${'33'.repeat(32)}`;
  assert.equal((await harness.leo.receive({roomId: 'friends-room', peer: 'mina', event: tampered})).outcome, 'rejected');
});

test('offline delivery retries the exact signed event and restart preserves acceptance until grant', async () => {
  const harness = await createHarness();
  const invite = await harness.mina.inviteExistingContact(inviteInput(harness.leoAccount));
  harness.minaOnline = false;
  assert.deepEqual(await harness.mina.flush(), {delivered: [], pending: [harness.minaDeliveryId(invite)]});
  assert.equal(harness.leo.state.lifecycle.invitations['invite-leo'], undefined);
  harness.minaOnline = true;
  await harness.flushMina();

  const acceptance = await harness.leo.acceptInvitation({
    invitationId: 'invite-leo', eventId: 'event-accept-leo', nonce: 'nonce-leo',
    acceptedAt: '2026-08-12T12:02:00.000Z',
  });
  const replayAcceptance = await harness.leo.acceptInvitation({
    invitationId: 'invite-leo', eventId: 'unused-new-id', nonce: 'unused-new-nonce',
    acceptedAt: '2026-08-12T12:02:30.000Z',
  });
  assert.deepEqual(replayAcceptance, acceptance);

  harness.leoOnline = false;
  assert.equal((await harness.leo.flush()).pending.length, 1);
  const restartedLeo = harness.restartLeo();
  await restartedLeo.restore();
  assert.equal(restartedLeo.state.pendingAcceptances['invite-leo'].invitationId, 'invite-leo');
  assert.equal(restartedLeo.state.lifecycle.memberships[`${groupId}:leo`], undefined);
  harness.leo = restartedLeo;
  harness.leoOnline = true;
  await harness.flushLeo();

  await harness.mina.grantAcceptedInvitation({
    invitationId: 'invite-leo', eventId: 'event-grant-leo', groupKeyEnvelopeId: 'leo-envelope-v1',
    keyVersion: 1, groupKey, createdAt: '2026-08-12T12:03:00.000Z', expiresAt,
  });
  const grant = harness.lastMinaEvent();
  await harness.flushMina();
  assert.equal(harness.leoKeys.values.length, 1);
  assert.equal((await harness.leo.receive({roomId: 'friends-room', peer: 'replay-peer', event: grant})).outcome, 'idempotent');
  assert.equal(harness.leoKeys.values.length, 1);
});

test('recipient defers an early grant, converges when acceptance arrives, and restores access idempotently', async () => {
  const harness = await createHarness();
  await harness.mina.inviteExistingContact(inviteInput(harness.leoAccount));
  await harness.flushMina();
  const acceptance = await harness.leo.acceptInvitation({
    invitationId: 'invite-leo', eventId: 'event-accept-leo', nonce: 'nonce-leo',
    acceptedAt: '2026-08-12T12:02:00.000Z',
  });
  await harness.flushLeo();
  const grant = await harness.mina.grantAcceptedInvitation({
    invitationId: 'invite-leo', eventId: 'event-grant-leo', groupKeyEnvelopeId: 'leo-envelope-v1',
    keyVersion: 1, groupKey, createdAt: '2026-08-12T12:03:00.000Z', expiresAt,
  });
  const reordered = harness.restartLeoWithoutAcceptedJournal();
  const early = await reordered.receive({
    roomId: 'friends-room', peer: 'opaque-mina', event: grant,
    now: '2026-08-12T12:03:30.000Z',
  });
  assert.equal(early.outcome, 'deferred');
  assert.equal(early.membershipActive, false);
  assert.equal(harness.leoKeys.values.length, 0);

  const converged = await reordered.receive({
    roomId: 'friends-room', peer: 'opaque-leo-loopback', event: acceptance,
    now: '2026-08-12T12:04:00.000Z',
  });
  assert.equal(converged.outcome, 'applied');
  assert.equal(converged.membershipActive, true);
  assert.equal(converged.groupKeyStored, true);
  assert.equal(harness.leoKeys.values.length, 1);

  harness.leo = reordered;
  const restarted = harness.restartLeo();
  const restored = await restarted.restore('2026-08-12T12:05:00.000Z');
  assert.deepEqual(restored.readyInvitationIds, ['invite-leo']);
  assert.equal(harness.leoKeys.values.length, 1);
  assert.equal((await restarted.receive({
    roomId: 'friends-room', peer: 'duplicate', event: grant,
    now: '2026-08-12T12:06:00.000Z',
  })).membershipActive, true);
  assert.equal(harness.leoKeys.values.length, 1);
});

test('expired inbound protected grant is rejected before journal or membership state changes', async () => {
  const harness = await createHarness();
  await harness.mina.inviteExistingContact(inviteInput(harness.leoAccount));
  await harness.flushMina();
  await harness.leo.acceptInvitation({
    invitationId: 'invite-leo', eventId: 'event-accept-leo', nonce: 'nonce-leo',
    acceptedAt: '2026-08-12T12:02:00.000Z',
  });
  await harness.flushLeo();
  const grant = await harness.mina.grantAcceptedInvitation({
    invitationId: 'invite-leo', eventId: 'event-grant-leo', groupKeyEnvelopeId: 'leo-envelope-v1',
    keyVersion: 1, groupKey, createdAt: '2026-08-12T12:03:00.000Z',
    expiresAt: '2026-08-12T12:04:00.000Z',
  });
  const result = await harness.leo.receive({
    roomId: 'friends-room', peer: 'opaque-mina', event: grant,
    now: '2026-08-12T12:04:00.000Z',
  });
  assert.equal(result.outcome, 'rejected');
  assert.match(result.reason ?? '', /expired/u);
  assert.equal(harness.leo.state.lifecycle.memberships[`${groupId}:leo`], undefined);
  assert.equal(harness.leoKeys.values.length, 0);
});

async function createHarness() {
  await cryptoWaitReady();
  const minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const leoPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  const account = (pair: typeof minaPair) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signer = (pair: typeof minaPair): AccountMessageSigner => ({signBytes: async data => sr25519Sign(data, pair)});
  const minaAccount = account(minaPair);
  const leoAccount = account(leoPair);
  const organizer: MembershipGrant = {
    groupId, participantId: 'mina', accountPublicKeyHex: minaAccount, role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z', invitationId: 'group-created',
    keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const contacts = new StaticContacts(new Map([
    ['friends-room:leo', {contactId: 'leo', participantId: 'leo', accountPublicKeyHex: leoAccount}],
    ['friends-room:mina', {contactId: 'mina', participantId: 'mina', accountPublicKeyHex: minaAccount}],
  ]));
  const minaStorage = new MemoryStorage();
  const leoStorage = new MemoryStorage();
  const minaPending = new MemoryPendingAcceptanceVault();
  const leoPending = new MemoryPendingAcceptanceVault();
  const minaKeys = new MemoryProtectedKeySink();
  const leoKeys = new MemoryProtectedKeySink();
  const minaSent: SignedMembershipEventV1[] = [];
  const leoSent: SignedMembershipEventV1[] = [];
  const harness = {
    minaOnline: true,
    leoOnline: true,
    mina: undefined as unknown as TrustedContactInvitationCoordinator,
    leo: undefined as unknown as TrustedContactInvitationCoordinator,
    minaAccount, leoAccount, leoKeys,
    async flushMina() { return this.mina.flush(); },
    async flushLeo() { return this.leo.flush(); },
    minaDeliveryId(event: SignedMembershipEventV1) { return `chat_room:friends-room:${event.eventId}`; },
    lastMinaEvent() { return minaSent.at(-1) as SignedMembershipEventV1; },
    restartLeo() { return makeLeo(); },
    restartLeoWithoutAcceptedJournal() {
      const stored = JSON.parse(leoStorage.read('chopdot-signed-membership-events-v1') ?? '[]') as SignedMembershipEventV1[];
      leoStorage.write('chopdot-signed-membership-events-v1', JSON.stringify(stored.filter(event => event.event.type !== 'INVITATION_ACCEPTED')));
      return makeLeo();
    },
  };
  const minaDelivery: MembershipEventDelivery = {
    async send(roomId, event) {
      if (!harness.minaOnline) throw new Error('offline');
      minaSent.push(event);
      const result = await harness.leo.receive({roomId, peer: 'opaque-mina-peer', event});
      if (result.outcome === 'rejected') throw new Error(result.reason);
      return {messageId: `mina-${event.eventId}`};
    },
  };
  const leoDelivery: MembershipEventDelivery = {
    async send(roomId, event) {
      if (!harness.leoOnline) throw new Error('offline');
      leoSent.push(event);
      const result = await harness.mina.receive({roomId, peer: 'opaque-leo-peer', event});
      if (result.outcome === 'rejected') throw new Error(result.reason);
      return {messageId: `leo-${event.eventId}`};
    },
  };
  const makeMina = () => new TrustedContactInvitationCoordinator({
    actor: {participantId: 'mina', accountPublicKeyHex: minaAccount, signer: signer(minaPair)},
    organizerRoots: [organizer], storage: minaStorage, contacts, delivery: minaDelivery,
    pendingAcceptances: minaPending, protectedKeys: minaKeys,
  });
  const makeLeo = () => new TrustedContactInvitationCoordinator({
    actor: {participantId: 'leo', accountPublicKeyHex: leoAccount, signer: signer(leoPair)},
    organizerRoots: [organizer], storage: leoStorage, contacts, delivery: leoDelivery,
    pendingAcceptances: leoPending, protectedKeys: leoKeys,
  });
  harness.mina = makeMina();
  harness.leo = makeLeo();
  return harness;
}

function inviteInput(leoAccount: string) {
  return {
    selectedRoomId: 'friends-room', contactId: 'leo', recipientAccountPublicKeyHex: leoAccount,
    groupId, invitationId: 'invite-leo', eventId: 'event-invite-leo', role: 'member' as const,
    createdAt: '2026-08-12T12:01:00.000Z', expiresAt,
  };
}
