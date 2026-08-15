import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer} from '../state/store.ts';
import type {User} from '../types.ts';
import {
  bytesToPublicKeyHex,
  createHostIdentityBinding,
  identityTrustLabel,
  reduceIdentityAction,
} from './polkadotIdentity.ts';

function identity(overrides: Partial<{username: string; productId: string; publicKey: Uint8Array; accountId: [string, number]}> = {}) {
  return {
    username: overrides.username ?? 'dev.dot',
    productId: overrides.productId ?? 'chopdot-shell-proof.dot',
    publicKey: overrides.publicKey ?? Uint8Array.from({length: 32}, (_, index) => index),
    accountId: overrides.accountId ?? ['5FakeProductAccount', 42] as [string, number],
  };
}

function stateWithUser() {
  const user: User = {id: 'dev', name: 'Dev Local'};
  let state = createCleanState();
  state = reducer(state, {type: 'ADD_USER', payload: {user}});
  state = reducer(state, {type: 'SET_CURRENT_USER', payload: {userId: user.id}});
  return state;
}

test('binding preserves local display name and stores host provenance', () => {
  const state = reduceIdentityAction(stateWithUser(), {
    type: 'BIND_POLKADOT_HOST_IDENTITY',
    payload: {userId: 'dev', identity: identity(), boundAt: '2026-08-15T20:00:00.000Z'},
  });
  const user = state.users.dev;
  assert.equal(user.name, 'Dev Local');
  assert.equal(user.hostIdentity?.source, 'polkadot_host');
  assert.equal(user.hostIdentity?.username, 'dev.dot');
  assert.equal(user.hostIdentity?.productId, 'chopdot-shell-proof.dot');
  assert.equal(user.hostIdentity?.accountId, '5FakeProductAccount');
  assert.equal(user.hostIdentity?.addressPrefix, 42);
  assert.equal(user.accountPublicKeyHex, user.hostIdentity?.accountPublicKeyHex);
  assert.equal(identityTrustLabel(user), 'Connected with Polkadot');
});

test('public key normalization requires exactly 32 bytes', () => {
  assert.equal(bytesToPublicKeyHex(new Uint8Array(32)).length, 66);
  assert.throws(() => bytesToPublicKeyHex(new Uint8Array(31)), /32-byte/u);
  assert.throws(() => bytesToPublicKeyHex(new Uint8Array(33)), /32-byte/u);
});

test('malformed host identity is rejected without changing state', () => {
  const state = stateWithUser();
  const next = reduceIdentityAction(state, {
    type: 'BIND_POLKADOT_HOST_IDENTITY',
    payload: {userId: 'dev', identity: identity({publicKey: new Uint8Array(2)})},
  });
  assert.equal(next, state);
  assert.equal(identityTrustLabel(next.users.dev), 'Local profile');
});

test('unbinding removes host provenance but preserves user and financial identity', () => {
  let state = reduceIdentityAction(stateWithUser(), {
    type: 'BIND_POLKADOT_HOST_IDENTITY',
    payload: {userId: 'dev', identity: identity()},
  });
  const name = state.users.dev.name;
  state = reduceIdentityAction(state, {type: 'UNBIND_POLKADOT_HOST_IDENTITY', payload: {userId: 'dev'}});
  assert.equal(state.users.dev.name, name);
  assert.equal(state.users.dev.hostIdentity, undefined);
  assert.equal(identityTrustLabel(state.users.dev), 'Local profile');
});

test('binding does not promote a manually stored wallet address to authenticated identity', () => {
  let state = stateWithUser();
  state = {...state, users: {...state.users, dev: {...state.users.dev, walletAddress: '0x1111111111111111111111111111111111111111'}}};
  state = reduceIdentityAction(state, {
    type: 'BIND_POLKADOT_HOST_IDENTITY',
    payload: {userId: 'dev', identity: identity()},
  });
  assert.equal(state.users.dev.walletAddress, '0x1111111111111111111111111111111111111111');
  assert.notEqual(state.users.dev.walletAddress, state.users.dev.hostIdentity?.accountId);
});

test('binding constructor rejects blank username/product/account metadata', () => {
  assert.throws(() => createHostIdentityBinding(identity({username: ' '})), /username/u);
  assert.throws(() => createHostIdentityBinding(identity({productId: ' '})), /Product id/u);
  assert.throws(() => createHostIdentityBinding(identity({accountId: ['', 42]})), /account id/u);
});
