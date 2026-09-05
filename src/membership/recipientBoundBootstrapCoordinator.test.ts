import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import {
  createRecipientBoundBootstrap,
  recipientBoundBootstrapQrText,
  recipientBoundBootstrapUrl,
} from './recipientBoundBootstrap.ts';
import {
  TrustedContactInvitationCoordinator,
  type MembershipEventDelivery,
  type PendingAcceptanceRecord,
  type PendingAcceptanceVault,
  type ProtectedGroupKeySink,
  type TrustedContactAccount,
  type TrustedContactAccountResolver,
  type TrustedGroupOrganizerResolver,
} from './trustedContactInvitationCoordinator.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class PendingVault implements PendingAcceptanceVault {
  values = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, record: PendingAcceptanceRecord) { this.values.set(id, record); }
  async remove(id: string) { this.values.delete(id); }
}

class KeySink implements ProtectedGroupKeySink {
  values: Array<Parameters<ProtectedGroupKeySink['save']>[0]> = [];
  async save(value: Parameters<ProtectedGroupKeySink['save']>[0]) { this.values.push({...value, groupKey: new Uint8Array(value.groupKey)}); }
}

class Contacts implements TrustedContactAccountResolver {
  constructor(private readonly values: Map<string, TrustedContactAccount>) {}
  async resolve(input: {selectedRoomId: string; contactId: string}) {
    return this.values.get(`${input.selectedRoomId}:${input.contactId}`) ?? null;
  }
}

test('Mina can mix an existing-contact invite with one Nina link/QR bootstrap without sharing group state', async () => {
  const h = await harness();
  await h.mina.inviteExistingContact({
    selectedRoomId: 'mina-leo-room', contactId: 'leo', recipientAccountPublicKeyHex: h.accounts.leo,
    groupId: h.groupId, invitationId: 'invite-leo', eventId: 'event-invite-leo', role: 'member',
    createdAt: '2026-08-12T12:01:00.000Z', expiresAt: h.expiresAt,
  });
  await h.mina.flush();
  assert.equal(h.leo.state.lifecycle.invitations['invite-leo'].route, 'existing_friend');

  const {event, bootstrap} = await h.mina.createBootstrapInvitation({
    returnRoomId: 'mina-nina-return', recipientId: 'nina', recipientAccountPublicKeyHex: h.accounts.nina,
    groupId: h.groupId, invitationId: 'invite-nina', eventId: 'event-invite-nina', role: 'member',
    route: 'join_link', createdAt: '2026-08-12T12:02:00.000Z', expiresAt: h.expiresAt,
  });
  const link = recipientBoundBootstrapUrl('https://chopdotproof02.dot/join', bootstrap);
  assert.equal(recipientBoundBootstrapQrText('https://chopdotproof02.dot/join', bootstrap), link);
  assert.equal(JSON.stringify(bootstrap).includes('groupKey'), false);
  assert.equal(JSON.stringify(bootstrap).includes('expenses'), false);
  assert.equal(JSON.stringify(bootstrap).includes('splits'), false);
  assert.equal(JSON.stringify(bootstrap).includes('moneyState'), false);
  assert.equal(event.event.type, 'INVITATION_CREATED');

  assert.equal((await h.leo.importBootstrapInvitation({
    bootstrap, now: '2026-08-12T12:03:00.000Z',
  })).outcome, 'rejected');
  assert.equal((await h.nina.importBootstrapInvitation({
    bootstrap, now: '2026-08-12T12:03:00.000Z',
  })).outcome, 'applied');
  const acceptedEventCount = Object.keys(h.nina.state.events).length;
  assert.equal((await h.nina.importBootstrapInvitation({
    bootstrap, now: '2026-08-12T12:03:00.000Z',
  })).outcome, 'idempotent');
  assert.equal(Object.keys(h.nina.state.events).length, acceptedEventCount);
  const restored = await h.nina.restore('2026-08-12T12:03:30.000Z');
  assert.equal(restored.deferred.length, 0);
  assert.equal(h.nina.state.lifecycle.invitations['invite-nina'].inviteeId, 'nina');
  assert.equal(h.nina.state.lifecycle.memberships[`${h.groupId}:nina`], undefined);

  await h.nina.acceptInvitation({
    invitationId: 'invite-nina', eventId: 'event-accept-nina', nonce: 'nonce-nina',
    acceptedAt: '2026-08-12T12:04:00.000Z',
  });
  await h.nina.flush();
  assert.equal(h.mina.state.lifecycle.memberships[`${h.groupId}:nina`], undefined);
  await h.mina.grantAcceptedInvitation({
    invitationId: 'invite-nina', eventId: 'event-grant-nina', groupKeyEnvelopeId: 'nina-envelope-v1',
    keyVersion: 1, groupKey: new Uint8Array(32).fill(8),
    createdAt: '2026-08-12T12:05:00.000Z', expiresAt: h.expiresAt,
  });
  await h.mina.flush();
  assert.equal(h.nina.state.lifecycle.memberships[`${h.groupId}:nina`].accountPublicKeyHex, h.accounts.nina);
  assert.equal(h.ninaKeys.values.length, 1);
});

test('forwarding, duplicate route or identity, and limited no-app bootstrap fail closed', async () => {
  const h = await harness();
  await h.mina.inviteExistingContact({
    selectedRoomId: 'mina-leo-room', contactId: 'leo', recipientAccountPublicKeyHex: h.accounts.leo,
    groupId: h.groupId, invitationId: 'invite-leo', eventId: 'event-invite-leo', role: 'member',
    createdAt: '2026-08-12T12:01:00.000Z', expiresAt: h.expiresAt,
  });
  await assert.rejects(() => h.mina.createBootstrapInvitation({
    returnRoomId: 'another-room', recipientId: 'leo-alias', recipientAccountPublicKeyHex: h.accounts.leo,
    groupId: h.groupId, invitationId: 'invite-leo-again', eventId: 'event-invite-leo-again', role: 'member',
    route: 'join_link', createdAt: '2026-08-12T12:02:00.000Z', expiresAt: h.expiresAt,
  }), /active invitation/u);

  const created = await h.mina.createBootstrapInvitation({
    returnRoomId: 'mina-nina-return', recipientId: 'nina', recipientAccountPublicKeyHex: h.accounts.nina,
    groupId: h.groupId, invitationId: 'invite-nina', eventId: 'event-invite-nina', role: 'member',
    route: 'qr', createdAt: '2026-08-12T12:03:00.000Z', expiresAt: h.expiresAt,
  });
  assert.equal((await h.nina.importBootstrapInvitation({bootstrap: created.bootstrap})).outcome, 'applied');
  const redirected = await createRecipientBoundBootstrap({
    invitationEvent: created.event, returnRoomId: 'attacker-room', signer: h.signers.mina,
  });
  await assert.rejects(
    () => h.nina.importBootstrapInvitation({bootstrap: redirected}),
    /another delivery route/u,
  );

  const invitationCount = Object.keys(h.mina.state.lifecycle.invitations).length;
  await assert.rejects(() => h.mina.createBootstrapInvitation({
    returnRoomId: 'limited-room', recipientId: 'nina', recipientAccountPublicKeyHex: h.accounts.nina,
    groupId: 'another-group', invitationId: 'limited-invite', eventId: 'limited-event',
    role: 'limited', route: 'no_app_action',
    createdAt: '2026-08-12T12:04:00.000Z', expiresAt: h.expiresAt,
  } as never), /account-bound invitation/u);
  assert.equal(Object.keys(h.mina.state.lifecycle.invitations).length, invitationCount);
  assert.equal(h.mina.state.lifecycle.memberships[`${h.groupId}:nina`], undefined);
});

test('fresh recipient requires an external matching organizer trust root', async () => {
  const h = await harness();
  const {bootstrap} = await h.mina.createBootstrapInvitation({
    returnRoomId: 'mina-nina-return', recipientId: 'nina', recipientAccountPublicKeyHex: h.accounts.nina,
    groupId: h.groupId, invitationId: 'invite-nina', eventId: 'event-invite-nina', role: 'member',
    route: 'join_link', createdAt: '2026-08-12T12:02:00.000Z', expiresAt: h.expiresAt,
  });
  const noRoot = h.freshNina();
  assert.equal((await noRoot.importBootstrapInvitation({bootstrap})).outcome, 'rejected');
  const wrongRoot = h.freshNina({
    async resolve(input) {
      return {...h.organizer, groupId: input.groupId, accountPublicKeyHex: `0x${'44'.repeat(32)}`};
    },
  });
  assert.equal((await wrongRoot.importBootstrapInvitation({bootstrap})).outcome, 'rejected');
  const trusted = h.freshNina({async resolve() { return h.organizer; }});
  assert.equal((await trusted.importBootstrapInvitation({bootstrap})).outcome, 'applied');
  assert.equal(trusted.state.lifecycle.invitations['invite-nina'].inviteeId, 'nina');
});

async function harness() {
  await cryptoWaitReady();
  const pairs = {
    mina: sr25519PairFromSeed(new Uint8Array(32).fill(11)),
    leo: sr25519PairFromSeed(new Uint8Array(32).fill(22)),
    nina: sr25519PairFromSeed(new Uint8Array(32).fill(33)),
  };
  const account = (pair: typeof pairs.mina) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signers = {
    mina: {signBytes: async (data: Uint8Array) => sr25519Sign(data, pairs.mina)},
    leo: {signBytes: async (data: Uint8Array) => sr25519Sign(data, pairs.leo)},
    nina: {signBytes: async (data: Uint8Array) => sr25519Sign(data, pairs.nina)},
  } satisfies Record<string, AccountMessageSigner>;
  const accounts = {mina: account(pairs.mina), leo: account(pairs.leo), nina: account(pairs.nina)};
  const groupId = 'zurich-dinner';
  const expiresAt = '2099-08-13T12:00:00.000Z';
  const organizer: MembershipGrant = {
    groupId, participantId: 'mina', accountPublicKeyHex: accounts.mina, role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z', invitationId: 'group-created',
    keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const contacts = new Contacts(new Map([
    ['mina-leo-room:leo', {contactId: 'leo', participantId: 'leo', accountPublicKeyHex: accounts.leo}],
    ['mina-leo-room:mina', {contactId: 'mina', participantId: 'mina', accountPublicKeyHex: accounts.mina}],
  ]));
  const coordinators = {} as Record<'mina' | 'leo' | 'nina', TrustedContactInvitationCoordinator>;
  const routeRecipient = (sender: string, roomId: string): 'mina' | 'leo' | 'nina' => {
    if (sender === 'mina' && roomId === 'mina-leo-room') return 'leo';
    if (sender === 'leo' && roomId === 'mina-leo-room') return 'mina';
    if (sender === 'mina' && roomId === 'mina-nina-return') return 'nina';
    if (sender === 'nina' && roomId === 'mina-nina-return') return 'mina';
    throw new Error('offline');
  };
  const delivery = (sender: 'mina' | 'leo' | 'nina'): MembershipEventDelivery => ({
    async send(roomId, event) {
      const recipient = routeRecipient(sender, roomId);
      const result = await coordinators[recipient].receive({roomId, peer: `opaque-${sender}`, event});
      if (result.outcome === 'rejected') throw new Error(result.reason);
      return {messageId: `${sender}-${event.eventId}`};
    },
  });
  const ninaKeys = new KeySink();
  const make = (
    id: 'mina' | 'leo' | 'nina',
    sink = new KeySink(),
    organizerRoots: MembershipGrant[] = [organizer],
    trustedOrganizers?: TrustedGroupOrganizerResolver,
  ) => new TrustedContactInvitationCoordinator({
    actor: {participantId: id, accountPublicKeyHex: accounts[id], signer: signers[id]},
    organizerRoots, storage: new MemoryStorage(), contacts, delivery: delivery(id), trustedOrganizers,
    pendingAcceptances: new PendingVault(), protectedKeys: sink,
  });
  coordinators.mina = make('mina');
  coordinators.leo = make('leo');
  coordinators.nina = make('nina', ninaKeys);
  return {
    mina: coordinators.mina, leo: coordinators.leo, nina: coordinators.nina,
    accounts, signers, ninaKeys, groupId, expiresAt, organizer,
    freshNina(trustedOrganizers?: TrustedGroupOrganizerResolver) {
      return make('nina', new KeySink(), [], trustedOrganizers);
    },
  };
}
