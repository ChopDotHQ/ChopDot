import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, getGroupTotal, getMemberBalance, reducer} from './store';
import type {Expense, Split} from '../types';

test('a late expense stays separate from an already-sent payment request', () => {
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'mina', name: 'Mina'}}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'leo', name: 'Leo'}}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: 'mina'}});
  state = reducer(state, {
    type: 'CREATE_GROUP',
    payload: {group: {id: 'friday', name: 'Friday Crew', memberIds: ['mina', 'leo']}},
  });

  const firstExpense: Expense = {
    id: 'dinner',
    groupId: 'friday',
    description: 'Dinner',
    amount: 10,
    currency: 'USD',
    paidByUserId: 'mina',
    date: '2026-07-15T10:00:00.000Z',
  };
  const firstSplits: Split[] = [
    {id: 'dinner-mina', expenseId: 'dinner', userId: 'mina', amount: 5, status: 'confirmed'},
    {id: 'dinner-leo', expenseId: 'dinner', userId: 'leo', amount: 5, status: 'open'},
  ];
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense: firstExpense, splits: firstSplits}});
  state = reducer(state, {type: 'SEND_REQUEST', payload: {splitId: 'dinner-leo'}});

  const lateExpense: Expense = {
    id: 'taxi',
    groupId: 'friday',
    description: 'Taxi',
    amount: 10,
    currency: 'USD',
    paidByUserId: 'mina',
    date: '2026-07-15T10:05:00.000Z',
  };
  const lateSplits: Split[] = [
    {id: 'taxi-mina', expenseId: 'taxi', userId: 'mina', amount: 5, status: 'confirmed'},
    {id: 'taxi-leo', expenseId: 'taxi', userId: 'leo', amount: 5, status: 'open'},
  ];
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense: lateExpense, splits: lateSplits}});

  assert.equal(state.splits['dinner-leo'].status, 'request_sent');
  assert.equal(state.splits['dinner-leo'].amount, 5);
  assert.equal(state.splits['taxi-leo'].status, 'open');
  assert.equal(getGroupTotal(state, 'friday'), 20);
  assert.equal(getMemberBalance(state, 'friday', 'leo'), -10);

  state = reducer(state, {
    type: 'MARK_PAID',
    payload: {splitId: 'dinner-leo', userId: 'leo'},
  });
  state = reducer(state, {
    type: 'CONFIRM_RECEIVED',
    payload: {splitId: 'dinner-leo', currentUserId: 'mina'},
  });

  assert.equal(state.splits['dinner-leo'].status, 'confirmed');
  assert.equal(state.splits['taxi-leo'].status, 'open');
  assert.equal(getMemberBalance(state, 'friday', 'leo'), -5);
});

test('a returned payer action can only advance its bound request', () => {
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'mina', name: 'Mina'}}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'leo', name: 'Leo'}}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: 'mina'}});
  state = reducer(state, {
    type: 'CREATE_GROUP',
    payload: {group: {id: 'friday', name: 'Friday Crew', memberIds: ['mina', 'leo']}},
  });
  state = reducer(state, {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {
        id: 'dinner',
        groupId: 'friday',
        description: 'Dinner',
        amount: 20,
        currency: 'USD',
        paidByUserId: 'mina',
        date: '2026-07-15T10:00:00.000Z',
      },
      splits: [
        {id: 'dinner-mina', expenseId: 'dinner', userId: 'mina', amount: 10, status: 'confirmed'},
        {id: 'dinner-leo', expenseId: 'dinner', userId: 'leo', amount: 10, status: 'open'},
      ],
    },
  });

  state = reducer(state, {
    type: 'SEND_REQUEST',
    payload: {
      splitId: 'dinner-leo',
      requestId: 'request-123',
      expiresAt: '2026-07-16T10:00:00.000Z',
    },
  });
  assert.equal(state.splits['dinner-leo'].requestId, 'request-123');
  assert.equal(state.splits['dinner-leo'].requestExpiresAt, '2026-07-16T10:00:00.000Z');

  const wrongActor = reducer(state, {
    type: 'MARK_PAID',
    payload: {splitId: 'dinner-leo', userId: 'mina'},
  });
  assert.equal(wrongActor.splits['dinner-leo'].status, 'request_sent');

  const marked = reducer(state, {
    type: 'MARK_PAID',
    payload: {splitId: 'dinner-leo', userId: 'leo'},
  });
  assert.equal(marked.splits['dinner-leo'].status, 'marked_paid');

  const replay = reducer(marked, {
    type: 'MARK_PAID',
    payload: {splitId: 'dinner-leo', userId: 'leo'},
  });
  assert.equal(replay, marked);
});
