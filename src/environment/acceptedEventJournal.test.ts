import assert from 'node:assert/strict';
import test from 'node:test';
import type {SharedActionEnvelope} from './hostSessionSync.ts';
import {
  AcceptedEventConflictError,
  AcceptedEventJournal,
  AcceptedEventPersistenceError,
  type VerifiedEventProofMetadata,
} from './acceptedEventJournal.ts';
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

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;

function envelope({
  eventId,
  groupId,
  occurredAt,
}: {
  eventId: string;
  groupId: string;
  occurredAt: string;
}): SharedActionEnvelope {
  return {
    v: 1,
    eventId,
    actorUserId: 'u-mina',
    actorPublicKeyHex: minaKey,
    occurredAt,
    action: {
      type: 'CREATE_GROUP',
      payload: {group: {id: groupId, name: 'Zurich dinner', memberIds: ['u-mina']}},
    },
  };
}

function verification({
  signerHex = minaKey,
  proofByte = 'aa',
  verifiedAt = '2026-08-12T12:00:00.000Z',
}: {
  signerHex?: string;
  proofByte?: string;
  verifiedAt?: string;
} = {}): VerifiedEventProofMetadata {
  return {
    status: 'verified',
    source: 'statement-store',
    signerHex,
    proof: {kind: 'statement-store-sr25519', bytesHex: `0x${proofByte.repeat(64)}`},
    verifiedAt,
  };
}

test('accepted envelope and verified proof metadata survive journal recreation', () => {
  const storage = new MemoryStorage();
  const first = new AcceptedEventJournal(storage, 'accepted-test');
  const accepted = first.appendVerified({
    envelope: envelope({eventId: 'evt-one', groupId: 'g-one', occurredAt: '2026-08-12T10:00:00.000Z'}),
    verification: verification(),
    acceptedAt: '2026-08-12T12:01:00.000Z',
  });

  assert.deepEqual(new AcceptedEventJournal(storage, 'accepted-test').list(), [accepted]);
  assert.equal(accepted.verification.proof.bytesHex, `0x${'aa'.repeat(64)}`);
});

test('same envelope and signer preserve the first proof and receipt metadata', () => {
  const storage = new MemoryStorage();
  const journal = new AcceptedEventJournal(storage, 'accepted-test');
  const sharedEnvelope = envelope({eventId: 'evt-same', groupId: 'g-same', occurredAt: '2026-08-12T10:00:00.000Z'});
  const first = journal.appendVerified({
    envelope: sharedEnvelope,
    verification: verification({proofByte: 'aa'}),
    acceptedAt: '2026-08-12T12:01:00.000Z',
  });
  const duplicate = journal.appendVerified({
    envelope: sharedEnvelope,
    verification: verification({proofByte: 'bb', verifiedAt: '2026-08-12T13:00:00.000Z'}),
    acceptedAt: '2026-08-12T13:01:00.000Z',
  });

  assert.deepEqual(duplicate, first);
  assert.equal(journal.list().length, 1);
  assert.equal(journal.list()[0]?.verification.proof.bytesHex, `0x${'aa'.repeat(64)}`);
});

test('conflicting event-id reuse is rejected without replacing the first record', () => {
  const storage = new MemoryStorage();
  const journal = new AcceptedEventJournal(storage, 'accepted-test');
  const first = journal.appendVerified({
    envelope: envelope({eventId: 'evt-conflict', groupId: 'g-first', occurredAt: '2026-08-12T10:00:00.000Z'}),
    verification: verification(),
  });

  assert.throws(() => journal.appendVerified({
    envelope: envelope({eventId: 'evt-conflict', groupId: 'g-second', occurredAt: '2026-08-12T10:00:00.000Z'}),
    verification: verification(),
  }), AcceptedEventConflictError);
  assert.throws(() => journal.appendVerified({
    envelope: first.envelope,
    verification: verification({signerHex: leoKey}),
  }), AcceptedEventConflictError);
  assert.deepEqual(journal.list(), [first]);
});

test('restore keeps valid siblings and rejects corrupt or conflicting rows', () => {
  const storage = new MemoryStorage();
  const storageKey = 'accepted-test';
  const firstEnvelope = envelope({eventId: 'evt-valid-one', groupId: 'g-one', occurredAt: '2026-08-12T10:00:00.000Z'});
  const secondEnvelope = envelope({eventId: 'evt-valid-two', groupId: 'g-two', occurredAt: '2026-08-12T11:00:00.000Z'});
  const first = {
    v: 1,
    eventId: firstEnvelope.eventId,
    envelope: firstEnvelope,
    verification: verification(),
    acceptedAt: '2026-08-12T12:00:00.000Z',
  };
  const second = {
    v: 1,
    eventId: secondEnvelope.eventId,
    envelope: secondEnvelope,
    verification: verification({proofByte: 'bb'}),
    acceptedAt: '2026-08-12T12:01:00.000Z',
  };
  storage.values.set(storageKey, JSON.stringify([
    first,
    {...first, eventId: 'wrong-id'},
    {...first, envelope: {...firstEnvelope, action: {...firstEnvelope.action, payload: {group: {id: 'g-conflict', name: 'Conflict', memberIds: ['u-mina']}}}}},
    {...first, verification: {...first.verification, signerHex: 'not-a-key'}},
    {...first, acceptedAt: 'not-a-date'},
    second,
  ]));

  const restored = new AcceptedEventJournal(storage, storageKey).restore();
  assert.deepEqual(restored.records, [first, second]);
  assert.equal(restored.rejectedRows, 4);
});

test('frontier is deterministic across insertion, receipt, and proof order', async () => {
  const firstStorage = new MemoryStorage();
  const secondStorage = new MemoryStorage();
  const early = envelope({eventId: 'evt-early', groupId: 'g-early', occurredAt: '2026-08-12T09:00:00.000Z'});
  const late = envelope({eventId: 'evt-late', groupId: 'g-late', occurredAt: '2026-08-12T10:00:00.000Z'});

  const first = new AcceptedEventJournal(firstStorage, 'accepted-test');
  first.appendVerified({envelope: late, verification: verification({proofByte: 'aa'}), acceptedAt: '2026-08-12T12:00:00.000Z'});
  first.appendVerified({envelope: early, verification: verification({proofByte: 'bb'}), acceptedAt: '2026-08-12T12:01:00.000Z'});

  const second = new AcceptedEventJournal(secondStorage, 'accepted-test');
  second.appendVerified({envelope: early, verification: verification({proofByte: 'cc'}), acceptedAt: '2026-08-13T12:00:00.000Z'});
  second.appendVerified({envelope: late, verification: verification({proofByte: 'dd'}), acceptedAt: '2026-08-13T12:01:00.000Z'});

  const firstFrontier = await first.frontier();
  const secondFrontier = await second.frontier();
  assert.deepEqual(firstFrontier, secondFrontier);
  assert.deepEqual(firstFrontier.orderedEventIds, ['evt-early', 'evt-late']);
  assert.equal(firstFrontier.count, 2);
  assert.match(firstFrontier.frontierHash, /^0x[0-9a-f]{64}$/u);
});

test('journal fails instead of claiming durability when storage drops a write', () => {
  const storage: KeyValueStorage = {
    read: () => null,
    write: () => 'memory-only',
    remove: () => undefined,
  };
  const journal = new AcceptedEventJournal(storage, 'accepted-test');
  assert.throws(() => journal.appendVerified({
    envelope: envelope({eventId: 'evt-dropped', groupId: 'g-dropped', occurredAt: '2026-08-12T10:00:00.000Z'}),
    verification: verification(),
  }), AcceptedEventPersistenceError);
});
