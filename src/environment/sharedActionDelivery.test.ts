import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer} from '../state/store.ts';
import type {AppState} from '../types.ts';
import {createSharedEnvelope, type HostParticipant} from './hostSessionSync.ts';
import {
  DeferredSharedEventInbox,
  ProcessedEventLedger,
  SharedActionOutbox,
  resolveSharedActionSessions,
  restoreDeferredSharedEvents,
  sharedSessionKey,
} from './sharedActionDelivery.ts';
import type {KeyValueStorage} from './livePayerSync.ts';

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  read(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  write(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

const participant: HostParticipant = {
  userId: 'u-mina',
  publicKeyHex: `0x${'11'.repeat(32)}`,
  username: 'Mina',
};

function createLiveGroupState(): AppState {
  let state = createCleanState();
  state = reducer(state, {
    type: 'ADD_USER',
    payload: {user: {id: participant.userId, name: 'Mina', accountPublicKeyHex: participant.publicKeyHex}},
  });
  state = reducer(state, {
    type: 'CREATE_GROUP',
    payload: {
      group: {
        id: 'g-zurich',
        name: 'Zurich dinner',
        memberIds: [participant.userId],
        liveSession: {roomId: 'room-zurich', secret: 'secret-zurich'},
      },
    },
  });
  return state;
}

test('general outbox keeps the same event and target across provider recreation', async () => {
  const storage = new MemoryStorage();
  const session = {roomId: 'room-zurich', secret: 'secret-zurich'};
  const envelope = createSharedEnvelope({
    type: 'ADD_EXPENSE',
    payload: {
      expense: {
        id: 'e-dinner',
        groupId: 'g-zurich',
        description: 'Dinner',
        amount: 120,
        currency: 'CHF',
        paidByUserId: participant.userId,
        date: '2026-08-11',
      },
      splits: [],
    },
  }, participant);
  const first = new SharedActionOutbox(storage);
  const queued = first.enqueue({session, envelope});

  assert.deepEqual(await first.flush(async () => false), {
    published: [],
    pending: [queued.deliveryId],
  });

  const afterRestart = new SharedActionOutbox(storage);
  assert.deepEqual(afterRestart.list(), [queued]);
  assert.deepEqual(await afterRestart.flush(async item => item.envelope.eventId === envelope.eventId), {
    published: [queued.deliveryId],
    pending: [],
  });
  assert.deepEqual(afterRestart.list(), []);
});

test('a concurrent enqueue is not overwritten by an older flush snapshot', async () => {
  const storage = new MemoryStorage();
  const outbox = new SharedActionOutbox(storage);
  const session = {roomId: 'room-zurich', secret: 'secret-zurich'};
  const first = outbox.enqueue({
    session,
    envelope: createSharedEnvelope({
      type: 'CREATE_GROUP',
      payload: {group: {id: 'g-one', name: 'One', memberIds: [participant.userId], liveSession: session}},
    }, participant),
  });
  const secondEnvelope = createSharedEnvelope({
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-two', name: 'Two', memberIds: [participant.userId], liveSession: session}},
  }, participant);

  await outbox.flush(async () => {
    outbox.enqueue({session, envelope: secondEnvelope});
    return true;
  });

  assert.equal(outbox.list().length, 1);
  assert.equal(outbox.list()[0]?.envelope.eventId, secondEnvelope.eventId);
  assert.notEqual(outbox.list()[0]?.deliveryId, first.deliveryId);
});

test('group-scoped action resolves the stored group session without a query session', () => {
  const state = createLiveGroupState();
  const action = {
    type: 'ADD_EXPENSE' as const,
    payload: {
      expense: {
        id: 'e-dinner',
        groupId: 'g-zurich',
        description: 'Dinner',
        amount: 120,
        currency: 'CHF',
        paidByUserId: participant.userId,
        date: '2026-08-11',
      },
      splits: [],
    },
  };

  assert.deepEqual(resolveSharedActionSessions(state, action, null), [
    {roomId: 'room-zurich', secret: 'secret-zurich'},
  ]);
});

test('query and stored routes are deduplicated when they identify the same session', () => {
  const state = createLiveGroupState();
  const action = {
    type: 'SAVE_RECORD' as const,
    payload: {recordId: 'record-zurich', groupId: 'g-zurich'},
  };
  const query = {roomId: 'room-zurich', secret: 'secret-zurich'};

  assert.deepEqual(resolveSharedActionSessions(state, action, query), [query]);
  assert.equal(sharedSessionKey(query), 'room-zurich:secret-zurich');
});

test('processed event ledger survives recreation and records one terminal outcome', () => {
  const storage = new MemoryStorage();
  const first = new ProcessedEventLedger(storage);
  first.record('evt-one', 'applied');
  first.record('evt-one', 'rejected');

  const afterRestart = new ProcessedEventLedger(storage);
  assert.equal(afterRestart.has('evt-one'), true);
  assert.deepEqual(afterRestart.list(), [{eventId: 'evt-one', outcome: 'applied'}]);

  afterRestart.clear();
  assert.equal(new ProcessedEventLedger(storage).has('evt-one'), false);
});

test('deferred inbound event survives recreation with its verified signer', () => {
  const storage = new MemoryStorage();
  const storageKey = 'deferred-test';
  const envelope = createSharedEnvelope({
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-early', name: 'Early dinner', memberIds: [participant.userId]}},
  }, participant);
  const signerHex = `0x${'22'.repeat(32)}`;
  const first = new DeferredSharedEventInbox(storage, storageKey);
  const deferred = first.defer({
    envelope,
    signerHex,
    receivedAt: '2026-08-12T08:00:00.000Z',
  });

  assert.deepEqual(new DeferredSharedEventInbox(storage, storageKey).list(), [deferred]);
});

test('deferred inbox keeps the first verified content for an event id', () => {
  const storage = new MemoryStorage();
  const inbox = new DeferredSharedEventInbox(storage, 'deferred-test');
  const firstEnvelope = {
    ...createSharedEnvelope({
      type: 'CREATE_GROUP' as const,
      payload: {group: {id: 'g-first', name: 'First', memberIds: [participant.userId]}},
    }, participant),
    eventId: 'evt-collision',
  };
  const conflictingEnvelope = {
    ...createSharedEnvelope({
      type: 'CREATE_GROUP' as const,
      payload: {group: {id: 'g-second', name: 'Second', memberIds: [participant.userId]}},
    }, participant),
    eventId: 'evt-collision',
  };

  const first = inbox.defer({envelope: firstEnvelope, receivedAt: '2026-08-12T08:01:00.000Z'});
  const duplicate = inbox.defer({envelope: conflictingEnvelope, receivedAt: '2026-08-12T08:02:00.000Z'});

  assert.deepEqual(duplicate, first);
  const restoredAction = inbox.list()[0]?.envelope.action;
  assert.equal(restoredAction?.type, 'CREATE_GROUP');
  assert.equal(restoredAction?.type === 'CREATE_GROUP' ? restoredAction.payload.group.id : undefined, 'g-first');
});

test('deferred inbox restores valid rows without trusting corrupt siblings', () => {
  const storage = new MemoryStorage();
  const storageKey = 'deferred-test';
  const envelope = createSharedEnvelope({
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-valid', name: 'Valid', memberIds: [participant.userId]}},
  }, participant);
  const valid = {
    eventId: envelope.eventId,
    envelope,
    signerHex: `0x${'33'.repeat(32)}`,
    receivedAt: '2026-08-12T08:03:00.000Z',
  };
  storage.values.set(storageKey, JSON.stringify([
    valid,
    {...valid, eventId: 'wrong-event-id'},
    {...valid, eventId: envelope.eventId, signerHex: 'not-a-signer'},
    {...valid, eventId: envelope.eventId, receivedAt: 'not-a-date'},
    {eventId: 'missing-envelope'},
  ]));

  assert.deepEqual(new DeferredSharedEventInbox(storage, storageKey).list(), [valid]);
});

test('restore prunes a stale deferred copy of a terminally processed event', () => {
  const storage = new MemoryStorage();
  const storageKey = 'deferred-test';
  const inbox = new DeferredSharedEventInbox(storage, storageKey);
  const envelope = createSharedEnvelope({
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-applied', name: 'Applied', memberIds: [participant.userId]}},
  }, participant);
  inbox.defer({envelope, receivedAt: '2026-08-12T08:04:00.000Z'});

  const restored = restoreDeferredSharedEvents(inbox, new Set([envelope.eventId]));

  assert.equal(restored.size, 0);
  assert.deepEqual(inbox.list(), []);
});

test('defer fails instead of claiming restart safety when storage does not retain the event', () => {
  const storage: KeyValueStorage = {
    read: () => null,
    write: () => 'memory-only',
    remove: () => undefined,
  };
  const inbox = new DeferredSharedEventInbox(storage, 'deferred-test');
  const envelope = createSharedEnvelope({
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-not-saved', name: 'Not saved', memberIds: [participant.userId]}},
  }, participant);

  assert.throws(
    () => inbox.defer({envelope, receivedAt: '2026-08-12T08:05:00.000Z'}),
    /could not be persisted/u,
  );
});
