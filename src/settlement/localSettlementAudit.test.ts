import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer} from '../state/store.ts';
import type {Expense, Group, Split, User} from '../types.ts';
import {reduceWithSettlementAudit} from './localSettlementAudit.ts';

function fixture() {
  const dev: User = {id: 'dev', name: 'Dev'};
  const jean: User = {id: 'jean', name: 'Jean'};
  const group: Group = {id: 'g1', name: 'Dinner', memberIds: ['dev', 'jean']};
  const expense: Expense = {
    id: 'e1', groupId: 'g1', description: 'Dinner', amount: 100,
    currency: 'USD', paidByUserId: 'dev', date: '2026-08-15T19:00:00.000Z',
  };
  const splits: Split[] = [
    {id: 's-dev', expenseId: 'e1', userId: 'dev', amount: 50, status: 'confirmed'},
    {id: 's-jean', expenseId: 'e1', userId: 'jean', amount: 50, status: 'request_sent', requestId: 'req-1'},
  ];
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: dev}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: jean}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group}});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  return state;
}

test('mark paid appends audit event but does not confirm', () => {
  const state = reduceWithSettlementAudit(
    fixture(),
    {type: 'MARK_PAID', payload: {splitId: 's-jean', userId: 'jean'}},
    () => '2026-08-15T20:00:00.000Z',
  );
  assert.equal(state.splits['s-jean'].status, 'marked_paid');
  const events = Object.values(state.activityEvents);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'payment_marked_paid');
  assert.equal(events[0].details.amount, 50);
  assert.equal(events[0].details.receiverUserId, 'dev');
});

test('payer can retract marked paid before confirmation', () => {
  let state = reduceWithSettlementAudit(fixture(), {type: 'MARK_PAID', payload: {splitId: 's-jean', userId: 'jean'}});
  state = reduceWithSettlementAudit(
    state,
    {type: 'RETRACT_MARK_PAID', payload: {splitId: 's-jean', userId: 'jean'}},
    () => '2026-08-15T20:01:00.000Z',
  );
  assert.equal(state.splits['s-jean'].status, 'request_sent');
  assert.equal(Object.values(state.activityEvents).at(-1)?.type, 'payment_marked_paid_retracted');
});

test('receiver confirmation appends confirmation event', () => {
  let state = reduceWithSettlementAudit(fixture(), {type: 'MARK_PAID', payload: {splitId: 's-jean', userId: 'jean'}});
  state = reduceWithSettlementAudit(
    state,
    {type: 'CONFIRM_RECEIVED', payload: {splitId: 's-jean', currentUserId: 'dev'}},
    () => '2026-08-15T20:02:00.000Z',
  );
  assert.equal(state.splits['s-jean'].status, 'confirmed');
  assert.equal(Object.values(state.activityEvents).at(-1)?.type, 'payment_confirmed');
});

test('confirmed payment cannot be retracted', () => {
  let state = reduceWithSettlementAudit(fixture(), {type: 'MARK_PAID', payload: {splitId: 's-jean', userId: 'jean'}});
  state = reduceWithSettlementAudit(state, {type: 'CONFIRM_RECEIVED', payload: {splitId: 's-jean', currentUserId: 'dev'}});
  const before = state;
  state = reduceWithSettlementAudit(state, {type: 'RETRACT_MARK_PAID', payload: {splitId: 's-jean', userId: 'jean'}});
  assert.equal(state, before);
});

test('wallet-evidenced payment cannot use manual retract', () => {
  let state = fixture();
  state = {
    ...state,
    splits: {
      ...state.splits,
      's-jean': {
        ...state.splits['s-jean'],
        status: 'marked_paid',
        walletPayment: {
          txHash: '0xabc', chainId: '0x1', from: '0x1', to: '0x2', amountBaseUnits: '50', blockNumber: '1', confirmedAt: '2026-08-15T20:00:00.000Z',
        },
      },
    },
  };
  const before = state;
  state = reduceWithSettlementAudit(state, {type: 'RETRACT_MARK_PAID', payload: {splitId: 's-jean', userId: 'jean'}});
  assert.equal(state, before);
});

test('invalid transition emits no false audit event', () => {
  const state = fixture();
  const next = reduceWithSettlementAudit(state, {type: 'MARK_PAID', payload: {splitId: 's-jean', userId: 'dev'}});
  assert.equal(next, state);
  assert.equal(Object.keys(next.activityEvents).length, 0);
});
