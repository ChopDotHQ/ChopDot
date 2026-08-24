import assert from 'node:assert/strict';
import test from 'node:test';
import {createCanonicalEvent, projectCanonicalEvents, type CanonicalSigner} from '../src/core/moneyEventKernel.ts';
import {moneyFromDecimal} from '../src/core/money.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const signer: CanonicalSigner = {sign: async bytes => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))};
const verify = async (bytes: Uint8Array, signature: Uint8Array) => Buffer.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).equals(Buffer.from(signature));

test('duplicates and every delivery ordering converge to one state hash', async () => {
  const events = await fixture();
  const deliveries = [
    events,
    [...events].reverse(),
    [events[2], events[0], events[1], events[2], events[4], events[3]],
  ];
  const results = await Promise.all(deliveries.map(rows => projectCanonicalEvents(rows, verify)));
  assert.equal(new Set(results.map(result => result.stateHash)).size, 1);
  assert.deepEqual(results.map(result => result.state.version), [4, 4, 4]);
  assert.equal(results[2].duplicates.length, 1);
});

test('same-version concurrent corrections choose one deterministic event independent of arrival', async () => {
  const base = await fixture({throughExpense: true});
  const correctionA = await make({eventId: '03-correct-a', commandId: 'ca', expectedVersion: 2, parentEventId: '02-expense', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'EXPENSE_CORRECTED', payload: {expenseId: 'e1', reason: 'A', total: moneyFromDecimal('101.00', 'CHF', 2), allocations: [{participantId: 'mina', amount: moneyFromDecimal('51.00', 'CHF', 2)}, {participantId: 'leo', amount: moneyFromDecimal('50.00', 'CHF', 2)}]}});
  const correctionB = await make({eventId: '03-correct-b', commandId: 'cb', expectedVersion: 2, parentEventId: '02-expense', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'EXPENSE_CORRECTED', payload: {expenseId: 'e1', reason: 'B', total: moneyFromDecimal('102.00', 'CHF', 2), allocations: [{participantId: 'mina', amount: moneyFromDecimal('51.00', 'CHF', 2)}, {participantId: 'leo', amount: moneyFromDecimal('51.00', 'CHF', 2)}]}});
  const left = await projectCanonicalEvents([...base, correctionB, correctionA], verify);
  const right = await projectCanonicalEvents([...base, correctionA, correctionB], verify);
  assert.equal(left.stateHash, right.stateHash);
  assert.equal(left.state.expenses.e1.total.minorUnits, '10100');
  assert.deepEqual(left.conflicts.map(row => row.eventId), ['03-correct-b']);
});

test('event-id content conflict and signature tamper fail closed', async () => {
  const events = await fixture({throughExpense: true});
  const conflict = {...events[1], payload: {...events[1].payload, description: 'Forged'}};
  const tampered = {...events[1], eventId: '09-tampered', signatureHex: `0x${'ff'.repeat(32)}`};
  const result = await projectCanonicalEvents([...events, conflict, tampered], verify);
  assert.equal(result.state.version, 2);
  assert.equal(result.rejected.length, 2);
});

async function fixture(options: {throughExpense?: boolean} = {}) {
  const created = await make({eventId: '01-create', commandId: 'c1', expectedVersion: 0, parentEventId: null, actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'GROUP_CREATED', payload: {name: 'Dinner', organizerId: 'mina', members: [{participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer'}, {participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member'}]}});
  const expense = await make({eventId: '02-expense', commandId: 'c2', expectedVersion: 1, parentEventId: '01-create', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'EXPENSE_ADDED', payload: {expenseId: 'e1', description: 'Dinner', paidBy: 'mina', total: moneyFromDecimal('100.00', 'CHF', 2), allocations: [{participantId: 'mina', amount: moneyFromDecimal('50.00', 'CHF', 2)}, {participantId: 'leo', amount: moneyFromDecimal('50.00', 'CHF', 2)}]}});
  if (options.throughExpense) return [created, expense];
  const request = await make({eventId: '03-request', commandId: 'c3', expectedVersion: 2, parentEventId: '02-expense', actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', eventType: 'SHARE_REQUESTED', payload: {shareId: 'share:e1:leo'}});
  const paid = await make({eventId: '04-paid', commandId: 'c4', expectedVersion: 3, parentEventId: '03-request', actorId: 'leo', actorAccountPublicKeyHex: leoKey, actorRole: 'member', eventType: 'SHARE_MARKED_PAID', payload: {shareId: 'share:e1:leo'}});
  return [created, expense, request, paid];
}

function make(input: Omit<Parameters<typeof createCanonicalEvent>[0], 'groupId' | 'occurredAt'>) {
  return createCanonicalEvent({...input, groupId: 'g1', occurredAt: '2026-08-13T12:00:00.000Z'}, signer);
}
