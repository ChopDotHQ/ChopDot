import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer} from '../state/store.ts';
import {settlementObligations} from './settlementObligations.ts';

test('settlement obligations never net shares owed to different receivers', () => {
  let state = createCleanState();
  for (const user of [
    {id: 'mina', name: 'Mina'},
    {id: 'leo', name: 'Leo'},
    {id: 'nina', name: 'Nina'},
  ]) state = reducer(state, {type: 'ADD_USER', payload: {user}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group: {id: 'g', name: 'Group', memberIds: ['mina', 'leo', 'nina']}}});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {
    expense: {id: 'mina-paid', groupId: 'g', description: 'Dinner', amount: 30, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-23T12:00:00.000Z'},
    splits: [
      {id: 'm-mina', expenseId: 'mina-paid', userId: 'mina', amount: 10, status: 'confirmed'},
      {id: 'm-leo', expenseId: 'mina-paid', userId: 'leo', amount: 10, status: 'open'},
      {id: 'm-nina', expenseId: 'mina-paid', userId: 'nina', amount: 10, status: 'open'},
    ],
  }});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {
    expense: {id: 'nina-paid', groupId: 'g', description: 'Taxi', amount: 15, currency: 'CHF', paidByUserId: 'nina', date: '2026-08-23T13:00:00.000Z'},
    splits: [
      {id: 'n-mina', expenseId: 'nina-paid', userId: 'mina', amount: 5, status: 'open'},
      {id: 'n-leo', expenseId: 'nina-paid', userId: 'leo', amount: 5, status: 'open'},
      {id: 'n-nina', expenseId: 'nina-paid', userId: 'nina', amount: 5, status: 'confirmed'},
    ],
  }});

  assert.deepEqual(settlementObligations(state, 'g'), [
    {key: 'leo:mina', from: 'leo', to: 'mina', amount: 10, splitIds: ['m-leo']},
    {key: 'nina:mina', from: 'nina', to: 'mina', amount: 10, splitIds: ['m-nina']},
    {key: 'leo:nina', from: 'leo', to: 'nina', amount: 5, splitIds: ['n-leo']},
    {key: 'mina:nina', from: 'mina', to: 'nina', amount: 5, splitIds: ['n-mina']},
  ]);
});
