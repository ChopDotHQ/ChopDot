import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {createCleanState, reducer} from '../state/store.ts';
import type {AppState, Expense, Group, Split, User} from '../types.ts';
import {decryptSessionValue, encryptSessionValue} from './encryptedSession.ts';
import {
  createPayerMarkedPaidEnvelope,
  hashMemberCapability,
  paymentEventSigningBytes,
  PayerActionOutbox,
  fromPayerMarkedPaidWire,
  toPayerMarkedPaidWire,
  validatePayerMarkedPaidEnvelope,
  type KeyValueStorage,
  type PayerMarkedPaidEnvelope,
} from './livePayerSync.ts';

const mina: User = {id: 'u-mina', name: 'Mina'};
const leo: User = {id: 'u-leo', name: 'Leo'};
const leoCapability = 'leo-capability-abcdefghijklmnopqrstuvwxyz0123456789';
const group: Group = {
  id: 'g-zurich',
  name: 'Zurich Dinner',
  memberIds: [mina.id, leo.id],
  liveSession: {roomId: 'room-zurich', secret: 'session-secret'},
};
const expense: Expense = {
  id: 'e-dinner',
  groupId: group.id,
  description: 'Dinner',
  amount: 120,
  currency: 'CHF',
  paidByUserId: mina.id,
  date: '2026-08-09T18:00:00.000Z',
};

async function requestedState(capability = leoCapability): Promise<AppState> {
  const capabilityHash = await hashMemberCapability(capability);
  const splits: Split[] = [
    {id: 's-mina', expenseId: expense.id, userId: mina.id, amount: 60, status: 'confirmed'},
    {
      id: 's-leo',
      expenseId: expense.id,
      userId: leo.id,
      amount: 60,
      status: 'open',
    },
  ];
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: mina}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: leo}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: mina.id}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group}});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  state = reducer(state, {
    type: 'SEND_REQUEST',
    payload: {
      splitId: 's-leo',
      requestId: 'req-leo',
      expiresAt: '2099-08-10T18:00:00.987Z',
      capabilityHash,
    },
  });
  return state;
}

async function paidEvent(overrides: Partial<PayerMarkedPaidEnvelope> = {}): Promise<PayerMarkedPaidEnvelope> {
  await cryptoWaitReady();
  const keypair = sr25519PairFromSeed(new Uint8Array(32).fill(2));
  const unsigned = createPayerMarkedPaidEnvelope({
    eventId: 'evt-leo-paid',
    requestId: 'req-leo',
    groupId: group.id,
    memberId: leo.id,
    amount: 60,
    currency: 'CHF',
    memberCapability: leoCapability,
    actorPublicKeyHex: `0x${Buffer.from(keypair.publicKey).toString('hex')}`,
    actorSignature: 'A'.repeat(86),
    occurredAt: '2026-08-09T18:05:00.000Z',
    expiresAt: '2099-08-10T18:00:00.000Z',
    ...overrides,
  });
  if (overrides.actorSignature) return unsigned;
  return createPayerMarkedPaidEnvelope({
    ...unsigned,
    actorSignature: Buffer.from(sr25519Sign(paymentEventSigningBytes(unsigned), keypair)).toString('base64url'),
  });
}

test('a scoped signed payer event resolves only its exact requested split', async () => {
  const result = await validatePayerMarkedPaidEnvelope(
    await requestedState(),
    await paidEvent(),
    `0x${'33'.repeat(32)}`,
    new Date('2026-08-09T18:06:00.000Z'),
  );

  assert.deepEqual(result, {
    ok: true,
    splitIds: ['s-leo'],
    accountPublicKeyHex: (await paidEvent()).actorPublicKeyHex,
    statementSignerHex: `0x${'33'.repeat(32)}`,
  });
});

test('the signed payer notification requires compact transport chunking', async () => {
  const event = await paidEvent({
    eventId: `paid-${crypto.randomUUID()}`,
    requestId: `req-${crypto.randomUUID()}`,
    groupId: `g-${crypto.randomUUID()}`,
    memberId: `u-${crypto.randomUUID()}`,
  });
  const wire = toPayerMarkedPaidWire(event);
  const secret = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const packet = await encryptSessionValue(secret, wire);
  assert.ok(new TextEncoder().encode(JSON.stringify(packet)).byteLength > 512);
  assert.deepEqual(fromPayerMarkedPaidWire(await decryptSessionValue(secret, packet)), event);
});

test('wrong member capability, amount, currency, signer, and expiry are rejected', async () => {
  const state = await requestedState();
  const now = new Date('2026-08-09T18:06:00.000Z');

  assert.equal((await validatePayerMarkedPaidEnvelope(state, await paidEvent({memberCapability: 'nina-capability-abcdefghijklmnopqrstuvwxyz0123456789'}), `0x${'33'.repeat(32)}`, now)).ok, false);
  assert.equal((await validatePayerMarkedPaidEnvelope(state, await paidEvent({amount: 59}), `0x${'33'.repeat(32)}`, now)).ok, false);
  assert.equal((await validatePayerMarkedPaidEnvelope(state, await paidEvent({currency: 'USD'}), `0x${'33'.repeat(32)}`, now)).ok, false);
  assert.equal((await validatePayerMarkedPaidEnvelope(state, await paidEvent(), undefined, now)).ok, false);
  assert.equal((await validatePayerMarkedPaidEnvelope(state, await paidEvent({expiresAt: '2026-08-09T18:05:30.000Z'}), `0x${'33'.repeat(32)}`, now)).ok, false);
  assert.equal((await validatePayerMarkedPaidEnvelope(state, await paidEvent({actorSignature: 'B'.repeat(86)}), `0x${'33'.repeat(32)}`, now)).ok, false);
});

test('an already marked-paid request is replay-safe', async () => {
  let state = await requestedState();
  state = reducer(state, {type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leo.id}});
  const result = await validatePayerMarkedPaidEnvelope(
    state,
    await paidEvent(),
    `0x${'33'.repeat(32)}`,
    new Date('2026-08-09T18:06:00.000Z'),
  );
  assert.deepEqual(result, {ok: false, reason: 'request_not_open'});
});

test('payer outbox keeps one stable event through failure and removes it after publish', async () => {
  const storage = memoryStorage();
  const outbox = new PayerActionOutbox(storage);
  const pending = await outbox.enqueue({
    eventId: 'evt-stable',
    requestId: 'req-leo',
    groupId: group.id,
    memberId: leo.id,
    amount: 60,
    currency: 'CHF',
    memberCapability: leoCapability,
    roomId: group.liveSession!.roomId,
    secret: group.liveSession!.secret,
    occurredAt: '2026-08-09T18:05:00.000Z',
    expiresAt: '2099-08-10T18:00:00.000Z',
  });
  assert.equal((await outbox.enqueue({...pending, eventId: 'evt-repeated'})).eventId, 'evt-stable');

  const attempted: string[] = [];
  const failed = await outbox.flush(async item => {
    attempted.push(item.eventId);
    return false;
  });
  assert.deepEqual(failed, {published: [], pending: ['req-leo']});
  assert.equal((await outbox.get('req-leo'))?.eventId, 'evt-stable');

  const passed = await outbox.flush(async item => {
    attempted.push(item.eventId);
    return true;
  });
  assert.deepEqual(passed, {published: ['req-leo'], pending: []});
  assert.equal(await outbox.get('req-leo'), null);
  assert.deepEqual(attempted, ['evt-stable', 'evt-stable']);
});

function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    read: key => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value);
    },
    remove: key => {
      values.delete(key);
    },
  };
}
