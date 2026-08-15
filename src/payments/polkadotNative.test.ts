import assert from 'node:assert/strict';
import test from 'node:test';
import type {NativePolkadotPaymentReceipt, User} from '../types.ts';
import {
  buildNativePaymentPlan,
  nativeAmountToBaseUnits,
  nativeReceiptMatchesPlan,
  PASEO_NATIVE_CONFIG,
} from './polkadotNative.ts';

function hostUser(id: string, name: string, byte: string): User {
  return {
    id,
    name,
    hostIdentity: {
      source: 'polkadot_host',
      username: `${name.toLowerCase()}.dot`,
      productId: 'chopdot-shell-proof.dot',
      accountPublicKeyHex: `0x${byte.repeat(32)}` as `0x${string}`,
      accountId: `generic-${id}`,
      addressPrefix: 42,
      boundAt: '2026-08-15T20:00:00.000Z',
    },
  };
}

test('PAS converts to 10-decimal native base units exactly', () => {
  assert.equal(nativeAmountToBaseUnits('1', 10), '10000000000');
  assert.equal(nativeAmountToBaseUnits('0.25', 10), '2500000000');
  assert.equal(nativeAmountToBaseUnits('12.3456789012', 10), '123456789012');
});

test('native amount rejects excess precision', () => {
  assert.throws(() => nativeAmountToBaseUnits('0.00000000001', 10));
});

test('plan requires host-authenticated payer and receiver', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver: User = {id: 'receiver', name: 'Receiver'};
  assert.throws(() => buildNativePaymentPlan({payer, receiver, amount: 1, currency: 'PAS', config: PASEO_NATIVE_CONFIG}));
});

test('plan rejects an asset mismatch rather than treating PAS as DOT', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  assert.throws(() => buildNativePaymentPlan({payer, receiver, amount: 1, currency: 'DOT', config: PASEO_NATIVE_CONFIG}));
});

test('plan rejects different product-account namespaces', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  receiver.hostIdentity = {...receiver.hostIdentity!, productId: 'other.dot'};
  assert.throws(() => buildNativePaymentPlan({payer, receiver, amount: 1, currency: 'PAS', config: PASEO_NATIVE_CONFIG}));
});

test('valid plan derives chain-specific addresses from authenticated public keys', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  const plan = buildNativePaymentPlan({payer, receiver, amount: '2.5', currency: 'PAS', config: PASEO_NATIVE_CONFIG});
  assert.match(plan.senderAccountId, /^1/u);
  assert.match(plan.recipientAccountId, /^1/u);
  assert.notEqual(plan.senderAccountId, plan.recipientAccountId);
  assert.equal(plan.senderPublicKeyHex, payer.hostIdentity!.accountPublicKeyHex);
  assert.equal(plan.amountBaseUnits, '25000000000');
});

test('receipt matching rejects altered settlement evidence', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  const plan = buildNativePaymentPlan({payer, receiver, amount: '2.5', currency: 'PAS', config: PASEO_NATIVE_CONFIG});
  const receipt: NativePolkadotPaymentReceipt = {
    network: 'paseo',
    asset: 'PAS',
    txHash: `0x${'ab'.repeat(32)}`,
    senderAccountId: plan.senderAccountId,
    recipientAccountId: plan.recipientAccountId,
    amountBaseUnits: '25000000000',
    blockHash: `0x${'cd'.repeat(32)}`,
    blockNumber: '42',
    finalizedAt: '2026-08-15T20:01:00.000Z',
  };
  assert.equal(nativeReceiptMatchesPlan(receipt, plan), true);
  assert.equal(nativeReceiptMatchesPlan({...receipt, recipientAccountId: plan.senderAccountId}, plan), false);
  assert.equal(nativeReceiptMatchesPlan({...receipt, amountBaseUnits: '1'}, plan), false);
  assert.equal(nativeReceiptMatchesPlan({...receipt, asset: 'DOT'}, plan), false);
});