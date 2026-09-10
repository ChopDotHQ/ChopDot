import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyPolkadotHostFrame,
  isLocalPolkadotTestHostFrame,
  isPolkadotProductHostFrame,
} from './polkadotHostEnvironment.ts';

test('recognizes Products Devnet gateway frames', () => {
  for (const referrerHost of ['dev-dot.li', 'chopdot.dev-dot.li', 'chopdot.app.dev-dot.li', 'CHOPDOT.DEV-DOT.LI.']) {
    assert.equal(classifyPolkadotHostFrame({embedded: true, referrerHost}), 'products-devnet');
    assert.equal(isPolkadotProductHostFrame({embedded: true, referrerHost}), true);
  }
});

test('keeps paseo gateway frames supported', () => {
  assert.equal(classifyPolkadotHostFrame({embedded: true, referrerHost: 'chopdot.app.paseo.li'}), 'paseo');
  assert.equal(isPolkadotProductHostFrame({embedded: true, referrerHost: 'paseo.li'}), true);
});

test('does not trust lookalike or non-embedded hosts', () => {
  for (const referrerHost of ['evildev-dot.li', 'dev-dot.li.evil.test', 'paseo.li.evil.test', 'example.com', '']) {
    assert.equal(isPolkadotProductHostFrame({embedded: true, referrerHost}), false);
  }
  assert.equal(isPolkadotProductHostFrame({embedded: false, referrerHost: 'chopdot.dev-dot.li'}), false);
});

test('recognizes local test host frames separately', () => {
  assert.equal(isLocalPolkadotTestHostFrame({embedded: true, referrerHost: '127.0.0.1'}), true);
  assert.equal(isLocalPolkadotTestHostFrame({embedded: true, referrerHost: 'localhost'}), true);
  assert.equal(isLocalPolkadotTestHostFrame({embedded: false, referrerHost: 'localhost'}), false);
});
