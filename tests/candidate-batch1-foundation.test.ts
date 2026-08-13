import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AcceptedEventJournal,
  type VerifiedEventProofMetadata,
} from '../src/environment/acceptedEventJournal.ts';
import {
  createAccountBoundGroupKeyEnvelope,
  openAccountBoundGroupKeyEnvelope,
  type AccountEntropyProvider,
  type GroupKeyEnvelopeMetadata,
} from '../src/environment/accountBoundKeyEnvelope.ts';
import type {SharedActionEnvelope} from '../src/environment/hostSessionSync.ts';
import type {KeyValueStorage} from '../src/environment/livePayerSync.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string): string | null { return this.values.get(key) ?? null; }
  write(key: string, value: string): void { this.values.set(key, value); }
  remove(key: string): void { this.values.delete(key); }
}

const groupKey = Uint8Array.from({length: 32}, (_, index) => index + 1);
const minaKey = `0x${'11'.repeat(32)}`;
const metadata: GroupKeyEnvelopeMetadata = {
  productId: 'chopdotproof02.dot',
  groupId: 'zurich-dinner',
  recipientId: 'u-host-mina',
  recipientAccountPublicKeyHex: minaKey,
  keyVersion: 1,
};

test('local accepted frontier and same-account wrapped key survive recreation beyond 300 seconds', async () => {
  const storage = new MemoryStorage();
  const firstJournal = new AcceptedEventJournal(storage, 'candidate-b1-foundation');
  firstJournal.appendVerified({
    envelope: createEnvelope('event-create', '2026-08-12T12:00:00.000Z'),
    verification: proof(),
    acceptedAt: '2026-08-12T12:00:01.000Z',
  });
  const firstFrontier = await firstJournal.frontier();
  const wrappedKey = await createAccountBoundGroupKeyEnvelope(metadata, groupKey, accountProvider('mina'));

  // Recreate both adapters at a clock time beyond the current 300-second
  // Statement Store TTL. This proves local persistence only; it deliberately
  // does not claim that a fresh device can discover this storage or locator.
  const recreatedJournal = new AcceptedEventJournal(storage, 'candidate-b1-foundation');
  recreatedJournal.appendVerified({
    envelope: createEnvelope('event-expense', '2026-08-12T12:05:02.000Z'),
    verification: proof(),
    acceptedAt: '2026-08-12T12:05:03.000Z',
  });
  const recoveredKey = await openAccountBoundGroupKeyEnvelope(wrappedKey, metadata, accountProvider('mina'));
  const recoveredFrontier = await recreatedJournal.frontier();

  assert.deepEqual(recoveredKey, groupKey);
  assert.equal(firstFrontier.count, 1);
  assert.equal(recoveredFrontier.count, 2);
  assert.deepEqual(recoveredFrontier.orderedEventIds, ['event-create', 'event-expense']);
  assert.notEqual(recoveredFrontier.frontierHash, firstFrontier.frontierHash);
});

test('another account cannot convert local journal possession into group-key access', async () => {
  const storage = new MemoryStorage();
  const journal = new AcceptedEventJournal(storage, 'candidate-b1-foundation');
  journal.appendVerified({
    envelope: createEnvelope('event-create', '2026-08-12T12:00:00.000Z'),
    verification: proof(),
  });
  const wrappedKey = await createAccountBoundGroupKeyEnvelope(metadata, groupKey, accountProvider('mina'));

  assert.equal(new AcceptedEventJournal(storage, 'candidate-b1-foundation').list().length, 1);
  await assert.rejects(
    () => openAccountBoundGroupKeyEnvelope(wrappedKey, metadata, accountProvider('leo')),
    /Group access could not be restored/u,
  );
});

function createEnvelope(eventId: string, occurredAt: string): SharedActionEnvelope {
  return {
    v: 1,
    eventId,
    actorUserId: 'u-host-mina',
    actorPublicKeyHex: minaKey,
    occurredAt,
    action: eventId === 'event-create'
      ? {type: 'CREATE_GROUP', payload: {group: {id: 'zurich-dinner', name: 'Zurich dinner', memberIds: ['u-host-mina']}}}
      : {
          type: 'ADD_EXPENSE',
          payload: {
            expense: {
              id: 'expense-one',
              groupId: 'zurich-dinner',
              description: 'Dinner',
              amount: 120,
              currency: 'CHF',
              paidByUserId: 'u-host-mina',
              date: occurredAt,
            },
            splits: [{
              id: 'split-mina',
              expenseId: 'expense-one',
              userId: 'u-host-mina',
              amount: 120,
              status: 'open',
            }],
          },
        },
  };
}

function proof(): VerifiedEventProofMetadata {
  return {
    status: 'verified',
    source: 'statement-store',
    signerHex: minaKey,
    proof: {kind: 'statement-store-sr25519', bytesHex: `0x${'aa'.repeat(64)}`},
    verifiedAt: '2026-08-12T12:00:00.000Z',
  };
}

function accountProvider(account: string): AccountEntropyProvider {
  return {
    deriveAccountEntropy: async context => {
      const prefix = new TextEncoder().encode(`candidate-b1:${account}:`);
      const input = new Uint8Array(prefix.byteLength + context.byteLength);
      input.set(prefix);
      input.set(context, prefix.byteLength);
      return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    },
  };
}
