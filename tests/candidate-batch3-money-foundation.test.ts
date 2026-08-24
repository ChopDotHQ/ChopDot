import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMoney,
  allocateMoneyEvenly,
  balancedPostingsForExpense,
  moneyFromDecimal,
  moneyToDecimal,
  signedMoney,
} from '../src/core/money.ts';
import {
  canonicalShareId,
  createCanonicalEvent,
  projectCanonicalEvents,
  type CanonicalEventInput,
  type CanonicalSigner,
} from '../src/core/moneyEventKernel.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const ninaKey = `0x${'33'.repeat(32)}`;

const signer: CanonicalSigner = {
  async sign(bytes) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  },
};

const verify = async (bytes: Uint8Array, signature: Uint8Array) => {
  const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Buffer.from(expected).equals(Buffer.from(signature));
};

test('CHF 100 split three ways conserves exactly with a deterministic remainder', () => {
  const total = moneyFromDecimal('100.00', 'CHF', 2);
  const allocations = allocateMoneyEvenly(total, ['leo', 'mina', 'nina']);
  assert.deepEqual(allocations.map(row => [row.participantId, row.amount.minorUnits]), [
    ['leo', '3334'],
    ['mina', '3333'],
    ['nina', '3333'],
  ]);
  assert.deepEqual(
    allocations.map(row => row.amount).reduce(addMoney),
    total,
  );
  assert.equal(moneyToDecimal(total), '100.00');
  const postings = balancedPostingsForExpense(total, allocations, 'mina');
  assert.equal(postings.reduce((sum, posting) => sum + BigInt(posting.amount.minorUnits), 0n), 0n);
});

test('money boundary rejects floats, unsupported precision, mixed currency, and overflow', () => {
  assert.throws(() => moneyFromDecimal(40.1 as never, 'CHF', 2), /decimal string/u);
  assert.throws(() => moneyFromDecimal('0.001', 'CHF', 2), /precision/u);
  assert.throws(() => moneyFromDecimal('1.00', 'chf', 2), /currency/u);
  assert.throws(() => moneyFromDecimal('999999999999999999999999999999999999', 'CHF', 2), /limit/u);
  assert.throws(
    () => addMoney(moneyFromDecimal('1.00', 'CHF', 2), moneyFromDecimal('1.00', 'USD', 2)),
    /currency/u,
  );
});

test('canonical dinner lifecycle keeps finalized evidence distinct from receiver confirmation', async () => {
  const events = await dinnerEvents();
  const result = await projectCanonicalEvents(events, verify);
  assert.equal(result.rejected.length, 0, JSON.stringify(result.rejected));
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.state.version, 9);
  assert.equal(result.state.shares['share:expense-dinner:leo'].status, 'received');
  assert.equal(result.state.shares['share:expense-dinner:nina'].status, 'received');
  assert.equal(result.state.closed?.recordId, 'record-zurich-dinner');
  assert.equal(result.state.closed?.total.minorUnits, '12000');
  assert.equal(result.state.closed?.total.currency, 'CHF');
});

test('finalized matching evidence clears only the exact share and still awaits the receiver', async () => {
  const events = (await dinnerEvents()).slice(0, 7);
  const result = await projectCanonicalEvents(events, verify);
  assert.equal(result.rejected.length, 0, JSON.stringify(result.rejected));
  assert.equal(result.state.shares['share:expense-dinner:nina'].status, 'cleared');
  assert.equal(result.state.shares['share:expense-dinner:nina'].clearedEvidence?.reference, '0xabc123');
  assert.equal(result.state.shares['share:expense-dinner:leo'].status, 'received');
  assert.equal(result.state.closed, null);
});

test('each expense owns distinct participant shares', async () => {
  const first = await dinnerEvents({through: 'expense'});
  const second = await event({
    eventId: '03-taxi', commandId: 'cmd-taxi', expectedVersion: 2, parentEventId: '02-expense',
    actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'EXPENSE_ADDED',
    payload: {
      expenseId: 'expense-taxi', description: 'Taxi', paidBy: 'mina', total: moneyFromDecimal('30.00', 'CHF', 2),
      allocations: [
        {participantId: 'mina', amount: moneyFromDecimal('10.00', 'CHF', 2)},
        {participantId: 'leo', amount: moneyFromDecimal('10.00', 'CHF', 2)},
        {participantId: 'nina', amount: moneyFromDecimal('10.00', 'CHF', 2)},
      ],
    },
  });
  const result = await projectCanonicalEvents([...first, second], verify);
  assert.equal(result.rejected.length, 0, JSON.stringify(result.rejected));
  assert.equal(Object.keys(result.state.shares).length, 6);
  assert.equal(result.state.shares[canonicalShareId('expense-dinner', 'leo')].amount.minorUnits, '4000');
  assert.equal(result.state.shares[canonicalShareId('expense-taxi', 'leo')].amount.minorUnits, '1000');
});

test('wrong actor, currency drift, and post-close mutation change no money truth', async () => {
  const valid = await dinnerEvents();
  const wrongPayer = await event({
    eventId: '10-wrong-payer', commandId: 'cmd-wrong-payer', expectedVersion: 9,
    parentEventId: '09-close', actorId: 'nina', actorAccountPublicKeyHex: ninaKey,
    actorRole: 'member', eventType: 'SHARE_MARKED_PAID', payload: {shareId: 'share:expense-dinner:leo'},
  });
  const lateExpense = await event({
    eventId: '11-late-expense', commandId: 'cmd-late-expense', expectedVersion: 9,
    parentEventId: '09-close', actorId: 'mina', actorAccountPublicKeyHex: minaKey,
    actorRole: 'organizer', eventType: 'EXPENSE_ADDED', payload: {
      expenseId: 'late', description: 'Late', paidBy: 'mina',
      total: moneyFromDecimal('10.00', 'USD', 2),
      allocations: [{participantId: 'leo', amount: moneyFromDecimal('10.00', 'USD', 2)}],
    },
  });
  const result = await projectCanonicalEvents([...valid, wrongPayer, lateExpense], verify);
  assert.equal(result.state.version, 9);
  assert.equal(result.state.closed?.total.minorUnits, '12000');
  assert.equal(result.rejected.length, 2);
});

test('corrections and reversals append attributable facts without rewriting the original', async () => {
  const base = await dinnerEvents({through: 'expense'});
  const correction = await event({
    eventId: '03-correct', commandId: 'cmd-correct', expectedVersion: 2,
    parentEventId: '02-expense', actorId: 'mina', actorAccountPublicKeyHex: minaKey,
    actorRole: 'organizer', eventType: 'EXPENSE_CORRECTED', payload: {
      expenseId: 'expense-dinner', reason: 'Tip corrected',
      total: moneyFromDecimal('123.00', 'CHF', 2),
      allocations: [
        {participantId: 'mina', amount: moneyFromDecimal('41.00', 'CHF', 2)},
        {participantId: 'leo', amount: moneyFromDecimal('41.00', 'CHF', 2)},
        {participantId: 'nina', amount: moneyFromDecimal('41.00', 'CHF', 2)},
      ],
    },
  });
  const refund = await event({
    eventId: '04-refund', commandId: 'cmd-refund', expectedVersion: 3,
    parentEventId: '03-correct', actorId: 'mina', actorAccountPublicKeyHex: minaKey,
    actorRole: 'organizer', eventType: 'SHARE_ADJUSTED', payload: {
      shareId: 'share:expense-dinner:leo', kind: 'refund', delta: signedMoney('-100', 'CHF', 2), reason: 'Returned item',
    },
  });
  const result = await projectCanonicalEvents([...base, correction, refund], verify);
  assert.equal(result.state.expenses['expense-dinner'].revisions.length, 1);
  assert.equal(result.state.expenses['expense-dinner'].originalTotal.minorUnits, '12000');
  assert.equal(result.state.expenses['expense-dinner'].total.minorUnits, '12300');
  assert.equal(result.state.shares['share:expense-dinner:leo'].amount.minorUnits, '4000');
  assert.equal(result.state.shares['share:expense-dinner:leo'].adjustments.length, 1);
});

test('partial payment, fee, dispute, and exact waiver stay typed and attributable', async () => {
  const base = await dinnerEvents({through: 'expense'});
  const adjustments = [
    await event({eventId:'03-partial',commandId:'partial',expectedVersion:2,parentEventId:'02-expense',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_ADJUSTED',payload:{shareId:'share:expense-dinner:leo',kind:'partial_payment',delta:signedMoney('-1000','CHF'),reason:'First part received'}}),
    await event({eventId:'04-fee',commandId:'fee',expectedVersion:3,parentEventId:'03-partial',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_ADJUSTED',payload:{shareId:'share:expense-dinner:leo',kind:'fee',delta:signedMoney('100','CHF'),reason:'Transfer fee'}}),
    await event({eventId:'05-dispute',commandId:'dispute',expectedVersion:4,parentEventId:'04-fee',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_ADJUSTED',payload:{shareId:'share:expense-dinner:leo',kind:'dispute',delta:signedMoney('0','CHF'),reason:'Amount questioned'}}),
    await event({eventId:'06-waiver',commandId:'waiver',expectedVersion:5,parentEventId:'05-dispute',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_ADJUSTED',payload:{shareId:'share:expense-dinner:leo',kind:'waiver',delta:signedMoney('-3100','CHF'),reason:'Organizer waived remainder'}}),
  ];
  const result = await projectCanonicalEvents([...base,...adjustments],verify);
  assert.equal(result.state.shares['share:expense-dinner:leo'].amount.minorUnits,'0');
  assert.equal(result.state.shares['share:expense-dinner:leo'].status,'waived');
  assert.deepEqual(result.state.shares['share:expense-dinner:leo'].adjustments.map(row => row.kind),['partial_payment','fee','dispute','waiver']);
});

test('a closed record stays unchanged while an explicit successor is appended', async () => {
  const closed = await dinnerEvents();
  const successor = await event({
    eventId:'10-successor',commandId:'successor',expectedVersion:9,parentEventId:'09-close',
    actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SUCCESSOR_RECORD_CREATED',
    payload:{recordId:'record-zurich-dinner-v2',predecessorRecordId:'record-zurich-dinner',reason:'Receipt corrected after close'},
  });
  const result = await projectCanonicalEvents([...closed,successor],verify);
  assert.equal(result.state.closed?.recordId,'record-zurich-dinner');
  assert.equal(result.state.closed?.total.minorUnits,'12000');
  assert.deepEqual(result.state.successorRecords,[{recordId:'record-zurich-dinner-v2',predecessorRecordId:'record-zurich-dinner',eventId:'10-successor',reason:'Receipt corrected after close'}]);
});

async function dinnerEvents(options: {through?: 'expense'} = {}) {
  const created = await event({
    eventId: '01-create', commandId: 'cmd-create', expectedVersion: 0, parentEventId: null,
    actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'GROUP_CREATED',
    payload: {name: 'Zurich Dinner', organizerId: 'mina', members: [
      {participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer'},
      {participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member'},
      {participantId: 'nina', accountPublicKeyHex: ninaKey, role: 'member'},
    ]},
  });
  const expense = await event({
    eventId: '02-expense', commandId: 'cmd-expense', expectedVersion: 1, parentEventId: '01-create',
    actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'EXPENSE_ADDED',
    payload: {expenseId: 'expense-dinner', description: 'Dinner', paidBy: 'mina', total: moneyFromDecimal('120.00', 'CHF', 2), allocations: [
      {participantId: 'mina', amount: moneyFromDecimal('40.00', 'CHF', 2)},
      {participantId: 'leo', amount: moneyFromDecimal('40.00', 'CHF', 2)},
      {participantId: 'nina', amount: moneyFromDecimal('40.00', 'CHF', 2)},
    ]},
  });
  if (options.through === 'expense') return [created, expense];
  return [created, expense,
    await event({eventId: '03-request-leo', commandId: 'cmd-request-leo', expectedVersion: 2, parentEventId: '02-expense', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'SHARE_REQUESTED', payload: {shareId: 'share:expense-dinner:leo'}}),
    await event({eventId: '04-paid-leo', commandId: 'cmd-paid-leo', expectedVersion: 3, parentEventId: '03-request-leo', actorId: 'leo', actorAccountPublicKeyHex: leoKey, actorRole: 'member', eventType: 'SHARE_MARKED_PAID', payload: {shareId: 'share:expense-dinner:leo'}}),
    await event({eventId: '05-received-leo', commandId: 'cmd-received-leo', expectedVersion: 4, parentEventId: '04-paid-leo', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'SHARE_RECEIVED', payload: {shareId: 'share:expense-dinner:leo'}}),
    await event({eventId: '06-request-nina', commandId: 'cmd-request-nina', expectedVersion: 5, parentEventId: '05-received-leo', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'SHARE_REQUESTED', payload: {shareId: 'share:expense-dinner:nina'}}),
    await event({eventId: '07-cleared-nina', commandId: 'cmd-cleared-nina', expectedVersion: 6, parentEventId: '06-request-nina', actorId: 'nina', actorAccountPublicKeyHex: ninaKey, actorRole: 'member', eventType: 'SHARE_CLEARED', payload: {shareId: 'share:expense-dinner:nina', evidence: {reference: '0xabc123', network: 'paseo-asset-hub', asset: 'CHF', payerId: 'nina', receiverId: 'mina', amount: moneyFromDecimal('40.00', 'CHF', 2), finality: 'finalized'}}}),
    await event({eventId: '08-received-nina', commandId: 'cmd-received-nina', expectedVersion: 7, parentEventId: '07-cleared-nina', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'SHARE_RECEIVED', payload: {shareId: 'share:expense-dinner:nina'}}),
    await event({eventId: '09-close', commandId: 'cmd-close', expectedVersion: 8, parentEventId: '08-received-nina', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'GROUP_CLOSED', payload: {recordId: 'record-zurich-dinner'}}),
  ];
}

async function event(input: Omit<CanonicalEventInput, 'groupId' | 'occurredAt'>) {
  return createCanonicalEvent({...input, groupId: 'zurich-dinner', occurredAt: '2026-08-13T12:00:00.000Z'}, signer);
}
