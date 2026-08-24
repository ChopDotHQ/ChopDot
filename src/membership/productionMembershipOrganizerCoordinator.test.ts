import assert from 'node:assert/strict';
import test from 'node:test';
import type {ChatReceivedAction} from '@parity/product-sdk-host';
import {verifiedContactActor, verifiedContactFixture} from '../../tests/fixtures/verifiedContactFixture.ts';
import {VerifiedContactRepository, type AsyncJsonStorage} from '../contacts/verifiedContactRepository.ts';
import {createCanonicalEvent, type CanonicalEventV1, type CanonicalVerifier} from '../core/moneyEventKernel.ts';
import type {AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {MembershipDeliveryAcknowledgement} from './membershipDeliveryOutbox.ts';
import {MembershipBootstrapEntryService} from './membershipBootstrapEntryService.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import {DurableMembershipKeyEnvelopeRegistry} from './membershipKeyEnvelopeRegistry.ts';
import {DurableMembershipProtectedGroupKeySink} from './durableMembershipProtectedGroupKeySink.ts';
import {
  decodeMembershipChatAction,
  encodeMembershipAcknowledgementChatMessage,
} from './chatInvitationTransport.ts';
import {
  ProductionMembershipOrganizerCoordinator,
  type ProductionMembershipOrganizerCoordinatorOptions,
} from './productionMembershipOrganizerCoordinator.ts';
import {
  type MembershipEventDelivery,
  type PendingAcceptanceRecord,
  type PendingAcceptanceVault,
  type ProtectedGroupKeySink,
} from './trustedContactInvitationCoordinator.ts';
import {verifyProductAccountSignature} from './groupKeyHandoff.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  throwOnceOnRemoveKey: string | null = null;
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) {
    if (key === this.throwOnceOnRemoveKey) {
      this.throwOnceOnRemoveKey = null;
      throw new Error('injected membership cleanup failure');
    }
    this.values.delete(key);
  }
}

class MemoryAsyncStorage implements AsyncJsonStorage {
  values = new Map<string, unknown>();
  async readJSON(key: string) { return structuredClone(this.values.get(key) ?? null); }
  async writeJSON(key: string, value: unknown) { this.values.set(key, structuredClone(value)); }
  async clear(key: string) { this.values.delete(key); }
}

class PendingVault implements PendingAcceptanceVault {
  values = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, value: PendingAcceptanceRecord) { this.values.set(id, value); }
  async remove(id: string) { this.values.delete(id); }
}

class ProtectedKeys implements ProtectedGroupKeySink {
  values: Array<Parameters<ProtectedGroupKeySink['save']>[0]> = [];
  async save(value: Parameters<ProtectedGroupKeySink['save']>[0]) {
    if (!this.values.some(candidate => candidate.groupKeyEnvelopeId === value.groupKeyEnvelopeId)) {
      this.values.push({...value, groupKey: new Uint8Array(value.groupKey)});
    }
  }
  async has(value: Parameters<NonNullable<ProtectedGroupKeySink['has']>>[0]) {
    return this.values.some(candidate => candidate.groupId === value.groupId
      && candidate.participantId === value.participantId
      && candidate.accountPublicKeyHex === value.accountPublicKeyHex
      && candidate.keyVersion === value.keyVersion
      && candidate.groupKeyEnvelopeId === value.groupKeyEnvelopeId);
  }
}

const verifyCanonical: CanonicalVerifier = (bytes, signature, publicKeyHex) =>
  verifyProductAccountSignature(publicKeyHex, bytes, signature);

test('verified contact becomes a V2 invitation, but MEMBER_ADDED waits for signed acceptance and grant acknowledgement', async () => {
  const h = await harness();
  const created = await h.organizer.createInvitation({
    requestId: 'add-leo-0001', contactRecordId: h.contactRecordId, roomId: h.roomId,
    groupId: h.groupId, route: 'join_link', expiresAt: '2026-08-29T13:00:00.000Z',
  });
  assert.equal(created.bootstrap.v, 2);
  assert.equal(created.bootstrap.organizerGroupEvent.eventId, h.origin.eventId);
  assert.equal(JSON.stringify(created.bootstrap).includes('"groupKey":'), false);
  assert.equal(h.organizer.state.lifecycle.memberships[`${h.groupId}:leo`], undefined);
  assert.equal(await h.organizer.membershipAuthorityCommand(created.invitationId), null);
  assert.equal(h.organizer.status(created.invitationId), 'pending');

  assert.deepEqual(await h.recipient.enter(created.bootstrap, '2026-08-23T12:01:00.000Z'), {
    status: 'ready', invitationId: created.invitationId,
  });
  const acceptance = await h.recipient.accept({
    invitationId: created.invitationId, eventId: 'accept-leo-0001', nonce: 'recipient-nonce-0001',
    acceptedAt: '2026-08-23T12:02:00.000Z',
  });
  const wrongRoom = await h.organizer.receive({roomId: 'forwarded-room', peer: 'opaque', event: acceptance});
  assert.equal(wrongRoom.outcome, 'rejected');
  assert.equal(h.organizer.state.pendingAcceptances[created.invitationId], undefined);
  await h.recipient.flush();
  assert.equal(h.organizer.status(created.invitationId), 'ready_to_grant');
  assert.equal(await h.organizer.membershipAuthorityCommand(created.invitationId), null);

  h.setNow('2026-08-23T12:03:00.000Z');
  h.organizerOnline = false;
  const firstGrant = await h.organizer.finishAdding(created.invitationId);
  assert.deepEqual(h.openedOrganizerKey(), new Uint8Array(32));
  assert.equal(firstGrant.grantEvent.event.type, 'MEMBERSHIP_GRANTED');
  assert.equal(firstGrant.deliveryPending, true);
  assert.equal(firstGrant.command, null);
  assert.equal(h.organizer.status(created.invitationId), 'pending');
  h.organizerOnline = true;
  assert.equal((await h.organizer.retryDeliveries()).delivered.length, 1);
  const acknowledgedEnvelope = h.organizer.exportAcknowledgedMemberEnvelope(created.invitationId);
  assert.ok(acknowledgedEnvelope);
  assert.equal(h.lastGrantAcknowledgement?.v, 2);
  const acknowledgementAction: ChatReceivedAction = {
    roomId: h.roomId,
    peer: 'opaque-leo',
    payload: {tag: 'MessagePosted', value: encodeMembershipAcknowledgementChatMessage(h.lastGrantAcknowledgement!)},
  };
  assert.deepEqual(decodeMembershipChatAction(acknowledgementAction), {
    kind: 'acknowledgement', acknowledgement: h.lastGrantAcknowledgement,
  });

  const command = await h.organizer.membershipAuthorityCommand(created.invitationId);
  assert.ok(command);
  assert.equal(command.type, 'add');
  if (command.type !== 'add') throw new Error('Expected add command.');
  assert.deepEqual(command, {
    groupId: h.groupId,
    type: 'add',
    grant: {
      groupId: h.groupId,
      participantId: 'leo',
      accountPublicKeyHex: h.leoAccount,
      role: 'member',
      acceptedAt: firstGrant.grantEvent.occurredAt,
      invitationId: created.invitationId,
      keyVersion: 1,
      groupKeyEnvelopeId: acknowledgedEnvelope.binding.groupKeyEnvelopeId,
    },
  });
  assert.equal(await h.organizer.authorize(command, 'mina'), true);
  assert.equal(await h.organizer.authorize({...command, groupId: 'other-group'}, 'mina'), false);
  assert.deepEqual(await h.organizer.resolve(h.groupId, 'leo'), command.grant);
  assert.equal(h.organizer.status(created.invitationId), 'accepted');
  assert.deepEqual(h.organizer.exportAcknowledgedMemberEnvelope(created.invitationId), acknowledgedEnvelope);
  assert.deepEqual(await h.organizer.openCurrentOrganizerEnvelope(h.groupId), new Uint8Array(32).fill(7));
  assert.ok(h.organizer.exportCurrentOrganizerEnvelope(h.groupId));
  assert.deepEqual(await h.recipientKeySink.openAcknowledged({
    groupId: h.groupId, participantId: 'leo', accountPublicKeyHex: h.leoAccount, keyVersion: 1,
  }), new Uint8Array(32).fill(7));
});

test('retry, acknowledgement replay, request replay, and restart are idempotent', async () => {
  const h = await harness();
  const request = {
    requestId: 'idempotent-leo', contactRecordId: h.contactRecordId, roomId: h.roomId,
    groupId: h.groupId, route: 'qr' as const, expiresAt: '2026-08-29T13:00:00.000Z',
  };
  const created = await h.organizer.createInvitation(request);
  const replay = await h.organizer.createInvitation(request);
  assert.deepEqual(replay, created);
  await assert.rejects(() => h.organizer.createInvitation({...request, roomId: 'another-room'}), /already in use/u);
  await h.recipient.enter(created.bootstrap, '2026-08-23T12:01:00.000Z');
  await h.recipient.accept({
    invitationId: created.invitationId, eventId: 'accept-idempotent', nonce: 'idempotent-nonce-0001',
    acceptedAt: '2026-08-23T12:02:00.000Z',
  });
  await h.recipient.flush();
  h.setNow('2026-08-23T12:03:00.000Z');
  const first = await h.organizer.finishAdding(created.invitationId);
  assert.equal(first.deliveryPending, false);
  const acceptedCommand = first.command;
  assert.ok(acceptedCommand);
  const second = await h.organizer.finishAdding(created.invitationId);
  assert.equal(second.grantEvent.eventId, first.grantEvent.eventId);
  assert.equal(second.deliveryPending, false);
  assert.deepEqual(second.command, acceptedCommand);
  assert.deepEqual(await h.organizer.retryDeliveries(), {delivered: [], pending: []});

  const acknowledgement = h.lastGrantAcknowledgement;
  assert.ok(acknowledgement);
  assert.equal(await h.organizer.acknowledgeDelivery(acknowledgement), true);
  const restarted = h.restartOrganizer();
  await restarted.restore('2026-08-23T12:05:00.000Z');
  assert.deepEqual(await restarted.membershipAuthorityCommand(created.invitationId), acceptedCommand);
  assert.equal(restarted.status(created.invitationId), 'accepted');
});

test('organizer restart recovers a durable grant acknowledgement after outbox cleanup failure', async () => {
  const h = await harness();
  const created = await h.organizer.createInvitation({
    requestId: 'crash-safe-leo', contactRecordId: h.contactRecordId, roomId: h.roomId,
    groupId: h.groupId, route: 'join_link', expiresAt: '2026-08-29T13:00:00.000Z',
  });
  await h.recipient.enter(created.bootstrap, '2026-08-23T12:01:00.000Z');
  await h.recipient.accept({
    invitationId: created.invitationId, eventId: 'accept-crash-safe', nonce: 'crash-safe-nonce',
    acceptedAt: '2026-08-23T12:02:00.000Z',
  });
  await h.recipient.flush();
  h.setNow('2026-08-23T12:03:00.000Z');
  h.storage.throwOnceOnRemoveKey = 'chopdot-membership-delivery-outbox-v1';

  await assert.rejects(
    h.organizer.finishAdding(created.invitationId),
    /injected membership cleanup failure/u,
  );
  assert.ok(h.storage.read('chopdot-membership-delivery-outbox-v1:acks'));

  // Simulate the legacy crash point: no coordinator-specific ACK copy made it
  // to disk. The membership outbox ledger must be sufficient after restart.
  h.storage.remove(`chopdot-production-membership-organizer-acknowledgements-v1:${h.organizerAccount}`);
  const restarted = h.restartOrganizer();
  await restarted.restore('2026-08-23T12:04:00.000Z');
  const command = await restarted.membershipAuthorityCommand(created.invitationId);
  assert.ok(command);
  assert.equal(command.type, 'add');
});

test('a durable recipient sink never downgrades a grant to V1 when its exact record is unavailable', async () => {
  const h = await harness({durableRecordUnavailable: true});
  const created = await h.organizer.createInvitation({
    requestId: 'missing-record-leo', contactRecordId: h.contactRecordId, roomId: h.roomId,
    groupId: h.groupId, route: 'join_link', expiresAt: '2026-08-29T13:00:00.000Z',
  });
  await h.recipient.enter(created.bootstrap, '2026-08-23T12:01:00.000Z');
  await h.recipient.accept({
    invitationId: created.invitationId, eventId: 'accept-missing-record', nonce: 'missing-record-nonce',
    acceptedAt: '2026-08-23T12:02:00.000Z',
  });
  await h.recipient.flush();
  h.setNow('2026-08-23T12:03:00.000Z');

  const grant = await h.organizer.finishAdding(created.invitationId);
  assert.equal(grant.deliveryPending, true);
  assert.equal(grant.command, null);
  assert.equal(h.lastGrantAcknowledgement, null);
  assert.equal(await h.organizer.membershipAuthorityCommand(created.invitationId), null);
  assert.equal((await h.organizer.retryDeliveries()).pending.length, 1);
});

test('unverified selection, invalid group origin, expiry, wrong account, and forwarding fail closed', async () => {
  const h = await harness();
  await assert.rejects(() => h.organizer.createInvitation({
    requestId: 'unknown-contact', contactRecordId: 'not-verified', roomId: h.roomId,
    groupId: h.groupId, route: 'join_link',
  }), /verified contact/u);
  assert.equal(Object.keys(h.organizer.state.lifecycle.invitations).length, 0);

  const tamperedOrigin = structuredClone(h.origin);
  tamperedOrigin.signatureHex = `0x${'ff'.repeat(64)}`;
  const invalidOriginOrganizer = h.restartOrganizer({origin: tamperedOrigin});
  await assert.rejects(() => invalidOriginOrganizer.createInvitation({
    requestId: 'bad-origin', contactRecordId: h.contactRecordId, roomId: h.roomId,
    groupId: h.groupId, route: 'join_link',
  }), /could not be verified/u);
  h.restartOrganizer();

  const expiring = await h.organizer.createInvitation({
    requestId: 'expiring-leo', contactRecordId: h.contactRecordId, roomId: h.roomId,
    groupId: h.groupId, route: 'join_link', expiresAt: '2026-08-23T12:10:00.000Z',
  });
  assert.equal((await h.recipient.enter(expiring.bootstrap, '2026-08-23T12:10:00.000Z')).status, 'expired');

  const nina = verifiedContactActor('nina', 33);
  const forwarded = new MembershipBootstrapEntryService({
    actor: nina,
    storage: new MemoryStorage(),
    delivery: {async send(_roomId, event) { return {messageId: event.eventId}; }},
    pendingAcceptances: new PendingVault(),
    protectedKeys: new ProtectedKeys(),
  });
  assert.equal((await forwarded.enter(expiring.bootstrap, '2026-08-23T12:05:00.000Z')).status, 'wrong_account');
  assert.equal(forwarded.state.lifecycle.memberships[`${h.groupId}:nina`], undefined);
  assert.equal(await h.organizer.membershipAuthorityCommand(expiring.invitationId), null);
});

async function harness(input: {durableRecordUnavailable?: boolean} = {}) {
  const fixture = await verifiedContactFixture();
  const contactStorage = new MemoryAsyncStorage();
  const verifiedContacts = new VerifiedContactRepository(contactStorage);
  await verifiedContacts.save(fixture.minaRecord);
  const groupId = 'zurich-dinner';
  const roomId = 'mina-leo-room';
  const storage = new MemoryStorage();
  const organizerPending = new PendingVault();
  const recipientStorage = new MemoryStorage();
  const recipientPending = new PendingVault();
  const organizerRegistry = new DurableMembershipKeyEnvelopeRegistry({
    productId: 'app.chopdot.dot', participantId: 'mina',
    accountPublicKeyHex: fixture.mina.accountPublicKeyHex,
    storage, entropy: entropy('mina'),
  });
  const recipientRegistry = new DurableMembershipKeyEnvelopeRegistry({
    productId: 'app.chopdot.dot', participantId: 'leo',
    accountPublicKeyHex: fixture.leo.accountPublicKeyHex,
    storage: recipientStorage, entropy: entropy('leo'),
  });
  const recipientKeySink = new DurableMembershipProtectedGroupKeySink({
    registry: recipientRegistry,
    actor: fixture.leo,
    now: () => '2026-08-23T12:04:00.000Z',
  });
  const openOrganizerEnvelope = organizerRegistry.open.bind(organizerRegistry);
  let lastOrganizerOpenedKey: Uint8Array | null = null;
  organizerRegistry.open = async binding => {
    const opened = await openOrganizerEnvelope(binding);
    lastOrganizerOpenedKey = opened;
    return opened;
  };
  const recipientProtectedKeys: ProtectedGroupKeySink = input.durableRecordUnavailable
    ? {
        save: value => recipientKeySink.save(value),
        has: value => recipientKeySink.has(value),
        acknowledgedRecord: async () => null,
      }
    : recipientKeySink;
  const organizerEnvelope = await organizerRegistry.stageRecipientBinding({
    groupId,
    keyVersion: 1,
    groupKey: new Uint8Array(32).fill(7),
    acknowledgedAt: '2026-08-23T11:49:00.000Z',
    signer: fixture.mina.signer,
  });
  const organizerRoot: MembershipGrant = {
    groupId,
    participantId: 'mina',
    accountPublicKeyHex: fixture.mina.accountPublicKeyHex,
    role: 'organizer',
    acceptedAt: '2026-08-23T11:50:00.000Z',
    invitationId: 'group-origin-zurich',
    keyVersion: 1,
    groupKeyEnvelopeId: organizerEnvelope.binding.groupKeyEnvelopeId,
  };
  const origin = await createCanonicalEvent({
    eventId: 'group-origin-zurich', commandId: 'create-zurich', groupId,
    eventType: 'GROUP_CREATED', expectedVersion: 0, parentEventId: null,
    actorId: 'mina', actorAccountPublicKeyHex: fixture.mina.accountPublicKeyHex, actorRole: 'organizer',
    occurredAt: '2026-08-23T11:50:00.000Z', keyVersion: 1,
    payload: {name: 'Zurich dinner', mode: 'normal_pot', organizerId: 'mina', members: [{
      participantId: 'mina', accountPublicKeyHex: fixture.mina.accountPublicKeyHex, role: 'organizer',
      active: true, acceptedAt: organizerRoot.acceptedAt, invitationId: organizerRoot.invitationId,
      keyVersion: organizerRoot.keyVersion, groupKeyEnvelopeId: organizerRoot.groupKeyEnvelopeId,
    }]},
  }, {sign: fixture.mina.signer.signBytes});
  let organizer!: ProductionMembershipOrganizerCoordinator;
  let recipient!: MembershipBootstrapEntryService;
  let currentTime = '2026-08-23T12:00:00.000Z';
  const result = {
    organizerOnline: true,
    lastGrantAcknowledgement: null as MembershipDeliveryAcknowledgement | null,
  };
  const organizerDelivery: MembershipEventDelivery = {
    async send(deliveryRoomId, event) {
      if (!result.organizerOnline) throw new Error('offline');
      const received = await recipient.receive({roomId: deliveryRoomId, peer: 'opaque-mina', event, now: '2026-08-23T12:04:00.000Z'});
      if (received.outcome === 'rejected') throw new Error(received.reason);
      if (event.event.type === 'MEMBERSHIP_GRANTED') result.lastGrantAcknowledgement = received.deliveryAcknowledgement ?? null;
      return {messageId: `mina-${event.eventId}`, acknowledgement: received.deliveryAcknowledgement};
    },
  };
  const recipientDelivery: MembershipEventDelivery = {
    async send(deliveryRoomId, event) {
      const received = await organizer.receive({roomId: deliveryRoomId, peer: 'opaque-leo', event, now: event.occurredAt});
      if (received.outcome === 'rejected') throw new Error(received.reason);
      return {messageId: `leo-${event.eventId}`, acknowledgement: received.deliveryAcknowledgement};
    },
  };
  const baseOptions = (originValue: CanonicalEventV1): ProductionMembershipOrganizerCoordinatorOptions => ({
    actor: fixture.mina,
    organizerRoots: [organizerRoot],
    storage,
    verifiedContacts,
    groupOrigins: {async readGroupOrigin() { return structuredClone(originValue); }},
    keyEnvelopes: organizerRegistry,
    delivery: organizerDelivery,
    pendingAcceptances: organizerPending,
    verifyCanonical,
    baseUrl: 'https://chopdot.example/',
    now: () => currentTime,
  });
  const makeOrganizer = (originValue = origin) => new ProductionMembershipOrganizerCoordinator(baseOptions(originValue));
  organizer = makeOrganizer();
  recipient = new MembershipBootstrapEntryService({
    actor: fixture.leo,
    storage: recipientStorage,
    delivery: recipientDelivery,
    pendingAcceptances: recipientPending,
    protectedKeys: recipientProtectedKeys,
  });
  return Object.assign(result, {
    organizer,
    recipient,
    recipientKeySink,
    origin,
    contactRecordId: fixture.minaRecord.recordId,
    leoAccount: fixture.leo.accountPublicKeyHex,
    groupId,
    roomId,
    storage,
    organizerAccount: fixture.mina.accountPublicKeyHex,
    openedOrganizerKey() { return lastOrganizerOpenedKey; },
    setNow(value: string) { currentTime = value; },
    restartOrganizer(input: {origin?: CanonicalEventV1} = {}) {
      organizer = makeOrganizer(input.origin ?? origin);
      this.organizer = organizer;
      return organizer;
    },
  });
}

function entropy(label: string): AccountEntropyProvider {
  return {deriveAccountEntropy: async context => {
    const prefix = new TextEncoder().encode(label);
    const bytes = new Uint8Array(prefix.byteLength + context.byteLength);
    bytes.set(prefix);
    bytes.set(context, prefix.byteLength);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  }};
}
