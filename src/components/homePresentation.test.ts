import assert from 'node:assert/strict';
import test from 'node:test';
import type {AppState} from '../types';
import {deriveHomePresentation} from './homePresentation';

test('empty Home selects New group state without inventing a receipt prompt', () => {
  assert.deepEqual(deriveHomePresentation(state(), 'mina'), {
    state: 'empty',
    openGroupIds: [],
    prompt: null,
  });
});

test('returning Home keeps group order stable and has no prompt without a pending participant action', () => {
  const value = state();
  value.groups.zurich = group('zurich', 'Zurich dinner');
  value.groups.alps = group('alps', 'Alps weekend');
  const presentation = deriveHomePresentation(value, 'mina');
  assert.deepEqual(presentation.openGroupIds, ['alps', 'zurich']);
  assert.equal(presentation.prompt, null);
});

test('receiver confirmation outranks a payment request and selects exactly one deterministic prompt', () => {
  const value = state();
  value.groups.trip = group('trip', 'Trip');
  value.groups.dinner = group('dinner', 'Dinner');
  value.expenses.tripExpense = expense('tripExpense', 'trip', 'nina');
  value.expenses.dinnerExpense = expense('dinnerExpense', 'dinner', 'mina');
  value.splits.tripMina = split('tripMina', 'tripExpense', 'mina', 'request_sent');
  value.splits.dinnerLeo = split('dinnerLeo', 'dinnerExpense', 'leo', 'marked_paid');
  value.splits.dinnerNina = split('dinnerNina', 'dinnerExpense', 'nina', 'cleared');

  const presentation = deriveHomePresentation(value, 'mina');
  assert.equal(presentation.prompt?.kind, 'confirm_received');
  assert.equal(presentation.prompt?.groupId, 'dinner');
  assert.equal(presentation.prompt?.actionLabel, 'Open group');
});

test('requested payment prompts only the payer and never another member', () => {
  const value = state();
  value.groups.dinner = group('dinner', 'Dinner');
  value.expenses.dinnerExpense = expense('dinnerExpense', 'dinner', 'mina');
  value.splits.leo = split('leo', 'dinnerExpense', 'leo', 'request_sent');
  assert.equal(deriveHomePresentation(value, 'mina').prompt, null);
  assert.equal(deriveHomePresentation(value, 'leo').prompt?.kind, 'payment_requested');
});

test('closed and non-member groups never enter Home presentation', () => {
  const value = state();
  value.groups.closed = {...group('closed', 'Closed'), closedRecordId: 'record-1'};
  value.groups.other = {...group('other', 'Other'), memberIds: ['leo']};
  assert.deepEqual(deriveHomePresentation(value, 'mina'), {
    state: 'empty',
    openGroupIds: [],
    prompt: null,
  });
});

function state(): AppState {
  return {
    mode: 'clean',
    theme: 'light',
    currency: 'CHF',
    preferredPaymentMethod: null,
    currentUserId: 'mina',
    users: {
      mina: {id: 'mina', name: 'Mina'},
      leo: {id: 'leo', name: 'Leo'},
      nina: {id: 'nina', name: 'Nina'},
    },
    groups: {},
    expenses: {},
    splits: {},
    paymentMethods: {},
    activityEvents: {},
    savedRecords: {},
  };
}

function group(id: string, name: string) {
  return {id, name, memberIds: ['mina', 'leo', 'nina']};
}

function expense(id: string, groupId: string, paidByUserId: string) {
  return {id, groupId, paidByUserId, description: 'Dinner', amount: 30, date: '2026-08-30'};
}

function split(id: string, expenseId: string, userId: string, status: 'request_sent' | 'marked_paid' | 'cleared') {
  return {id, expenseId, userId, status, amount: 10};
}
