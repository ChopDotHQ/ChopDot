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

test('closeout is idempotent and a closed group is immutable', () => {
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'mina', name: 'Mina'}}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: 'mina'}});
  state = reducer(state, {
    type: 'CREATE_GROUP',
    payload: {group: {id: 'closed', name: 'Closed Dinner', memberIds: ['mina']}},
  });
  state = reducer(state, {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {id: 'dinner', groupId: 'closed', description: 'Dinner', amount: 30, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-09T20:00:00.000Z'},
      splits: [{id: 'dinner-mina', expenseId: 'dinner', userId: 'mina', amount: 30, status: 'confirmed'}],
    },
  });

  state = reducer(state, {type: 'SAVE_RECORD', payload: {recordId: 'record-one', groupId: 'closed', savedAt: '2026-08-09T21:00:00.000Z'}});
  const replay = reducer(state, {type: 'SAVE_RECORD', payload: {recordId: 'record-two', groupId: 'closed', savedAt: '2026-08-09T22:00:00.000Z'}});
  assert.equal(replay, state);
  assert.deepEqual(Object.keys(state.savedRecords), ['record-one']);
  assert.equal(state.groups.closed.closedRecordId, 'record-one');

  const afterLateExpense = reducer(state, {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {id: 'taxi', groupId: 'closed', description: 'Taxi', amount: 10, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-09T22:05:00.000Z'},
      splits: [{id: 'taxi-mina', expenseId: 'taxi', userId: 'mina', amount: 10, status: 'confirmed'}],
    },
  });
  assert.equal(afterLateExpense, state);
});

test('current-user identity migration atomically preserves typed money references', () => {
  const localId = 'u-local-mina';
  const productId = 'u-host-mina';
  const publicKey = `0x${'11'.repeat(32)}`;
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: localId, name: 'Mina', walletAddress: '0x1111111111111111111111111111111111111111'}}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'leo', name: 'Leo'}}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: localId}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group: {id: 'dinner', name: 'Zurich Dinner', memberIds: [localId, 'leo']}}});
  state = reducer(state, {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {id: 'meal', groupId: 'dinner', description: 'Dinner', amount: 20, currency: 'CHF', paidByUserId: localId, date: '2026-08-11T18:00:00.000Z'},
      splits: [
        {id: 'meal-mina', expenseId: 'meal', userId: localId, amount: 10, status: 'confirmed'},
        {id: 'meal-leo', expenseId: 'meal', userId: 'leo', amount: 10, status: 'confirmed'},
      ],
    },
  });
  state = reducer(state, {type: 'ADD_PAYMENT_METHOD', payload: {method: {id: 'cash-mina', userId: localId, type: 'cash', details: 'Cash'}}});
  state = reducer(state, {type: 'SAVE_RECORD', payload: {recordId: 'receipt', groupId: 'dinner', savedAt: '2026-08-11T19:00:00.000Z'}});

  state = reducer(state, {
    type: 'MIGRATE_CURRENT_USER_IDENTITY',
    payload: {fromUserId: localId, toUserId: productId, accountPublicKeyHex: publicKey},
  });

  assert.equal(state.currentUserId, productId);
  assert.equal(state.users[localId], undefined);
  assert.deepEqual(state.users[productId], {
    id: productId,
    name: 'Mina',
    walletAddress: '0x1111111111111111111111111111111111111111',
    accountPublicKeyHex: publicKey,
  });
  assert.deepEqual(state.groups.dinner.memberIds, [productId, 'leo']);
  assert.equal(state.expenses.meal.paidByUserId, productId);
  assert.equal(state.splits['meal-mina'].userId, productId);
  assert.equal(state.paymentMethods['cash-mina'].userId, productId);
  assert.equal(state.savedRecords.receipt.splits.find(split => split.id === 'meal-mina')?.userId, productId);
  assert.equal(state.savedRecords.receipt.totalAmount, 20);
});

test('identity migration rejects an occupied target and a different account binding', () => {
  const firstKey = `0x${'22'.repeat(32)}`;
  const otherKey = `0x${'33'.repeat(32)}`;
  let occupied = createCleanState();
  occupied = reducer(occupied, {type: 'ADD_USER', payload: {user: {id: 'local', name: 'Mina'}}});
  occupied = reducer(occupied, {type: 'ADD_USER', payload: {user: {id: 'target', name: 'Someone else'}}});
  occupied = reducer(occupied, {type: 'SET_CURRENT_USER', payload: {userId: 'local'}});
  assert.equal(reducer(occupied, {
    type: 'MIGRATE_CURRENT_USER_IDENTITY',
    payload: {fromUserId: 'local', toUserId: 'target', accountPublicKeyHex: firstKey},
  }), occupied);

  let bound = createCleanState();
  bound = reducer(bound, {type: 'ADD_USER', payload: {user: {id: 'bound', name: 'Mina', accountPublicKeyHex: firstKey}}});
  bound = reducer(bound, {type: 'SET_CURRENT_USER', payload: {userId: 'bound'}});
  assert.equal(reducer(bound, {
    type: 'MIGRATE_CURRENT_USER_IDENTITY',
    payload: {fromUserId: 'bound', toUserId: 'bound', accountPublicKeyHex: otherKey},
  }), bound);
  assert.equal(reducer(bound, {
    type: 'MIGRATE_CURRENT_USER_IDENTITY',
    payload: {fromUserId: 'bound', toUserId: 'bound', accountPublicKeyHex: firstKey},
  }), bound);
});
