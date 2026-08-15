import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, getGroupTotal, getMemberBalance, reducer} from './store';
import type {AppState, Expense, Split} from '../types';

test('a late expense stays separate from an already-sent payment request', () => {
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'mina', name: 'Mina'}}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'leo', name: 'Leo'}}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: 'mina'}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group: {id: 'friday', name: 'Friday Crew', memberIds: ['mina', 'leo']}}});

  const firstExpense: Expense = {id: 'dinner', groupId: 'friday', description: 'Dinner', amount: 10, currency: 'USD', paidByUserId: 'mina', date: '2026-07-15T10:00:00.000Z'};
  const firstSplits: Split[] = [
    {id: 'dinner-mina', expenseId: 'dinner', userId: 'mina', amount: 5, status: 'confirmed'},
    {id: 'dinner-leo', expenseId: 'dinner', userId: 'leo', amount: 5, status: 'open'},
  ];
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense: firstExpense, splits: firstSplits}});
  state = reducer(state, {type: 'SEND_REQUEST', payload: {splitId: 'dinner-leo'}});

  const lateExpense: Expense = {id: 'taxi', groupId: 'friday', description: 'Taxi', amount: 10, currency: 'USD', paidByUserId: 'mina', date: '2026-07-15T10:05:00.000Z'};
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

  state = reducer(state, {type: 'MARK_PAID', payload: {splitId: 'dinner-leo', userId: 'leo'}});
  state = reducer(state, {type: 'CONFIRM_RECEIVED', payload: {splitId: 'dinner-leo', currentUserId: 'mina'}});

  assert.equal(state.splits['dinner-leo'].status, 'confirmed');
  assert.equal(state.splits['taxi-leo'].status, 'open');
  assert.equal(getMemberBalance(state, 'friday', 'leo'), -5);
});

test('a returned payer action can only advance its bound request', () => {
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'mina', name: 'Mina'}}});
  state = reducer(state, {type: 'ADD_USER', payload: {user: {id: 'leo', name: 'Leo'}}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: 'mina'}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group: {id: 'friday', name: 'Friday Crew', memberIds: ['mina', 'leo']}}});
  state = reducer(state, {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {id: 'dinner', groupId: 'friday', description: 'Dinner', amount: 20, currency: 'USD', paidByUserId: 'mina', date: '2026-07-15T10:00:00.000Z'},
      splits: [
        {id: 'dinner-mina', expenseId: 'dinner', userId: 'mina', amount: 10, status: 'confirmed'},
        {id: 'dinner-leo', expenseId: 'dinner', userId: 'leo', amount: 10, status: 'open'},
      ],
    },
  });

  state = reducer(state, {type: 'SEND_REQUEST', payload: {splitId: 'dinner-leo', requestId: 'request-123', expiresAt: '2026-07-16T10:00:00.000Z'}});
  assert.equal(state.splits['dinner-leo'].requestId, 'request-123');
  assert.equal(state.splits['dinner-leo'].requestExpiresAt, '2026-07-16T10:00:00.000Z');

  const wrongActor = reducer(state, {type: 'MARK_PAID', payload: {splitId: 'dinner-leo', userId: 'mina'}});
  assert.equal(wrongActor.splits['dinner-leo'].status, 'request_sent');

  const marked = reducer(state, {type: 'MARK_PAID', payload: {splitId: 'dinner-leo', userId: 'leo'}});
  assert.equal(marked.splits['dinner-leo'].status, 'marked_paid');

  const replay = reducer(marked, {type: 'MARK_PAID', payload: {splitId: 'dinner-leo', userId: 'leo'}});
  assert.equal(replay, marked);
});

function editableExpenseFixture(): AppState {
  let state = createCleanState();
  for (const user of [{id: 'mina', name: 'Mina'}, {id: 'leo', name: 'Leo'}, {id: 'nina', name: 'Nina'}]) {
    state = reducer(state, {type: 'ADD_USER', payload: {user}});
  }
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: 'mina'}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group: {id: 'trip', name: 'Trip', memberIds: ['mina', 'leo', 'nina']}}});
  return reducer(state, {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {id: 'hotel', groupId: 'trip', description: 'Hotel', amount: 600, currency: 'USD', paidByUserId: 'mina', date: '2026-08-15T10:00:00.000Z'},
      splits: [
        {id: 'hotel-mina', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'confirmed'},
        {id: 'hotel-leo', expenseId: 'hotel', userId: 'leo', amount: 200, status: 'open'},
        {id: 'hotel-nina', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open'},
      ],
    },
  });
}

test('editing an open expense atomically replaces the expense and its split set', () => {
  const state = editableExpenseFixture();
  const updated = reducer(state, {
    type: 'UPDATE_EXPENSE',
    payload: {
      expense: {...state.expenses.hotel, amount: 500, description: 'Hotel corrected'},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 250, status: 'confirmed'},
        {id: 'hotel-leo-v2', expenseId: 'hotel', userId: 'leo', amount: 250, status: 'open'},
      ],
    },
  });
  assert.equal(updated.expenses.hotel.amount, 500);
  assert.equal(updated.expenses.hotel.description, 'Hotel corrected');
  assert.equal(getGroupTotal(updated, 'trip'), 500);
  assert.equal(getMemberBalance(updated, 'trip', 'leo'), -250);
  assert.equal(updated.splits['hotel-nina'], undefined);
  assert.deepEqual(Object.values(updated.splits).filter(split => split.expenseId === 'hotel').map(split => split.id).sort(), ['hotel-leo-v2', 'hotel-mina-v2']);
});

test('changing payer reverses the debt direction deterministically', () => {
  const state = editableExpenseFixture();
  const updated = reducer(state, {
    type: 'UPDATE_EXPENSE',
    payload: {
      expense: {...state.expenses.hotel, paidByUserId: 'leo'},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'open'},
        {id: 'hotel-leo-v2', expenseId: 'hotel', userId: 'leo', amount: 200, status: 'confirmed'},
        {id: 'hotel-nina-v2', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open'},
      ],
    },
  });
  assert.equal(getMemberBalance(updated, 'trip', 'mina'), -200);
  assert.equal(getMemberBalance(updated, 'trip', 'leo'), 400);
  assert.equal(getMemberBalance(updated, 'trip', 'nina'), -200);
});

test('an invalid replacement is rejected without changing financial truth', () => {
  const state = editableExpenseFixture();
  const updated = reducer(state, {
    type: 'UPDATE_EXPENSE',
    payload: {
      expense: {...state.expenses.hotel, amount: 500},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 250, status: 'confirmed'},
        {id: 'hotel-leo-v2', expenseId: 'hotel', userId: 'leo', amount: 200, status: 'open'},
      ],
    },
  });
  assert.equal(updated, state);
  assert.equal(getGroupTotal(updated, 'trip'), 600);
});

test('duplicate participants in a replacement are rejected', () => {
  const state = editableExpenseFixture();
  const updated = reducer(state, {
    type: 'UPDATE_EXPENSE',
    payload: {
      expense: state.expenses.hotel,
      splits: [
        {id: 'a', expenseId: 'hotel', userId: 'mina', amount: 300, status: 'confirmed'},
        {id: 'b', expenseId: 'hotel', userId: 'mina', amount: 300, status: 'confirmed'},
      ],
    },
  });
  assert.equal(updated, state);
});

test('deleting an editable expense removes the expense and every associated split', () => {
  const state = editableExpenseFixture();
  const updated = reducer(state, {type: 'DELETE_EXPENSE', payload: {expenseId: 'hotel'}});
  assert.equal(updated.expenses.hotel, undefined);
  assert.equal(Object.values(updated.splits).filter(split => split.expenseId === 'hotel').length, 0);
  assert.equal(getGroupTotal(updated, 'trip'), 0);
  assert.equal(getMemberBalance(updated, 'trip', 'leo'), 0);
});

test('request activity blocks expense update and delete in MONEY-001', () => {
  const base = editableExpenseFixture();
  const requested = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo'}});
  const attemptedUpdate = reducer(requested, {
    type: 'UPDATE_EXPENSE',
    payload: {
      expense: {...requested.expenses.hotel, amount: 500},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 250, status: 'confirmed'},
        {id: 'hotel-leo-v2', expenseId: 'hotel', userId: 'leo', amount: 250, status: 'open'},
      ],
    },
  });
  const attemptedDelete = reducer(requested, {type: 'DELETE_EXPENSE', payload: {expenseId: 'hotel'}});
  assert.equal(attemptedUpdate, requested);
  assert.equal(attemptedDelete, requested);
});

test('marked-paid and confirmed counterparty splits block destructive deletion', () => {
  const base = editableExpenseFixture();
  const requested = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo'}});
  const marked = reducer(requested, {type: 'MARK_PAID', payload: {splitId: 'hotel-leo', userId: 'leo'}});
  const confirmed = reducer(marked, {type: 'CONFIRM_RECEIVED', payload: {splitId: 'hotel-leo', currentUserId: 'mina'}});
  assert.equal(reducer(marked, {type: 'DELETE_EXPENSE', payload: {expenseId: 'hotel'}}), marked);
  assert.equal(reducer(confirmed, {type: 'DELETE_EXPENSE', payload: {expenseId: 'hotel'}}), confirmed);
});

test('repeating the same valid edit does not create duplicate split records', () => {
  const state = editableExpenseFixture();
  const action = {
    type: 'UPDATE_EXPENSE' as const,
    payload: {
      expense: {...state.expenses.hotel, amount: 500},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 250, status: 'confirmed' as const},
        {id: 'hotel-leo-v2', expenseId: 'hotel', userId: 'leo', amount: 250, status: 'open' as const},
      ],
    },
  };
  const once = reducer(state, action);
  const twice = reducer(once, action);
  assert.equal(Object.values(twice.splits).filter(split => split.expenseId === 'hotel').length, 2);
  assert.deepEqual(twice.splits, once.splits);
});

test('a request-only correction invalidates the old request and reissues the corrected amount', () => {
  const base = editableExpenseFixture();
  const requested = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo', requestId: 'request-old', expiresAt: '2026-08-20T00:00:00.000Z'}});
  const corrected = reducer(requested, {
    type: 'CORRECT_EXPENSE',
    payload: {
      correctionId: 'corr-request-1', occurredAt: '2026-08-15T20:00:00.000Z',
      expense: {...requested.expenses.hotel, amount: 550},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'confirmed'},
        {id: 'hotel-leo-v2', expenseId: 'hotel', userId: 'leo', amount: 150, status: 'open'},
        {id: 'hotel-nina-v2', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open'},
      ],
      replacementRequests: {leo: {requestId: 'request-new', expiresAt: '2026-08-21T00:00:00.000Z'}},
    },
  });
  assert.equal(corrected.expenses.hotel.amount, 550);
  assert.equal(corrected.splits['hotel-leo'], undefined);
  assert.equal(corrected.splits['hotel-leo-v2'].amount, 150);
  assert.equal(corrected.splits['hotel-leo-v2'].status, 'request_sent');
  assert.equal(corrected.splits['hotel-leo-v2'].requestId, 'request-new');
  assert.equal(corrected.activityEvents['correction:corr-request-1:request:hotel-leo'].details.oldRequestId, 'request-old');
  assert.equal(corrected.activityEvents['correction:corr-request-1:request:hotel-leo'].details.replacementAmount, 150);
  assert.equal(getGroupTotal(corrected, 'trip'), 550);
});

test('a request-only correction can remove a participant without leaving its old request live', () => {
  const base = editableExpenseFixture();
  const requested = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo', requestId: 'request-remove'}});
  const corrected = reducer(requested, {
    type: 'CORRECT_EXPENSE',
    payload: {
      correctionId: 'corr-remove-1', occurredAt: '2026-08-15T20:05:00.000Z',
      expense: {...requested.expenses.hotel, amount: 400},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'confirmed'},
        {id: 'hotel-nina-v2', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open'},
      ],
    },
  });
  assert.equal(Object.values(corrected.splits).some(split => split.userId === 'leo' && split.expenseId === 'hotel'), false);
  assert.equal(corrected.activityEvents['correction:corr-remove-1:request:hotel-leo'].details.replacementRequestId, undefined);
  assert.equal(corrected.activityEvents['correction:corr-remove-1:request:hotel-leo'].details.replacementAmount, 0);
});

test('confirmed overpayment is preserved and creates a reverse refund adjustment', () => {
  const base = editableExpenseFixture();
  const requested = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo', requestId: 'paid-200'}});
  const marked = reducer(requested, {type: 'MARK_PAID', payload: {splitId: 'hotel-leo', userId: 'leo'}});
  const confirmed = reducer(marked, {type: 'CONFIRM_RECEIVED', payload: {splitId: 'hotel-leo', currentUserId: 'mina'}});
  const corrected = reducer(confirmed, {
    type: 'CORRECT_EXPENSE',
    payload: {
      correctionId: 'corr-refund-1', occurredAt: '2026-08-15T20:10:00.000Z',
      expense: {...confirmed.expenses.hotel, amount: 550},
      splits: [
        {id: 'hotel-mina-corrected', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'confirmed'},
        {id: 'hotel-leo-corrected', expenseId: 'hotel', userId: 'leo', amount: 150, status: 'open'},
        {id: 'hotel-nina-corrected', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open'},
      ],
    },
  });
  assert.equal(corrected.expenses.hotel.amount, 600);
  assert.equal(corrected.splits['hotel-leo'].amount, 200);
  assert.equal(corrected.splits['hotel-leo'].status, 'confirmed');
  const adjustment = corrected.expenses['corr-refund-1-adjustment-leo'];
  assert.equal(adjustment.kind, 'adjustment');
  assert.equal(adjustment.relatedExpenseId, 'hotel');
  assert.equal(adjustment.amount, 50);
  assert.equal(adjustment.paidByUserId, 'leo');
  assert.equal(corrected.splits['corr-refund-1-adjustment-leo-mina'].amount, 50);
  assert.equal(corrected.splits['corr-refund-1-adjustment-leo-mina'].status, 'open');
  assert.equal(getMemberBalance(corrected, 'trip', 'mina'), -50);
  assert.equal(getMemberBalance(corrected, 'trip', 'leo'), 50);
  assert.equal(getGroupTotal(corrected, 'trip'), 550);
});

test('confirmed underpayment creates only the additional forward adjustment', () => {
  const base = editableExpenseFixture();
  const requested = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo'}});
  const marked = reducer(requested, {type: 'MARK_PAID', payload: {splitId: 'hotel-leo', userId: 'leo'}});
  const confirmed = reducer(marked, {type: 'CONFIRM_RECEIVED', payload: {splitId: 'hotel-leo', currentUserId: 'mina'}});
  const corrected = reducer(confirmed, {
    type: 'CORRECT_EXPENSE',
    payload: {
      correctionId: 'corr-extra-1', occurredAt: '2026-08-15T20:15:00.000Z',
      expense: {...confirmed.expenses.hotel, amount: 650},
      splits: [
        {id: 'hotel-mina-corrected', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'confirmed'},
        {id: 'hotel-leo-corrected', expenseId: 'hotel', userId: 'leo', amount: 250, status: 'open'},
        {id: 'hotel-nina-corrected', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open'},
      ],
    },
  });
  const adjustment = corrected.expenses['corr-extra-1-adjustment-leo'];
  assert.equal(adjustment.amount, 50);
  assert.equal(adjustment.paidByUserId, 'mina');
  assert.equal(corrected.splits['corr-extra-1-adjustment-leo-leo'].amount, 50);
  assert.equal(getMemberBalance(corrected, 'trip', 'leo'), -50);
  assert.equal(getMemberBalance(corrected, 'trip', 'mina'), 250);
  assert.equal(getGroupTotal(corrected, 'trip'), 650);
});

test('payment-active correction invalidates another participant live request without touching payment evidence', () => {
  const base = editableExpenseFixture();
  let state = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo', requestId: 'leo-request'}});
  state = reducer(state, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-nina', requestId: 'nina-old'}});
  state = reducer(state, {type: 'MARK_PAID', payload: {splitId: 'hotel-leo', userId: 'leo'}});

  const corrected = reducer(state, {
    type: 'CORRECT_EXPENSE',
    payload: {
      correctionId: 'corr-mixed-1', occurredAt: '2026-08-15T20:18:00.000Z',
      expense: {...state.expenses.hotel, amount: 550},
      splits: [
        {id: 'hotel-mina-corrected', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'confirmed'},
        {id: 'hotel-leo-corrected', expenseId: 'hotel', userId: 'leo', amount: 200, status: 'open'},
        {id: 'hotel-nina-corrected', expenseId: 'hotel', userId: 'nina', amount: 150, status: 'open'},
      ],
    },
  });

  assert.equal(corrected.splits['hotel-leo'].status, 'marked_paid');
  assert.equal(corrected.splits['hotel-nina'].status, 'open');
  assert.equal(corrected.splits['hotel-nina'].requestId, undefined);
  assert.equal(corrected.activityEvents['correction:corr-mixed-1:request:hotel-nina'].details.oldRequestId, 'nina-old');
  assert.equal(corrected.activityEvents['correction:corr-mixed-1:request:hotel-nina'].details.reason, 'payment_active_correction');
  assert.equal(getGroupTotal(corrected, 'trip'), 550);
});

test('correction ids are idempotent and payer changes after activity are rejected', () => {
  const base = editableExpenseFixture();
  const requested = reducer(base, {type: 'SEND_REQUEST', payload: {splitId: 'hotel-leo', requestId: 'request-a'}});
  const action = {
    type: 'CORRECT_EXPENSE' as const,
    payload: {
      correctionId: 'corr-idempotent', occurredAt: '2026-08-15T20:20:00.000Z',
      expense: {...requested.expenses.hotel, amount: 550},
      splits: [
        {id: 'hotel-mina-v2', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'confirmed' as const},
        {id: 'hotel-leo-v2', expenseId: 'hotel', userId: 'leo', amount: 150, status: 'open' as const},
        {id: 'hotel-nina-v2', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open' as const},
      ],
      replacementRequests: {leo: {requestId: 'request-b'}},
    },
  };
  const once = reducer(requested, action);
  const twice = reducer(once, action);
  assert.deepEqual(twice, once);

  const payerChange = reducer(requested, {
    type: 'CORRECT_EXPENSE',
    payload: {
      correctionId: 'corr-payer-change', occurredAt: '2026-08-15T20:25:00.000Z',
      expense: {...requested.expenses.hotel, paidByUserId: 'leo'},
      splits: [
        {id: 'hotel-mina-v3', expenseId: 'hotel', userId: 'mina', amount: 200, status: 'open'},
        {id: 'hotel-leo-v3', expenseId: 'hotel', userId: 'leo', amount: 200, status: 'confirmed'},
        {id: 'hotel-nina-v3', expenseId: 'hotel', userId: 'nina', amount: 200, status: 'open'},
      ],
      replacementRequests: {leo: {requestId: 'request-c'}},
    },
  });
  assert.equal(payerChange, requested);
});