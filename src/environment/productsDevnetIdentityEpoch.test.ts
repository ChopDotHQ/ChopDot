import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCTS_DEVNET_IDENTITY_EPOCH,
  productsDevnetMembershipRegistryStorageKey,
} from './productsDevnetIdentityEpoch.ts';

const alice = `0x${'11'.repeat(32)}`;
const bob = `0x${'22'.repeat(32)}`;

test('post-reset membership storage is explicitly epoch and Product Account bound', () => {
  const key = productsDevnetMembershipRegistryStorageKey({
    productId: 'chopdot.dot',
    accountPublicKeyHex: alice,
  });
  assert.match(key, new RegExp(`^chopdot-membership-key-envelope-registry-v2:${PRODUCTS_DEVNET_IDENTITY_EPOCH}:chopdot\\.dot:`));
  assert.notEqual(key, 'chopdot-membership-key-envelope-registry-v1');
});

test('a different Product Account cannot address the same post-reset membership registry', () => {
  const first = productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: alice});
  const second = productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: bob});
  assert.notEqual(first, second);
});

test('a different product cannot address the same post-reset membership registry', () => {
  const first = productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: alice});
  const second = productsDevnetMembershipRegistryStorageKey({productId: 'other.dot', accountPublicKeyHex: alice});
  assert.notEqual(first, second);
});

test('invalid identity context fails closed', () => {
  assert.throws(() => productsDevnetMembershipRegistryStorageKey({productId: 'not-a-dot', accountPublicKeyHex: alice}));
  assert.throws(() => productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: '0x1234'}));
});
