import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCTS_DEVNET_IDENTITY_EPOCH,
  productsDevnetMembershipRegistryStorageKey,
} from './productsDevnetIdentityEpoch.ts';

const alice = `0x${'11'.repeat(32)}`;
const bob = `0x${'22'.repeat(32)}`;
const devnetHost = {embedded: true, referrerHost: 'chopdot.app.dev-dot.li'};

test('post-reset Products Devnet storage is explicitly epoch and Product Account bound', () => {
  const key = productsDevnetMembershipRegistryStorageKey({
    productId: 'chopdot.dot',
    accountPublicKeyHex: alice,
  }, devnetHost);
  assert.match(key, new RegExp(`^chopdot-membership-key-envelope-registry-v2:${PRODUCTS_DEVNET_IDENTITY_EPOCH}:chopdot\\.dot:`));
  assert.notEqual(key, 'chopdot-membership-key-envelope-registry-v1');
});

test('a different Product Account cannot address the same post-reset Devnet registry', () => {
  const first = productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: alice}, devnetHost);
  const second = productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: bob}, devnetHost);
  assert.notEqual(first, second);
});

test('a different product cannot address the same post-reset Devnet registry', () => {
  const first = productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: alice}, devnetHost);
  const second = productsDevnetMembershipRegistryStorageKey({productId: 'other.dot', accountPublicKeyHex: alice}, devnetHost);
  assert.notEqual(first, second);
});

test('non-Devnet environments retain the existing registry namespace', () => {
  for (const hostContext of [
    {embedded: true, referrerHost: 'chopdot.app.paseo.li'},
    {embedded: true, referrerHost: '127.0.0.1'},
    {embedded: false, referrerHost: 'dev-dot.li'},
  ]) {
    assert.equal(
      productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: alice}, hostContext),
      'chopdot-membership-key-envelope-registry-v1',
    );
  }
});

test('invalid identity context fails closed on Products Devnet', () => {
  assert.throws(() => productsDevnetMembershipRegistryStorageKey({productId: 'not-a-dot', accountPublicKeyHex: alice}, devnetHost));
  assert.throws(() => productsDevnetMembershipRegistryStorageKey({productId: 'chopdot.dot', accountPublicKeyHex: '0x1234'}, devnetHost));
});
