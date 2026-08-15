import assert from 'node:assert/strict';
import test from 'node:test';
import {addGroupMember, canRemoveGroupMember, removeGroupMember, renameGroup} from './groupSafety';
import {createCleanState, reducer} from '../state/store';
import type {AppState} from '../types';

function fixture(): AppState {
  let state = createCleanState();
  for (const user of [
    {id: 'dev', name: 'Dev'},
    {id: 'leo', name: 'Leo'},
    {id: 'nina', name: 'Nina'},
  ]) state = reducer(state, {type: 'ADD_USER', payload: {user}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: 'dev'}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group: {id: 'trip', name: 'Weekend', memberIds: ['dev', 'leo', 'nina']}}});
  return state;
}

test('renaming and adding members do not mutate the original group', () => {
  const state = fixture();
  const renamed = renameGroup(state.groups.trip, '  Berlin   Weekend ');
  assert.equal(renamed?.name, 'Berlin Weekend');
  assert.equal(state.groups.trip.name, 'Weekend');
  assert.equal(renameGroup(state.groups.trip, '   '), null);
  assert.equal(addGroupMember(state.groups.trip, 'leo'), null);
});

test('a member with no financial involvement can leave the active roster without deleting identity', () => {
  const state = fixture();
  const next = removeGroupMember(state, 'trip', 'nina');
  assert.deepEqual(next?.memberIds, ['dev', 'leo']);
  assert.equal(state.users.nina.name, 'Nina');
});

test('confirmed history does not block roster removal', () => {
  let state = fixture();
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {
    expense: {id: 'dinner', groupId: 'trip', description: 'Dinner', amount: 20, paidByUserId: 'dev', date: '2026-08-15T10:00:00.000Z'},
    splits: [
      {id: 'dinner-dev', expenseId: 'dinner', userId: 'dev', amount: 10, status: 'confirmed'},
      {id: 'dinner-leo', expenseId: 'dinner', userId: 'leo', amount: 10, status: 'confirmed'},
    ],
  }});
  assert.equal(canRemoveGroupMember(state, 'trip', 'leo').ok, true);
  assert.equal(state.expenses.dinner.paidByUserId, 'dev');
  assert.equal(state.splits['dinner-leo'].userId, 'leo');
});

test('member owing money cannot be removed', () => {
  let state = fixture();
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {
    expense: {id: 'hotel', groupId: 'trip', description: 'Hotel', amount: 100, paidByUserId: 'dev', date: '2026-08-15T10:00:00.000Z'},
    splits: [
      {id: 'hotel-dev', expenseId: 'hotel', userId: 'dev', amount: 50, status: 'confirmed'},
      {id: 'hotel-leo', expenseId: 'hotel', userId: 'leo', amount: 50, status: 'open'},
    ],
  }});
  assert.deepEqual(canRemoveGroupMember(state, 'trip', 'leo'), {ok: false, reason: 'unresolved_money'});
});

test('member owed money cannot be removed', () => {
  let state = fixture();
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {
    expense: {id: 'taxi', groupId: 'trip', description: 'Taxi', amount: 100, paidByUserId: 'leo', date: '2026-08-15T10:00:00.000Z'},
    splits: [
      {id: 'taxi-leo', expenseId: 'taxi', userId: 'leo', amount: 50, status: 'confirmed'},
      {id: 'taxi-dev', expenseId: 'taxi', userId: 'dev', amount: 50, status: 'open'},
    ],
  }});
  assert.deepEqual(canRemoveGroupMember(state, 'trip', 'leo'), {ok: false, reason: 'unresolved_money'});
});

test('zero net balance is not enough when unresolved obligations offset', () => {
  let state = fixture();
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {
    expense: {id: 'a', groupId: 'trip', description: 'A', amount: 20, paidByUserId: 'dev', date: '2026-08-15T10:00:00.000Z'},
    splits: [
      {id: 'a-dev', expenseId: 'a', userId: 'dev', amount: 10, status: 'confirmed'},
      {id: 'a-leo', expenseId: 'a', userId: 'leo', amount: 10, status: 'open'},
    ],
  }});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {
    expense: {id: 'b', groupId: 'trip', description: 'B', amount: 20, paidByUserId: 'leo', date: '2026-08-15T11:00:00.000Z'},
    splits: [
      {id: 'b-leo', expenseId: 'b', userId: 'leo', amount: 10, status: 'confirmed'},
      {id: 'b-dev', expenseId: 'b', userId: 'dev', amount: 10, status: 'open'},
    ],
  }});
  assert.deepEqual(canRemoveGroupMember(state, 'trip', 'leo'), {ok: false, reason: 'unresolved_money'});
});

test('current user cannot remove themselves', () => {
  const state = fixture();
  assert.deepEqual(canRemoveGroupMember(state, 'trip', 'dev'), {ok: false, reason: 'current_user'});
});
