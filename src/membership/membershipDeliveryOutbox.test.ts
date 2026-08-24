import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import {createSignedMembershipEvent} from './signedMembershipEvents.ts';
import {
  createMembershipDeliveryAcknowledgement,
  MembershipDeliveryOutbox,
  type PendingMembershipDelivery,
} from './membershipDeliveryOutbox.ts';
import {DurableMembershipKeyEnvelopeRegistry} from './membershipKeyEnvelopeRegistry.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class FaultInjectingStorage extends MemoryStorage {
  throwOnceOnRemoveKey: string | null = null;
  dropOnceOnWriteKey: string | null = null;

  override write(key: string, value: string) {
    if (key === this.dropOnceOnWriteKey) {
      this.dropOnceOnWriteKey = null;
      return;
    }
    super.write(key, value);
  }

  override remove(key: string) {
    if (key === this.throwOnceOnRemoveKey) {
      this.throwOnceOnRemoveKey = null;
      throw new Error('injected membership cleanup failure');
    }
    super.remove(key);
  }
}

async function inviteEvent(id = 'event-invite') {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  return createSignedMembershipEvent({
    eventId: id, actorId: 'mina',
    actorAccountPublicKeyHex: `0x${Buffer.from(mina.publicKey).toString('hex')}`,
    occurredAt: '2026-08-12T12:01:00.000Z',
    event: {type: 'INVITATION_CREATED', invitation: {
      invitationId: 'invite-leo', groupId: 'zurich-dinner', inviterId: 'mina', inviteeId: 'leo',
      inviteeAccountPublicKeyHex: recipientAccount(),
      role: 'member', route: 'existing_friend', status: 'invited',
      createdAt: '2026-08-12T12:01:00.000Z', expiresAt: '2099-08-13T12:00:00.000Z',
    }},
    signer: {signBytes: async data => sr25519Sign(data, mina)},
  });
}

function recipientPair() { return sr25519PairFromSeed(new Uint8Array(32).fill(22)); }
function recipientAccount() { return `0x${Buffer.from(recipientPair().publicKey).toString('hex')}`; }
function target(roomId = 'friends-room') {
  return {kind: 'chat_room' as const, roomId, recipientId: 'leo', recipientAccountPublicKeyHex: recipientAccount()};
}
function acknowledgement(item: PendingMembershipDelivery) {
  const pair = recipientPair();
  return createMembershipDeliveryAcknowledgement({
    deliveryId: item.deliveryId,
    event: item.event,
    recipientId: 'leo',
    recipientAccountPublicKeyHex: recipientAccount(),
    receivedAt: '2026-08-12T12:02:00.000Z',
    signer: {signBytes: async bytes => sr25519Sign(bytes, pair)},
  });
}

test('membership delivery survives recreation and retries one stable event', async () => {
  const storage = new MemoryStorage();
  const event = await inviteEvent();
  const first = new MembershipDeliveryOutbox(storage);
  const queued = first.enqueue({target: target(' friends-room '), event});
  assert.equal(queued.target.roomId, 'friends-room');
  assert.equal(first.enqueue({target: target(), event}).deliveryId, queued.deliveryId);

  const recreated = new MembershipDeliveryOutbox(storage);
  assert.equal(recreated.list().length, 1);
  assert.deepEqual(await recreated.flush(async () => null), {delivered: [], pending: [queued.deliveryId]});
  assert.equal(recreated.list().length, 1);
  const wrongPair = sr25519PairFromSeed(new Uint8Array(32).fill(33));
  assert.deepEqual(await recreated.flush(async item => createMembershipDeliveryAcknowledgement({
    deliveryId: item.deliveryId, event: item.event, recipientId: 'leo',
    recipientAccountPublicKeyHex: recipientAccount(), receivedAt: '2026-08-12T12:02:00.000Z',
    signer: {signBytes: async bytes => sr25519Sign(bytes, wrongPair)},
  })), {delivered: [], pending: [queued.deliveryId]});
  assert.equal(recreated.list().length, 1);
  assert.deepEqual(await recreated.flush(async item => item.event.eventId === event.eventId ? acknowledgement(item) : null), {
    delivered: [queued.deliveryId], pending: [],
  });
  assert.equal(recreated.list().length, 0);
});

test('recipient acknowledgement remains final when physical membership cleanup fails', async () => {
  const storage = new FaultInjectingStorage();
  const outbox = new MembershipDeliveryOutbox(storage, 'membership-cleanup-failure');
  const event = await inviteEvent('event-cleanup-failure');
  const queued = outbox.enqueue({target: target(), event});
  const signedAcknowledgement = await acknowledgement(queued);
  storage.throwOnceOnRemoveKey = 'membership-cleanup-failure';

  await assert.rejects(
    outbox.flush(async () => signedAcknowledgement),
    /injected membership cleanup failure/u,
  );

  const recreated = new MembershipDeliveryOutbox(storage, 'membership-cleanup-failure');
  assert.equal(recreated.acknowledgements().length, 1);
  assert.equal(recreated.list().length, 0);
  assert.deepEqual(await recreated.flush(async () => assert.fail('acknowledged grant must not be resent')), {
    delivered: [], pending: [],
  });
  assert.equal(await recreated.acknowledge(signedAcknowledgement), true);
  assert.throws(() => recreated.enqueue({target: target(), event}), /already acknowledged/u);
});

test('silent membership acknowledgement loss is detected before pending delivery cleanup', async () => {
  const storage = new FaultInjectingStorage();
  const outbox = new MembershipDeliveryOutbox(storage, 'membership-ack-write-failure');
  const event = await inviteEvent('event-ack-write-failure');
  const queued = outbox.enqueue({target: target(), event});
  storage.dropOnceOnWriteKey = 'membership-ack-write-failure:acks';

  assert.deepEqual(await outbox.flush(item => acknowledgement(item)), {
    delivered: [], pending: [queued.deliveryId],
  });
  assert.equal(outbox.acknowledgements().length, 0);
  assert.equal(outbox.list().length, 1);

  assert.deepEqual(await new MembershipDeliveryOutbox(storage, 'membership-ack-write-failure').flush(item => acknowledgement(item)), {
    delivered: [queued.deliveryId], pending: [],
  });
});

test('a concurrent enqueue is not overwritten by an older delivery flush', async () => {
  const storage = new MemoryStorage();
  const outbox = new MembershipDeliveryOutbox(storage);
  const first = outbox.enqueue({target: target(), event: await inviteEvent('event-one')});
  const secondEvent = await inviteEvent('event-two');
  const result = await outbox.flush(async item => {
    outbox.enqueue({target: target(), event: secondEvent});
    return item.deliveryId === first.deliveryId ? acknowledgement(item) : null;
  });
  assert.deepEqual(result.delivered, [first.deliveryId]);
  assert.equal(outbox.list().length, 1);
  assert.equal(outbox.list()[0].event.eventId, 'event-two');
});

test('empty target and dropped storage fail before claiming delivery safety', async () => {
  const event = await inviteEvent();
  assert.throws(
    () => new MembershipDeliveryOutbox(new MemoryStorage()).enqueue({target: target(''), event}),
    /Choose a conversation/u,
  );
  const dropping: KeyValueStorage = {read: () => null, write: () => undefined, remove: () => undefined};
  assert.throws(
    () => new MembershipDeliveryOutbox(dropping).enqueue({target: target(), event}),
    /could not be queued|write could not be verified/u,
  );
});

test('same delivery id cannot silently replace the first signed action', async () => {
  const storage = new MemoryStorage();
  const outbox = new MembershipDeliveryOutbox(storage);
  const original = await inviteEvent();
  outbox.enqueue({target: target(), event: original});
  const conflict = {...original, actorId: 'substituted-actor'};
  assert.throws(
    () => outbox.enqueue({target: target(), event: conflict}),
    /identifier already belongs/u,
  );
  assert.equal(outbox.list()[0].event.actorId, 'mina');
});

test('membership delivery outbox corruption fails closed instead of dropping retries', () => {
  const storage = new MemoryStorage();
  storage.write('chopdot-membership-delivery-outbox-v1', '{broken-json');
  assert.throws(() => new MembershipDeliveryOutbox(storage).list(), /outbox is corrupt/u);
  storage.write('chopdot-membership-delivery-outbox-v1', '[{"deliveryId":"fake"}]');
  assert.throws(() => new MembershipDeliveryOutbox(storage).list(), /outbox is corrupt/u);
});

test('V2 grant acknowledgement binds the exact durable recipient envelope and rejects substitution', async () => {
  const fixture = await grantFixture();
  const storage = new MemoryStorage();
  const outbox = new MembershipDeliveryOutbox(storage);
  const queued = outbox.enqueue({target: target(), event: fixture.grant});
  const acknowledgementV2 = await createMembershipDeliveryAcknowledgement({
    deliveryId: queued.deliveryId,
    event: fixture.grant,
    recipientId: 'leo',
    recipientAccountPublicKeyHex: recipientAccount(),
    receivedAt: '2026-08-23T12:04:00.000Z',
    signer: fixture.leoSigner,
    groupKeyEnvelopeRecord: fixture.record,
  });
  assert.equal(acknowledgementV2.v, 2);
  assert.equal(JSON.stringify(acknowledgementV2).includes('"groupKey":'), false);

  const stripped = structuredClone(acknowledgementV2) as unknown as Record<string, unknown>;
  delete stripped.groupKeyEnvelopeRecordDigest;
  assert.deepEqual(await outbox.flush(async () => stripped as never), {
    delivered: [], pending: [queued.deliveryId],
  });

  const tampered = structuredClone(acknowledgementV2);
  tampered.groupKeyEnvelopeRecord.envelope.ciphertext = `${tampered.groupKeyEnvelopeRecord.envelope.ciphertext}A`;
  assert.deepEqual(await outbox.flush(async () => tampered), {
    delivered: [], pending: [queued.deliveryId],
  });

  const swapped = {...acknowledgementV2, eventId: 'another-grant'};
  assert.deepEqual(await outbox.flush(async () => swapped), {
    delivered: [], pending: [queued.deliveryId],
  });

  const wrongRecord = await fixture.ninaRegistry.stageRecipientBinding({
    groupId: 'zurich-dinner', keyVersion: 1, groupKey: new Uint8Array(32).fill(7),
    acknowledgedAt: '2026-08-23T12:03:00.000Z', signer: fixture.ninaSigner,
  });
  await assert.rejects(() => createMembershipDeliveryAcknowledgement({
    deliveryId: queued.deliveryId,
    event: fixture.grant,
    recipientId: 'leo',
    recipientAccountPublicKeyHex: recipientAccount(),
    receivedAt: '2026-08-23T12:04:00.000Z',
    signer: fixture.leoSigner,
    groupKeyEnvelopeRecord: wrongRecord,
  }), /does not match/u);

  assert.deepEqual(await outbox.flush(async () => acknowledgementV2), {
    delivered: [queued.deliveryId], pending: [],
  });
  assert.equal(await outbox.acknowledge(acknowledgementV2), true);
});

async function grantFixture() {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const leo = recipientPair();
  const nina = sr25519PairFromSeed(new Uint8Array(32).fill(33));
  const signer = (pair: typeof mina) => ({signBytes: async (bytes: Uint8Array) => sr25519Sign(bytes, pair)});
  const leoRegistry = new DurableMembershipKeyEnvelopeRegistry({
    productId: 'app.chopdot.dot', participantId: 'leo', accountPublicKeyHex: recipientAccount(),
    storage: new MemoryStorage(), entropy: entropy('leo'),
  });
  const ninaAccount = `0x${Buffer.from(nina.publicKey).toString('hex')}`;
  const ninaRegistry = new DurableMembershipKeyEnvelopeRegistry({
    productId: 'app.chopdot.dot', participantId: 'nina', accountPublicKeyHex: ninaAccount,
    storage: new MemoryStorage(), entropy: entropy('nina'),
  });
  const record = await leoRegistry.stageRecipientBinding({
    groupId: 'zurich-dinner', keyVersion: 1, groupKey: new Uint8Array(32).fill(7),
    acknowledgedAt: '2026-08-23T12:03:00.000Z', signer: signer(leo),
  });
  const grant = await createSignedMembershipEvent({
    eventId: 'event-grant-leo-v2', actorId: 'mina',
    actorAccountPublicKeyHex: `0x${Buffer.from(mina.publicKey).toString('hex')}`,
    occurredAt: '2026-08-23T12:03:30.000Z',
    event: {type: 'MEMBERSHIP_GRANTED', groupKeyEnvelopeId: 'transport-handoff-leo-v1', handoff: {
      v: 1, groupKeyEnvelopeId: 'transport-handoff-leo-v1', invitationId: 'invite-leo',
      groupId: 'zurich-dinner', recipientId: 'leo', recipientAccountPublicKeyHex: recipientAccount(),
      recipientEcdhPublicKey: 'recipient-ecdh', nonce: 'nonce-leo',
      organizerId: 'mina', organizerAccountPublicKeyHex: `0x${Buffer.from(mina.publicKey).toString('hex')}`,
      organizerEcdhPublicKey: 'organizer-ecdh', role: 'member', keyVersion: 1,
      createdAt: '2026-08-23T12:03:30.000Z', expiresAt: '2099-08-23T12:00:00.000Z',
      iv: 'iv', ciphertext: 'ciphertext', signature: `0x${'11'.repeat(64)}`,
    }},
    signer: signer(mina),
  });
  return {grant, record, leoSigner: signer(leo), ninaSigner: signer(nina), ninaRegistry};
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
