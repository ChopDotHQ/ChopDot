import assert from 'node:assert/strict';
import test from 'node:test';
import {
  availableSettlementCapability,
  isChainSettlementRail,
  settlementOutcomeFromEvidence,
  unavailableSettlementCapability,
  type ChainTransactionEvidence,
} from './settlement.ts';

test('all rails converge on awaiting receiver confirmation after evidence', () => {
  const evidence: ChainTransactionEvidence = {
    kind: 'chain_transaction',
    observedAt: '2026-08-15T20:00:00.000Z',
    txHash: '0xabc',
    chainId: '0x123',
    from: '0xfrom',
    to: '0xto',
    amountBaseUnits: '42000000',
    blockNumber: '0x10',
  };

  assert.deepEqual(settlementOutcomeFromEvidence('polkadot_native', evidence), {
    status: 'awaiting_receiver_confirmation',
    rail: 'polkadot_native',
    evidence,
  });
});

test('Polkadot native and USDC are chain rails without changing core settlement lifecycle', () => {
  assert.equal(isChainSettlementRail('polkadot_native'), true);
  assert.equal(isChainSettlementRail('polkadot_usdc'), true);
  assert.equal(isChainSettlementRail('cash'), false);
  assert.equal(isChainSettlementRail('bank_transfer'), false);
  assert.equal(isChainSettlementRail('payment_link'), false);
});

test('capabilities report unsupported rails honestly', () => {
  assert.deepEqual(availableSettlementCapability('cash'), {rail: 'cash', available: true});
  assert.deepEqual(unavailableSettlementCapability('polkadot_usdc', 'Asset transfer capability unavailable'), {
    rail: 'polkadot_usdc',
    available: false,
    reason: 'Asset transfer capability unavailable',
  });
});
