import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer, type Action} from '../state/store.ts';
import type {AppState, Expense, Group, Split, User} from '../types.ts';
import {
  authorizeSharedAction,
  createSharedEnvelope,
  isSharedAction,
  participantIdFromPublicKey,
  signerMatchesEnvelope,
  type HostParticipant,
  type SharedActionEnvelope,
} from './hostSessionSync.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const minaId = participantIdFromPublicKey(minaKey);
const leoId = participantIdFromPublicKey(leoKey);

const mina: HostParticipant = {userId: minaId, publicKeyHex: minaKey, username: 'alice'};
const leo: HostParticipant = {userId: leoId, publicKeyHex: leoKey, username: 'bob'};

function boundState(): AppState {
  const users: User[] = [
    {id: minaId, name: 'Mina', accountPublicKeyHex: minaKey},
    {id: leoId, name: 'Leo', accountPublicKeyHex: leoKey},
  ];
  const group: Group = {id: 'g-friday', name: 'Friday Crew', memberIds: users.map(user => user.id)};
  const expense: Expense = {
    id: 'e-dinner',
    groupId: group.id,
    description: 'Dinner',
    amount: 100,
    paidByUserId: minaId,
    date: '2026-07-14T18:00:00.000Z',
  };
  const splits: Split[] = [
    {id: 's-mina', expenseId: expense.id, userId: minaId, amount: 50, status: 'confirmed'},
    {id: 's-leo', expenseId: expense.id, userId: leoId, amount: 50, status: 'request_sent'},
  ];
  let state = createCleanState();
  for (const user of users) state = reducer(state, {type: 'ADD_USER', payload: {user}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group}});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  return state;
}

function envelope(action: Action, participant: HostParticipant): SharedActionEnvelope {
  assert.equal(isSharedAction(action), true);
  return createSharedEnvelope(action as never, participant);
}

test('host participant IDs are stable and scoped to the product public key', () => {
  assert.equal(participantIdFromPublicKey(minaKey), minaId);
  assert.notEqual(minaId, leoId);
});

test('signer must match the actor key carried inside the encrypted envelope', () => {
  const event = envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, leo);
  const state = boundState();
  state.users[leoId].statementSignerHex = leoKey;
  assert.equal(signerMatchesEnvelope(event, leoKey, state), true);
  assert.equal(signerMatchesEnvelope(event, minaKey, state), false);
  assert.equal(signerMatchesEnvelope(event, undefined, state), false);
});

test('Leo may mark only Leo payment and Mina may confirm only received money', () => {
  const state = boundState();
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, leo),
  ), 'apply');
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, mina),
  ), 'reject');
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'CONFIRM_RECEIVED', payload: {splitId: 's-leo', currentUserId: minaId}}, mina),
  ), 'apply');
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'CONFIRM_RECEIVED', payload: {splitId: 's-leo', currentUserId: leoId}}, leo),
  ), 'reject');
});

test('dependent actions defer until their referenced state exists', () => {
  assert.equal(authorizeSharedAction(
    createCleanState(),
    envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, leo),
  ), 'defer');
});

test('matched payment defers until payer and receiver wallet bindings have arrived', () => {
  const state = boundState();
  const action: Action = {
    type: 'RECORD_MATCHED_PAYMENT',
    payload: {
      splitId: 's-leo',
      userId: leoId,
      receiverUserId: minaId,
      receipt: {
        txHash: `0x${'ab'.repeat(32)}`,
        chainId: '0x190f1b41',
        from: '0x2222222222222222222222222222222222222222',
        to: '0x1111111111111111111111111111111111111111',
        amountBaseUnits: '50000000000000000000',
        blockNumber: '0x10',
        confirmedAt: '2026-07-15T10:00:00.000Z',
      },
    },
  };
  assert.equal(authorizeSharedAction(state, envelope(action, leo)), 'defer');
  state.users[leoId].walletAddress = action.payload.receipt.from;
  state.users[minaId].walletAddress = action.payload.receipt.to;
  assert.equal(authorizeSharedAction(state, envelope(action, leo)), 'apply');
});

test('self registration requires the account key matching the event signer', () => {
  const action: Action = {
    type: 'ADD_USER',
    payload: {user: {id: leoId, name: 'Leo', accountPublicKeyHex: leoKey}},
  };
  const registration = envelope(action, leo);
  assert.equal(signerMatchesEnvelope(registration, `0x${'33'.repeat(32)}`, createCleanState()), true);
  assert.equal(authorizeSharedAction(createCleanState(), registration), 'apply');
  assert.equal(signerMatchesEnvelope(envelope(action, mina), `0x${'33'.repeat(32)}`, createCleanState()), false);
  assert.equal(authorizeSharedAction(createCleanState(), envelope(action, mina)), 'reject');
});

test('device-local actions never enter the shared action stream', () => {
  assert.equal(isSharedAction({type: 'SET_CURRENT_USER', payload: {userId: leoId}}), false);
  assert.equal(isSharedAction({type: 'SET_THEME', payload: {theme: 'dark'}}), false);
  assert.equal(isSharedAction({type: 'SET_CURRENCY', payload: {currency: 'CHF'}}), false);
  assert.equal(isSharedAction({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}), true);
});
