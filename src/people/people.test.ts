import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState} from '../state/store';
import type {AppState, PaymentMethod, User} from '../types';
import {
  buildPaymentMethodId,
  canSetPreferredReceiveMethod,
  getSharedGroups,
  getUserPaymentMethods,
  receiveMethodLabel,
  shortIdentity,
} from './people';

function fixture(): AppState {
  const state = createCleanState();
  state.currentUserId = 'dev';
  state.users = {
    dev: {id: 'dev', name: 'Dev'},
    jean: {id: 'jean', name: 'Jean'},
    nina: {id: 'nina', name: 'Nina'},
  };
  state.groups = {
    trip: {id: 'trip', name: 'Zurich Trip', memberIds: ['dev', 'jean']},
    dinner: {id: 'dinner', name: 'Dinner', memberIds: ['dev', 'jean', 'nina']},
    other: {id: 'other', name: 'Other', memberIds: ['jean', 'nina']},
  };
  state.paymentMethods = {
    'receive:jean:payment_link': {
      id: 'receive:jean:payment_link',
      userId: 'jean',
      type: 'payment_link',
      details: 'https://example.test/pay/jean',
    },
    'receive:jean:cash': {
      id: 'receive:jean:cash',
      userId: 'jean',
      type: 'cash',
      details: '',
    },
    'receive:nina:cash': {
      id: 'receive:nina:cash',
      userId: 'nina',
      type: 'cash',
      details: '',
    },
  };
  return state;
}

test('shared groups only include groups containing both people', () => {
  const state = fixture();
  assert.deepEqual(getSharedGroups(state, 'dev', 'jean').map(group => group.id), ['dinner', 'trip']);
});

test('payment methods are scoped to one person', () => {
  const state = fixture();
  const methods = getUserPaymentMethods(state, 'jean');
  assert.equal(methods.length, 2);
  assert.ok(methods.every(method => method.userId === 'jean'));
});

test('stable receive method ids prevent duplicate rows for the same type', () => {
  assert.equal(buildPaymentMethodId('jean', 'bank_transfer'), 'receive:jean:bank_transfer');
  assert.equal(buildPaymentMethodId('jean', 'bank_transfer'), buildPaymentMethodId('jean', 'bank_transfer'));
});

test('preferred receive method must belong to the same person', () => {
  const jean: User = {id: 'jean', name: 'Jean'};
  const jeanMethod: PaymentMethod = {id: 'm1', userId: 'jean', type: 'cash', details: ''};
  const ninaMethod: PaymentMethod = {id: 'm2', userId: 'nina', type: 'cash', details: ''};

  assert.equal(canSetPreferredReceiveMethod(jean, jeanMethod), true);
  assert.equal(canSetPreferredReceiveMethod(jean, ninaMethod), false);
});

test('labels and identity shortening stay human-readable', () => {
  assert.equal(receiveMethodLabel('bank_transfer'), 'Bank transfer');
  assert.equal(receiveMethodLabel('payment_link'), 'Payment link');
  assert.equal(shortIdentity('0x1234567890abcdef1234567890abcdef'), '0x123456…abcdef');
});
