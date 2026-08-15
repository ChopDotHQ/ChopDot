import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState} from '../state/store.ts';
import type {ActivityEvent, AppState, Expense, Group, User} from '../types.ts';
import {projectHistoryEvent, projectHistoryRows} from './historyPresentation.ts';

function stateFixture(): AppState {
  const dev: User = {id: 'dev', name: 'Dev'};
  const jean: User = {id: 'jean', name: 'Jean'};
  const group: Group = {id: 'g1', name: 'Weekend', memberIds: ['dev', 'jean']};
  const expense: Expense = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 100, currency: 'USD', paidByUserId: 'dev', date: '2026-08-15T18:00:00.000Z'};
  return {...createCleanState(), users: {dev, jean}, groups: {g1: group}, expenses: {e1: expense}};
}

function event(type: string, details: any, timestamp = '2026-08-15T20:00:00.000Z'): ActivityEvent {
  return {id: `${type}-${timestamp}`, type, details, timestamp};
}

test('payment acknowledgement does not claim receiver confirmation', () => {
  const row = projectHistoryEvent(stateFixture(), event('payment_marked_paid', {expenseId: 'e1', payerUserId: 'jean', receiverUserId: 'dev', amount: 50, currency: 'USD', evidence: {kind: 'payer_attestation'}}));
  assert.match(row?.title ?? '', /Jean marked payment sent to Dev/u);
  assert.match(row?.subtitle ?? '', /Waiting for receiver confirmation/u);
});

test('receiver confirmation is explicit', () => {
  const row = projectHistoryEvent(stateFixture(), event('payment_confirmed', {expenseId: 'e1', payerUserId: 'jean', receiverUserId: 'dev', amount: 50, currency: 'USD'}));
  assert.equal(row?.title, 'Dev confirmed payment from Jean');
  assert.equal(row?.tone, 'positive');
});

test('chain evidence is described as evidence while still awaiting confirmation', () => {
  const row = projectHistoryEvent(stateFixture(), event('payment_marked_paid', {expenseId: 'e1', payerUserId: 'jean', receiverUserId: 'dev', amount: 50, currency: 'PAS', evidence: {kind: 'native_chain_transaction'}}));
  assert.match(row?.subtitle ?? '', /Polkadot transaction recorded/u);
  assert.match(row?.subtitle ?? '', /waiting for confirmation/u);
});

test('missing historical entities degrade gracefully', () => {
  const row = projectHistoryEvent(createCleanState(), event('request_sent', {payerUserId: 'gone', receiverUserId: 'gone-too', amount: 12, currency: 'USD'}));
  assert.equal(row?.title, 'Someone requested payment from Someone');
});

test('unknown internal event types are not leaked into consumer history', () => {
  assert.equal(projectHistoryEvent(stateFixture(), event('internal_debug_event', {})), null);
});

test('history rows sort newest first', () => {
  const state = stateFixture();
  state.activityEvents = {
    older: event('expense_added', {expenseId: 'e1', paidByUserId: 'dev', description: 'Dinner', amount: 100, currency: 'USD'}, '2026-08-15T18:00:00.000Z'),
    newer: event('payment_confirmed', {expenseId: 'e1', payerUserId: 'jean', receiverUserId: 'dev', amount: 50, currency: 'USD'}, '2026-08-15T21:00:00.000Z'),
  };
  const rows = projectHistoryRows(state);
  assert.equal(rows[0].title, 'Dev confirmed payment from Jean');
});