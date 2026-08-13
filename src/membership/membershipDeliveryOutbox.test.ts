import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {createSignedMembershipEvent} from './signedMembershipEvents.ts';
import {MembershipDeliveryOutbox} from './membershipDeliveryOutbox.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
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
      inviteeAccountPublicKeyHex: `0x${'22'.repeat(32)}`,
      role: 'member', route: 'existing_friend', status: 'invited',
      createdAt: '2026-08-12T12:01:00.000Z', expiresAt: '2099-08-13T12:00:00.000Z',
    }},
    signer: {signBytes: async data => sr25519Sign(data, mina)},
  });
}

test('membership delivery survives recreation and retries one stable event', async () => {
  const storage = new MemoryStorage();
  const event = await inviteEvent();
  const first = new MembershipDeliveryOutbox(storage);
  const queued = first.enqueue({target: {kind: 'chat_room', roomId: ' friends-room '}, event});
  assert.equal(queued.target.roomId, 'friends-room');
  assert.equal(first.enqueue({target: {kind: 'chat_room', roomId: 'friends-room'}, event}).deliveryId, queued.deliveryId);

  const recreated = new MembershipDeliveryOutbox(storage);
  assert.equal(recreated.list().length, 1);
  assert.deepEqual(await recreated.flush(async () => false), {delivered: [], pending: [queued.deliveryId]});
  assert.equal(recreated.list().length, 1);
  assert.deepEqual(await recreated.flush(async item => item.event.eventId === event.eventId), {
    delivered: [queued.deliveryId], pending: [],
  });
  assert.equal(recreated.list().length, 0);
});

test('a concurrent enqueue is not overwritten by an older delivery flush', async () => {
  const storage = new MemoryStorage();
  const outbox = new MembershipDeliveryOutbox(storage);
  const first = outbox.enqueue({target: {kind: 'chat_room', roomId: 'friends-room'}, event: await inviteEvent('event-one')});
  const secondEvent = await inviteEvent('event-two');
  const result = await outbox.flush(async item => {
    outbox.enqueue({target: {kind: 'chat_room', roomId: 'friends-room'}, event: secondEvent});
    return item.deliveryId === first.deliveryId;
  });
  assert.deepEqual(result.delivered, [first.deliveryId]);
  assert.equal(outbox.list().length, 1);
  assert.equal(outbox.list()[0].event.eventId, 'event-two');
});

test('empty target and dropped storage fail before claiming delivery safety', async () => {
  const event = await inviteEvent();
  assert.throws(
    () => new MembershipDeliveryOutbox(new MemoryStorage()).enqueue({target: {kind: 'chat_room', roomId: ''}, event}),
    /Choose a conversation/u,
  );
  const dropping: KeyValueStorage = {read: () => null, write: () => undefined, remove: () => undefined};
  assert.throws(
    () => new MembershipDeliveryOutbox(dropping).enqueue({target: {kind: 'chat_room', roomId: 'friends-room'}, event}),
    /could not be queued/u,
  );
});

test('same delivery id cannot silently replace the first signed action', async () => {
  const storage = new MemoryStorage();
  const outbox = new MembershipDeliveryOutbox(storage);
  const original = await inviteEvent();
  outbox.enqueue({target: {kind: 'chat_room', roomId: 'friends-room'}, event: original});
  const conflict = {...original, actorId: 'substituted-actor'};
  assert.throws(
    () => outbox.enqueue({target: {kind: 'chat_room', roomId: 'friends-room'}, event: conflict}),
    /identifier already belongs/u,
  );
  assert.equal(outbox.list()[0].event.actorId, 'mina');
});
