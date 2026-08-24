import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {AccountEntropyProvider} from './accountBoundKeyEnvelope.ts';
import type {CanonicalEventChatTransport} from './canonicalEventChatTransport.ts';
import {CanonicalEventDeliveryService} from './canonicalEventDeliveryService.ts';
import {createEncryptedDeliveryEnvelope, type EncryptedDeliveryAckV1, type EncryptedDeliveryEnvelopeV1} from './encryptedEventDelivery.ts';
import type {KeyValueStorage} from './livePayerSync.ts';
import {createCanonicalEvent, type CanonicalEventV1, type CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import type {AccountMessageSigner} from '../membership/groupKeyHandoff.ts';
import {DurableMembershipKeyEnvelopeRegistry} from '../membership/membershipKeyEnvelopeRegistry.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class RecordingTransport implements CanonicalEventChatTransport {
  envelopes: Array<{roomId: string; envelope: EncryptedDeliveryEnvelopeV1}> = [];
  acknowledgements: Array<{roomId: string; acknowledgement: EncryptedDeliveryAckV1}> = [];
  async sendEnvelope(roomId: string, envelope: EncryptedDeliveryEnvelopeV1) {
    this.envelopes.push({roomId, envelope});
    return {messageId: `message-${this.envelopes.length}`};
  }
  async sendAcknowledgement(roomId: string, acknowledgement: EncryptedDeliveryAckV1) {
    this.acknowledgements.push({roomId, acknowledgement});
    return {messageId: `ack-${this.acknowledgements.length}`};
  }
  subscribe() { return {unsubscribe() {}, onInterrupt() { return () => {}; }}; }
}

await cryptoWaitReady();
const pairs = {
  mina: sr25519PairFromSeed(new Uint8Array(32).fill(11)),
  leo: sr25519PairFromSeed(new Uint8Array(32).fill(22)),
  nina: sr25519PairFromSeed(new Uint8Array(32).fill(33)),
};
const account = (id: keyof typeof pairs) => `0x${Buffer.from(pairs[id].publicKey).toString('hex')}`;
const signer = (id: keyof typeof pairs): AccountMessageSigner => ({signBytes: async bytes => sr25519Sign(bytes, pairs[id])});
const entropy = (id: keyof typeof pairs): AccountEntropyProvider => ({deriveAccountEntropy: async context => {
  const prefix = new TextEncoder().encode(id);
  const bytes = new Uint8Array(prefix.length + context.length);
  bytes.set(prefix);
  bytes.set(context, prefix.length);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}});
const groupId = 'g-shared-dinner';
const roomId = 'room-mina-leo';
const now = '2026-08-23T12:00:00.000Z';

test('two account contexts accept one canonical event, return a signed ack, and dedupe its retry', async () => {
  const groupKey = new Uint8Array(32).fill(7);
  const minaStorage = new MemoryStorage();
  const leoStorage = new MemoryStorage();
  const minaRegistry = registry('mina', minaStorage);
  const leoRegistry = registry('leo', leoStorage);
  const minaRecord = await minaRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey, signer: signer('mina'), acknowledgedAt: now});
  const leoRecord = await leoRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey, signer: signer('leo'), acknowledgedAt: now});
  const origin = await groupEvent({
    eventId: 'group-origin', expectedVersion: 0, parentEventId: null, eventType: 'GROUP_CREATED',
    payload: {name: 'Dinner', organizerId: 'mina', members: [
      member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer'),
      member('leo', 1, leoRecord.binding.groupKeyEnvelopeId, 'member'),
    ]},
  });
  const canonical = stateFor(origin, [
    member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer'),
    member('leo', 1, leoRecord.binding.groupKeyEnvelopeId, 'member'),
  ]);
  let leoState: CanonicalGroupStateV1 | null = {...canonical, eventIds: []};
  const transport = new RecordingTransport();
  const mina = service('mina', minaStorage, minaRegistry, transport, async () => undefined, async () => canonical);
  const accepted: CanonicalEventV1[] = [];
  const leo = service('leo', leoStorage, leoRegistry, transport, async envelope => {
    accepted.push(envelope.event);
    leoState = canonical;
  }, async () => leoState);
  await mina.bindGroupToRoom({groupId, roomId});
  await leo.bindGroupToRoom({groupId, roomId});

  assert.deepEqual(await mina.queueAcceptedEvent(origin, canonical), ['event:group-origin:recipient:leo']);
  assert.equal(JSON.stringify([...minaStorage.values.values()]).includes('Dinner'), false);
  const flushed = await mina.flush(now);
  assert.deepEqual(flushed.acceptedByCarrier, ['event:group-origin:recipient:leo']);
  assert.equal(transport.envelopes.length, 1);

  const first = await leo.receiveEnvelope({...transport.envelopes[0], receivedAt: '2026-08-23T12:00:01.000Z'});
  assert.equal(first.outcome, 'applied');
  assert.deepEqual(accepted.map(event => event.eventId), ['group-origin']);
  assert.deepEqual(leoState?.eventIds, canonical.eventIds);
  assert.equal(await mina.receiveAcknowledgement(roomId, first.ack), 'applied');
  assert.equal(mina.pendingDeliveryCount(), 0);

  const duplicate = await leo.receiveEnvelope({...transport.envelopes[0], receivedAt: '2026-08-23T12:00:02.000Z'});
  assert.equal(duplicate.outcome, 'duplicate');
  assert.deepEqual(accepted.map(event => event.eventId), ['group-origin']);
});

test('solo signed origin needs no room, while the first shared event fails closed until a room is bound', async () => {
  const groupKey = new Uint8Array(32).fill(4);
  const storage = new MemoryStorage();
  const minaRegistry = registry('mina', storage);
  const minaRecord = await minaRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey, signer: signer('mina'), acknowledgedAt: now});
  const origin = await groupEvent({eventId: 'solo-origin', expectedVersion: 0, parentEventId: null, eventType: 'GROUP_CREATED', payload: {
    name: 'Solo first', organizerId: 'mina', members: [member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer')],
  }});
  const solo = stateFor(origin, [member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer')]);
  const transport = new RecordingTransport();
  const mina = service('mina', storage, minaRegistry, transport, async () => undefined, async () => solo);
  assert.deepEqual(await mina.queueAcceptedEvent(origin, solo), []);
  assert.equal(mina.pendingDeliveryCount(), 0);

  const shared = {...solo, members: {
    ...solo.members,
    leo: member('leo', 1, `sha256:${'aa'.repeat(32)}`, 'member'),
  }};
  await assert.rejects(mina.queueAcceptedEvent(origin, shared), /Choose a conversation/u);
  assert.equal(mina.pendingDeliveryCount(), 0);
});

test('removal atomically queues v2 for remaining members and only the signed removal under v1 for the removed account', async () => {
  const oldKey = new Uint8Array(32).fill(3);
  const nextKey = new Uint8Array(32).fill(9);
  const minaStorage = new MemoryStorage();
  const leoStorage = new MemoryStorage();
  const ninaStorage = new MemoryStorage();
  const minaRegistry = registry('mina', minaStorage);
  const leoRegistry = registry('leo', leoStorage);
  const ninaRegistry = registry('nina', ninaStorage);
  const minaV1 = await minaRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey: oldKey, signer: signer('mina'), acknowledgedAt: now});
  const leoV1 = await leoRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey: oldKey, signer: signer('leo'), acknowledgedAt: now});
  const ninaV1 = await ninaRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey: oldKey, signer: signer('nina'), acknowledgedAt: now});
  const minaV2 = await minaRegistry.stageRecipientBinding({groupId, keyVersion: 2, groupKey: nextKey, signer: signer('mina'), acknowledgedAt: now});
  const leoV2 = await leoRegistry.stageRecipientBinding({groupId, keyVersion: 2, groupKey: nextKey, signer: signer('leo'), acknowledgedAt: now});
  // The organizer imports the exact recipient acknowledgement record during
  // the removal ceremony; it cannot open it and does not need to.
  await minaRegistry.importAcknowledged(leoV2);
  const openMinaEnvelope = minaRegistry.open.bind(minaRegistry);
  const openedRemovalKeys: Uint8Array[] = [];
  let rejectNextKeyOpen = true;
  minaRegistry.open = async binding => {
    if (binding.keyVersion === 2 && rejectNextKeyOpen) throw new Error('injected next-key open failure');
    const opened = await openMinaEnvelope(binding);
    openedRemovalKeys.push(opened);
    return opened;
  };
  const v1Members = [
    member('mina', 1, minaV1.binding.groupKeyEnvelopeId, 'organizer'),
    member('leo', 1, leoV1.binding.groupKeyEnvelopeId, 'member'),
    member('nina', 1, ninaV1.binding.groupKeyEnvelopeId, 'member'),
  ];
  const origin = await groupEvent({eventId: 'removal-origin', expectedVersion: 0, parentEventId: null, eventType: 'GROUP_CREATED', payload: {name: 'Removal', organizerId: 'mina', members: v1Members}});
  const removed = await groupEvent({eventId: 'remove-nina', expectedVersion: 1, parentEventId: origin.eventId, eventType: 'MEMBER_REMOVED', payload: {
    participantId: 'nina', nextKeyVersion: 2,
    groupKeyEnvelopeIds: {mina: minaV2.binding.groupKeyEnvelopeId, leo: leoV2.binding.groupKeyEnvelopeId},
  }});
  const before = stateFor(origin, v1Members);
  const after = stateFor(removed, [
    member('mina', 2, minaV2.binding.groupKeyEnvelopeId, 'organizer'),
    member('leo', 2, leoV2.binding.groupKeyEnvelopeId, 'member'),
    {...member('nina', 1, ninaV1.binding.groupKeyEnvelopeId, 'member'), active: false},
  ], 2);
  after.version = 2;
  after.eventIds = [origin.eventId, removed.eventId];
  const transport = new RecordingTransport();
  const mina = service('mina', minaStorage, minaRegistry, transport, async () => undefined, async () => after);
  let leoState: CanonicalGroupStateV1 | null = before;
  let ninaState: CanonicalGroupStateV1 | null = before;
  const leo = service('leo', leoStorage, leoRegistry, transport, async envelope => { assert.equal(envelope.event.eventId, removed.eventId); leoState = after; }, async () => leoState);
  const nina = service('nina', ninaStorage, ninaRegistry, transport, async envelope => { assert.equal(envelope.event.eventId, removed.eventId); ninaState = after; }, async () => ninaState);
  const binding = await mina.bindGroupToRoom({groupId, roomId});
  await leo.bindGroupToRoom({groupId, roomId});
  await nina.bindGroupToRoom({groupId, roomId});

  await assert.rejects(
    mina.queueMembershipRemoval({events: [origin, removed], participantId: 'nina'}),
    /injected next-key open failure/u,
  );
  assert.deepEqual(openedRemovalKeys, [new Uint8Array(32)]);
  assert.equal(mina.pendingDeliveryCount(), 0);
  rejectNextKeyOpen = false;
  assert.deepEqual(await mina.queueMembershipRemoval({events: [origin, removed], participantId: 'nina'}), [
    'event:remove-nina:recipient:leo', 'removal:remove-nina:recipient:nina',
  ]);
  assert.deepEqual(openedRemovalKeys, [new Uint8Array(32), new Uint8Array(32), new Uint8Array(32)]);
  assert.equal(mina.pendingDeliveryCount(), 2);
  await mina.flush(now);
  const leoDelivery = transport.envelopes.find(item => item.envelope.recipientAccountPublicKeyHex === account('leo'))!;
  const ninaDelivery = transport.envelopes.find(item => item.envelope.recipientAccountPublicKeyHex === account('nina'))!;
  assert.equal(leoDelivery.envelope.keyVersion, 2);
  assert.equal(ninaDelivery.envelope.keyVersion, 1);
  assert.equal((await leo.receiveEnvelope({...leoDelivery, receivedAt: '2026-08-23T12:00:01.000Z'})).outcome, 'applied');
  const ninaFirst = await nina.receiveEnvelope({...ninaDelivery, receivedAt: '2026-08-23T12:00:01.000Z'});
  assert.equal(ninaFirst.outcome, 'applied');
  // Lost acknowledgement: the exact ciphertext retry returns the stored ack
  // even though the accepted removal now marks this account inactive.
  assert.equal((await nina.receiveEnvelope({...ninaDelivery, receivedAt: '2026-08-23T12:00:02.000Z'})).outcome, 'duplicate');

  const leaked = await createEncryptedDeliveryEnvelope({
    envelopeId: 'post-removal-old-key', channelId: binding.channelId,
    senderAccountPublicKeyHex: account('mina'), recipientAccountPublicKeyHex: account('nina'), keyVersion: 1,
    createdAt: '2026-08-23T12:00:03.000Z', expiresAt: '2026-08-24T12:00:03.000Z', deliveryKey: oldKey,
    payload: {v: 1, kind: 'chopdot.canonical-authority-event.v1', body: JSON.parse(JSON.stringify(removed))}, signer: signer('mina'),
  });
  await assert.rejects(nina.receiveEnvelope({roomId, envelope: leaked, receivedAt: '2026-08-23T12:00:04.000Z'}), /no longer an active/u);
});

test('removed member is not queued and its old account-bound key cannot open a future-key delivery', async () => {
  const oldKey = new Uint8Array(32).fill(3);
  const futureKey = new Uint8Array(32).fill(9);
  const minaStorage = new MemoryStorage();
  const leoStorage = new MemoryStorage();
  const ninaStorage = new MemoryStorage();
  const minaRegistry = registry('mina', minaStorage);
  const leoRegistry = registry('leo', leoStorage);
  const ninaRegistry = registry('nina', ninaStorage);
  await ninaRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey: oldKey, signer: signer('nina'), acknowledgedAt: now});
  const minaV2 = await minaRegistry.stageRecipientBinding({groupId, keyVersion: 2, groupKey: futureKey, signer: signer('mina'), acknowledgedAt: now});
  const leoV2 = await leoRegistry.stageRecipientBinding({groupId, keyVersion: 2, groupKey: futureKey, signer: signer('leo'), acknowledgedAt: now});
  const rotation = await groupEvent({
    eventId: 'rotate-after-nina-removal', expectedVersion: 1, parentEventId: 'remove-nina', eventType: 'GROUP_KEY_ROTATED',
    payload: {nextKeyVersion: 2, groupKeyEnvelopeIds: {mina: minaV2.binding.groupKeyEnvelopeId, leo: leoV2.binding.groupKeyEnvelopeId}},
  });
  const members = [
    member('mina', 2, minaV2.binding.groupKeyEnvelopeId, 'organizer'),
    member('leo', 2, leoV2.binding.groupKeyEnvelopeId, 'member'),
    {...member('nina', 1, `sha256:${'ab'.repeat(32)}`, 'member'), active: false},
  ];
  const canonical = stateFor(rotation, members, 2);
  const transport = new RecordingTransport();
  const mina = service('mina', minaStorage, minaRegistry, transport, async () => undefined, async () => canonical);
  const nina = service('nina', ninaStorage, ninaRegistry, transport, async () => {
    throw new Error('removed member must not accept');
  }, async () => canonical);
  await mina.bindGroupToRoom({groupId, roomId});
  await nina.bindGroupToRoom({groupId, roomId});
  const queued = await mina.queueAcceptedEvent(rotation, canonical);
  assert.deepEqual(queued, ['event:rotate-after-nina-removal:recipient:leo']);
  await mina.flush(now);
  assert.equal(transport.envelopes[0].envelope.recipientAccountPublicKeyHex, account('leo'));

  const forgedRouting = {...transport.envelopes[0].envelope, recipientAccountPublicKeyHex: account('nina')};
  await assert.rejects(nina.receiveEnvelope({roomId, envelope: forgedRouting, receivedAt: '2026-08-23T12:00:01.000Z'}), /does not have access|no longer an active/u);
});

test('wrong room, failed authority acceptance, and swapped sender remain unacknowledged and retryable', async () => {
  const groupKey = new Uint8Array(32).fill(5);
  const minaStorage = new MemoryStorage();
  const leoStorage = new MemoryStorage();
  const minaRegistry = registry('mina', minaStorage);
  const leoRegistry = registry('leo', leoStorage);
  const minaRecord = await minaRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey, signer: signer('mina'), acknowledgedAt: now});
  const leoRecord = await leoRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey, signer: signer('leo'), acknowledgedAt: now});
  const origin = await groupEvent({eventId: 'retry-origin', expectedVersion: 0, parentEventId: null, eventType: 'GROUP_CREATED', payload: {
    name: 'Retry', organizerId: 'mina', members: [member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer'), member('leo', 1, leoRecord.binding.groupKeyEnvelopeId, 'member')],
  }});
  const canonical = stateFor(origin, [member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer'), member('leo', 1, leoRecord.binding.groupKeyEnvelopeId, 'member')]);
  const transport = new RecordingTransport();
  const mina = service('mina', minaStorage, minaRegistry, transport, async () => undefined, async () => canonical);
  let reject = true;
  const leo = service('leo', leoStorage, leoRegistry, transport, async () => {
    if (reject) throw new Error('authority frontier missing');
  }, async () => canonical);
  await mina.bindGroupToRoom({groupId, roomId});
  await leo.bindGroupToRoom({groupId, roomId});
  await mina.queueAcceptedEvent(origin, canonical);
  await mina.flush(now);
  const envelope = transport.envelopes[0].envelope;
  await assert.rejects(leo.receiveEnvelope({roomId: 'wrong-room', envelope}), /wrong conversation/u);
  await assert.rejects(leo.receiveEnvelope({roomId, envelope, receivedAt: '2026-08-23T12:00:01.000Z'}), /authority frontier missing/u);
  reject = false;
  const accepted = await leo.receiveEnvelope({roomId, envelope, receivedAt: '2026-08-23T12:00:02.000Z'});
  assert.equal(accepted.outcome, 'applied');
  const swappedSender = {...envelope, envelopeId: 'swapped', senderAccountPublicKeyHex: account('nina')};
  await assert.rejects(leo.receiveEnvelope({roomId, envelope: swappedSender, receivedAt: '2026-08-23T12:00:03.000Z'}), /signature|sender/u);
});

test('new member receives one ordered encrypted history and atomically imports it before acknowledgement', async () => {
  const groupKey = new Uint8Array(32).fill(6);
  const minaStorage = new MemoryStorage();
  const leoStorage = new MemoryStorage();
  const minaRegistry = registry('mina', minaStorage);
  const leoRegistry = registry('leo', leoStorage);
  const minaRecord = await minaRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey, signer: signer('mina'), acknowledgedAt: now});
  const leoRecord = await leoRegistry.stageRecipientBinding({groupId, keyVersion: 1, groupKey, signer: signer('leo'), acknowledgedAt: now});
  const origin = await groupEvent({eventId: 'catchup-origin', expectedVersion: 0, parentEventId: null, eventType: 'GROUP_CREATED', payload: {
    name: 'Catch-up', organizerId: 'mina', members: [member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer')],
  }});
  const added = await groupEvent({eventId: 'catchup-add-leo', expectedVersion: 1, parentEventId: origin.eventId, eventType: 'MEMBER_ADDED', payload: {
    member: member('leo', 1, leoRecord.binding.groupKeyEnvelopeId, 'member'),
  }});
  const latest = stateFor(added, [member('mina', 1, minaRecord.binding.groupKeyEnvelopeId, 'organizer'), member('leo', 1, leoRecord.binding.groupKeyEnvelopeId, 'member')]);
  latest.version = 2;
  latest.eventIds = [origin.eventId, added.eventId];
  const transport = new RecordingTransport();
  const mina = service('mina', minaStorage, minaRegistry, transport, async () => undefined, async () => latest);
  let imported: CanonicalEventV1[] = [];
  const leo = new CanonicalEventDeliveryService({
    participantId: 'leo', accountPublicKeyHex: account('leo'), signer: signer('leo'), storage: leoStorage,
    keyEnvelopes: leoRegistry, transport, now: () => now, namespace: 'delivery-leo-history',
    authority: {
      readCanonicalGroup: async () => imported.length ? latest : null,
      accept: async () => { throw new Error('history must use atomic import'); },
      importHistory: async events => { imported = structuredClone(events); },
    },
  });
  await mina.bindGroupToRoom({groupId, roomId});
  await leo.bindGroupToRoom({groupId, roomId});
  assert.equal(await mina.queueHistoryForRecipient({events: [origin, added], state: latest, recipientId: 'leo'}), 'history:catchup-add-leo:recipient:leo');
  assert.equal(await mina.queueHistoryForRecipient({events: [origin, added], state: latest, recipientId: 'leo'}), 'history:catchup-add-leo:recipient:leo');
  assert.equal(mina.pendingDeliveryCount(), 1);
  await mina.flush(now);
  const received = await leo.receiveEnvelope({...transport.envelopes[0], receivedAt: '2026-08-23T12:00:01.000Z'});
  assert.equal(received.outcome, 'applied');
  assert.deepEqual(imported.map(event => event.eventId), ['catchup-origin', 'catchup-add-leo']);
  assert.equal(await mina.receiveAcknowledgement(roomId, received.ack), 'applied');
  assert.equal(await mina.queueHistoryForRecipient({events: [origin, added], state: latest, recipientId: 'leo'}), 'history:catchup-add-leo:recipient:leo');
  assert.equal(mina.pendingDeliveryCount(), 0);
});

function registry(id: keyof typeof pairs, storage: MemoryStorage) {
  return new DurableMembershipKeyEnvelopeRegistry({productId: 'app.chopdot.dot', participantId: id, accountPublicKeyHex: account(id), storage, entropy: entropy(id)});
}

function service(
  id: keyof typeof pairs,
  storage: MemoryStorage,
  keyEnvelopes: DurableMembershipKeyEnvelopeRegistry,
  transport: RecordingTransport,
  accept: (envelope: {v: 1; kind: 'chopdot-authority-event'; event: CanonicalEventV1}) => Promise<void>,
  readCanonicalGroup: () => Promise<CanonicalGroupStateV1 | null>,
) {
  return new CanonicalEventDeliveryService({
    participantId: id, accountPublicKeyHex: account(id), signer: signer(id), storage, keyEnvelopes, transport,
    authority: {accept, readCanonicalGroup}, now: () => now, namespace: `delivery-${id}`,
  });
}

async function groupEvent(input: Pick<CanonicalEventV1, 'eventId' | 'expectedVersion' | 'parentEventId' | 'eventType' | 'payload'>) {
  return createCanonicalEvent({
    ...input, commandId: `command-${input.eventId}`, groupId, actorId: 'mina', actorAccountPublicKeyHex: account('mina'),
    actorRole: 'organizer', occurredAt: now,
  }, {sign: async bytes => sr25519Sign(bytes, pairs.mina)});
}

function member(id: keyof typeof pairs, keyVersion: number, groupKeyEnvelopeId: string, role: 'organizer' | 'member') {
  return {participantId: id, accountPublicKeyHex: account(id), role, active: true, acceptedAt: now, invitationId: `accepted-${id}`, keyVersion, groupKeyEnvelopeId};
}

function stateFor(event: CanonicalEventV1, members: ReturnType<typeof member>[], groupKeyVersion = 1): CanonicalGroupStateV1 {
  return {
    v: 1, groupId, name: 'Dinner', mode: 'normal_pot', version: event.expectedVersion + 1,
    currentEventId: event.eventId, organizerId: 'mina', groupKeyVersion,
    members: Object.fromEntries(members.map(value => [value.participantId, value])),
    expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: [event.eventId],
  };
}
