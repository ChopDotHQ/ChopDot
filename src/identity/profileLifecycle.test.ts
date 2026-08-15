import assert from 'node:assert/strict';
import test from 'node:test';
import type {User} from '../types.ts';
import {createLocalUserId, normalizeDisplayName, profileRecoveryMessage, validDisplayName} from './profileLifecycle.ts';

test('display name trims and collapses whitespace', () => {
  assert.equal(normalizeDisplayName('  Dev   Peña  '), 'Dev Peña');
});

test('blank names are invalid and normal names are valid', () => {
  assert.equal(validDisplayName('   '), false);
  assert.equal(validDisplayName('Dev'), true);
  assert.equal(validDisplayName('a'.repeat(81)), false);
});

test('local profile id uses injected uuid and stays namespaced', () => {
  assert.equal(createLocalUserId(() => 'abc-123'), 'u-local-abc-123');
});

test('recovery copy distinguishes local profile from host-bound identity', () => {
  const local: User = {id: 'u1', name: 'Dev'};
  assert.match(profileRecoveryMessage(local), /stored on this device/u);
  const connected: User = {
    ...local,
    hostIdentity: {
      source: 'polkadot_host', username: 'dev.dot', productId: 'chopdot-shell-proof.dot',
      accountPublicKeyHex: `0x${'11'.repeat(32)}` as `0x${string}`,
      accountId: '5Fake', addressPrefix: 42, boundAt: '2026-08-15T20:00:00.000Z',
    },
  };
  assert.match(profileRecoveryMessage(connected), /Polkadot product identity/u);
  assert.match(profileRecoveryMessage(connected), /does not yet restore/u);
});