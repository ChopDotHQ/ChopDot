import assert from 'node:assert/strict';
import test from 'node:test';
import type {PolkadotAssetPaymentReceipt, User} from '../types.ts';
import {
  assetAmountToBaseUnits,
  assetReceiptMatchesPlan,
  buildPolkadotAssetPaymentPlan,
  canExecutePolkadotAsset,
  executePolkadotAssetPayment,
  PASEO_USDC_UNVERIFIED_CONFIG,
  POLKADOT_USDC_CONFIG,
  type PolkadotAssetConfig,
} from './polkadotAsset.ts';

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

function enabledTestConfig(): PolkadotAssetConfig {
  return {...POLKADOT_USDC_CONFIG, executionEnabled: true};
}

test('USDC uses exact six-decimal base units', () => {
  assert.equal(assetAmountToBaseUnits('1', 6), '1000000');
  assert.equal(assetAmountToBaseUnits('12.345678', 6), '12345678');
  assert.throws(() => assetAmountToBaseUnits('0.0000001', 6));
});

test('known mainnet USDC metadata is exact but execution remains disabled', () => {
  assert.equal(POLKADOT_USDC_CONFIG.network, 'polkadot');
  assert.equal(POLKADOT_USDC_CONFIG.assetId, '1337');
  assert.equal(POLKADOT_USDC_CONFIG.symbol, 'USDC');
  assert.equal(POLKADOT_USDC_CONFIG.decimals, 6);
  assert.equal(POLKADOT_USDC_CONFIG.metadataVerified, true);
  assert.equal(canExecutePolkadotAsset(POLKADOT_USDC_CONFIG), false);
});

test('Paseo USDC is explicitly unverified with no invented asset id', () => {
  assert.equal(PASEO_USDC_UNVERIFIED_CONFIG.assetId, null);
  assert.equal(PASEO_USDC_UNVERIFIED_CONFIG.metadataVerified, false);
  assert.equal(canExecutePolkadotAsset(PASEO_USDC_UNVERIFIED_CONFIG), false);
});

test('disabled configuration cannot create an executable payment plan', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  assert.throws(() => buildPolkadotAssetPaymentPlan({payer, receiver, amount: 1, currency: 'USDC', config: POLKADOT_USDC_CONFIG}));
});

test('enabled verified plan requires authenticated identities and exact currency', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  const config = enabledTestConfig();
  const plan = buildPolkadotAssetPaymentPlan({payer, receiver, amount: '2.5', currency: 'USDC', config});
  assert.equal(plan.amountBaseUnits, '2500000');
  assert.equal(plan.config.assetId, '1337');
  assert.match(plan.senderAccountId, /^1/u);
  assert.match(plan.recipientAccountId, /^1/u);
  assert.throws(() => buildPolkadotAssetPaymentPlan({payer, receiver, amount: 1, currency: 'CHF', config}));
  assert.throws(() => buildPolkadotAssetPaymentPlan({payer: {id: 'local', name: 'Local'}, receiver, amount: 1, currency: 'USDC', config}));
});

test('product-account namespace mismatch is rejected', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  receiver.hostIdentity = {...receiver.hostIdentity!, productId: 'other.dot'};
  assert.throws(() => buildPolkadotAssetPaymentPlan({payer, receiver, amount: 1, currency: 'USDC', config: enabledTestConfig()}));
});

test('asset evidence must match exact plan fields', () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  const plan = buildPolkadotAssetPaymentPlan({payer, receiver, amount: '2.5', currency: 'USDC', config: enabledTestConfig()});
  const receipt: PolkadotAssetPaymentReceipt = {
    network: 'polkadot', assetId: '1337', symbol: 'USDC', txHash: `0x${'aa'.repeat(32)}`,
    senderAccountId: plan.senderAccountId, recipientAccountId: plan.recipientAccountId,
    amountBaseUnits: '2500000', blockHash: `0x${'bb'.repeat(32)}`, blockNumber: '123', finalizedAt: '2026-08-15T20:00:00.000Z',
  };
  assert.equal(assetReceiptMatchesPlan(receipt, plan), true);
  assert.equal(assetReceiptMatchesPlan({...receipt, assetId: '1984'}, plan), false);
  assert.equal(assetReceiptMatchesPlan({...receipt, symbol: 'USDt'}, plan), false);
  assert.equal(assetReceiptMatchesPlan({...receipt, recipientAccountId: plan.senderAccountId}, plan), false);
  assert.equal(assetReceiptMatchesPlan({...receipt, amountBaseUnits: '1'}, plan), false);
});

test('executor output is rejected if evidence is altered', async () => {
  const payer = hostUser('payer', 'Payer', '11');
  const receiver = hostUser('receiver', 'Receiver', '22');
  const plan = buildPolkadotAssetPaymentPlan({payer, receiver, amount: '1', currency: 'USDC', config: enabledTestConfig()});
  await assert.rejects(() => executePolkadotAssetPayment(plan, {
    execute: async () => ({
      network: 'polkadot', assetId: '1337', symbol: 'USDC', txHash: `0x${'aa'.repeat(32)}`,
      senderAccountId: plan.senderAccountId, recipientAccountId: plan.senderAccountId,
      amountBaseUnits: plan.amountBaseUnits, blockHash: `0x${'bb'.repeat(32)}`, blockNumber: '1', finalizedAt: '2026-08-15T20:00:00.000Z',
    }),
  }));
});