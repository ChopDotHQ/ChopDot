import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer} from '../state/store.ts';
import type {Expense, Group, Split, User} from '../types.ts';
import {appendStableActivityForAction} from './localActivityAudit.ts';

function fixture() {
  const dev: User = {id: 'dev', name: 'Dev'};
  const jean: User = {id: 'jean', name: 'Jean'};
  const group: Group = {id: 'g1', name: 'Dinner', memberIds: ['dev', 'jean']};
  const expense: Expense = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 100, currency: 'USD', paidByUserId: 'dev', date: '2026-08-15T18:00:00.000Z'};
  const splits: Split[] = [
    {id: 's-dev', expenseId: 'e1', userId: 'dev', amount: 50, status: 'confirmed'},
    {id: 's-jean', expenseId: 'e1', userId: 'jean', amount: 50, status: 'open'},
  ];
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: dev}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: jean}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group}});
  return {state, expense, splits};
}

test('successful new expense creates one stable event', () => {
  const {state, expense, splits} = fixture();
  const action = {type: 'ADD_EXPENSE' as const, payload: {expense, splits}};
  const reduced = reducer(state, action);
  const audited = appendStableActivityForAction(state, reduced, action);
  assert.equal(audited.activityEvents['expense:add:e1']?.type, 'expense_added');
  const replayReduced = reducer(audited, action);
  const replayAudited = appendStableActivityForAction(audited, replayReduced, action);
  assert.equal(Object.keys(replayAudited.activityEvents).length, 1);
});

test('request with stable request id creates one event and preserves timestamp injection', () => {
  const {state: empty, expense, splits} = fixture();
  let state = reducer(empty, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  const action = {type: 'SEND_REQUEST' as const, payload: {splitId: 's-jean', requestId: 'req-1'}};
  const reduced = reducer(state, action);
  state = appendStableActivityForAction(state, reduced, action, () => '2026-08-15T19:00:00.000Z');
  assert.equal(state.activityEvents['request:sent:req-1']?.timestamp, '2026-08-15T19:00:00.000Z');
  const replay = appendStableActivityForAction(state, reducer(state, action), action, () => 'later');
  assert.equal(Object.keys(replay.activityEvents).length, 1);
});

test('request without request id does not fabricate durable history id', () => {
  const {state: empty, expense, splits} = fixture();
  const state = reducer(empty, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  const action = {type: 'SEND_REQUEST' as const, payload: {splitId: 's-jean'}};
  const audited = appendStableActivityForAction(state, reducer(state, action), action);
  assert.equal(Object.keys(audited.activityEvents).length, 0);
});

test('invalid request transition produces no history', () => {
  const {state} = fixture();
  const action = {type: 'SEND_REQUEST' as const, payload: {splitId: 'missing', requestId: 'req-x'}};
  const reduced = reducer(state, action);
  assert.equal(reduced, state);
  assert.equal(appendStableActivityForAction(state, reduced, action), state);
});

test('saved record creates stable archive event', () => {
  const {state: empty, expense, splits} = fixture();
  let state = reducer(empty, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  const action = {type: 'SAVE_RECORD' as const, payload: {recordId: 'record-1', groupId: 'g1', savedAt: '2026-08-15T21:00:00.000Z'}};
  const reduced = reducer(state, action);
  state = appendStableActivityForAction(state, reduced, action);
  assert.equal(state.activityEvents['group:saved:record-1']?.type, 'group_saved');
});