import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer} from '../state/store.ts';
import type {Expense, Group, Split, User, WalletPaymentReceipt} from '../types.ts';
import {
  pasToBaseUnits,
  POLKADOT_HUB_TESTNET_CHAIN_ID,
  verifyMatchingPasPayment,
  verifyPasPaymentReceipt,
} from './pasWallet.ts';

const minaAddress = '0x1111111111111111111111111111111111111111';
const leoAddress = '0x2222222222222222222222222222222222222222';
const txHash = `0x${'ab'.repeat(32)}`;

test('PAS values convert to exact 18-decimal base units', () => {
  assert.equal(pasToBaseUnits('0.008'), '8000000000000000');
  assert.equal(pasToBaseUnits(1.25), '1250000000000000000');
  assert.throws(() => pasToBaseUnits('0.0000000000000000001'));
});

test('direct RPC matching accepts only a finalized exact transfer', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockRpc({from: leoAddress, to: minaAddress, value: `0x${BigInt(pasToBaseUnits('0.008')).toString(16)}`});
  try {
    const receipt = await verifyMatchingPasPayment({
      txHash,
      from: leoAddress,
      to: minaAddress,
      amount: 0.008,
      rpcUrl: 'https://rpc.invalid',
    });
    assert.equal(receipt?.txHash, txHash);
    assert.equal(await verifyPasPaymentReceipt(receipt!, 'https://rpc.invalid'), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('direct RPC matching rejects a wrong recipient', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockRpc({from: leoAddress, to: '0x3333333333333333333333333333333333333333', value: '0x1'});
  try {
    await assert.rejects(
      verifyMatchingPasPayment({txHash, from: leoAddress, to: minaAddress, amount: 0.008, rpcUrl: 'https://rpc.invalid'}),
      /different wallet/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('matched payment clears only its exact split, awaits the receiver, and duplicate hash cannot clear another split', () => {
  const mina: User = {id: 'mina', name: 'Mina', walletAddress: minaAddress};
  const leo: User = {id: 'leo', name: 'Leo', walletAddress: leoAddress};
  const nina: User = {id: 'nina', name: 'Nina', walletAddress: '0x3333333333333333333333333333333333333333'};
  const group: Group = {id: 'g1', name: 'Friday Crew', memberIds: ['mina', 'leo', 'nina']};
  const expense: Expense = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 0.024, currency: 'PAS', paidByUserId: 'mina', date: new Date().toISOString()};
  const splits: Split[] = [
    {id: 's-mina', expenseId: 'e1', userId: 'mina', amount: 0.008, status: 'confirmed'},
    {id: 's-leo', expenseId: 'e1', userId: 'leo', amount: 0.008, status: 'open'},
    {id: 's-nina', expenseId: 'e1', userId: 'nina', amount: 0.008, status: 'open'},
  ];
  let state = createCleanState();
  for (const user of [mina, leo, nina]) state = reducer(state, {type: 'ADD_USER', payload: {user}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group}});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  state = reducer(state, {type: 'SEND_REQUEST', payload: {splitId: 's-leo'}});
  state = reducer(state, {type: 'SEND_REQUEST', payload: {splitId: 's-nina'}});

  const receipt: WalletPaymentReceipt = {
    txHash,
    chainId: POLKADOT_HUB_TESTNET_CHAIN_ID,
    from: leoAddress,
    to: minaAddress,
    amountBaseUnits: pasToBaseUnits(0.008),
    blockNumber: '0x10',
    confirmedAt: new Date().toISOString(),
  };
  state = reducer(state, {type: 'RECORD_MATCHED_PAYMENT', payload: {splitId: 's-leo', userId: 'leo', receiverUserId: 'mina', receipt}});
  assert.equal(state.splits['s-leo'].status, 'cleared');
  assert.equal(state.splits['s-nina'].status, 'request_sent');

  state = reducer(state, {
    type: 'RECORD_MATCHED_PAYMENT',
    payload: {
      splitId: 's-nina',
      userId: 'nina',
      receiverUserId: 'mina',
      receipt: {...receipt, from: nina.walletAddress!},
    },
  });
  assert.equal(state.splits['s-nina'].status, 'request_sent');

  state = reducer(state, {type: 'CONFIRM_RECEIVED', payload: {splitId: 's-leo', currentUserId: 'mina'}});
  assert.equal(state.splits['s-leo'].status, 'confirmed');
});

function mockRpc(transaction: {from: string; to: string; value: string}): typeof fetch {
  return (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as {method: string};
    const result = body.method === 'eth_getTransactionByHash'
      ? transaction
      : {status: '0x1', blockNumber: '0x10'};
    return new Response(JSON.stringify({jsonrpc: '2.0', id: 'test', result}), {
      status: 200,
      headers: {'content-type': 'application/json'},
    });
  }) as typeof fetch;
}

test('pasToBaseUnits survives float amounts that toFixed(18) would corrupt', () => {
  // Regression: 0.615 previously became 614999999999999991, so a legitimate
  // exact-match payment was rejected as "a different amount". Found by moving
  // real PAS on chain, not by unit tests.
  const cases: Array<[number, string]> = [
    [0.615, '615000000000000000'],
    [0.1, '100000000000000000'],
    [0.3, '300000000000000000'],
    [1.1, '1100000000000000000'],
    [2.675, '2675000000000000000'],
    [0.07, '70000000000000000'],
    [61.5, '61500000000000000000'],
    [1, '1000000000000000000'],
  ];
  for (const [amount, expected] of cases) {
    assert.equal(pasToBaseUnits(amount), expected, `pasToBaseUnits(${amount})`);
  }
});

test('pasToBaseUnits still accepts decimal strings verbatim', () => {
  assert.equal(pasToBaseUnits('0.615'), '615000000000000000');
  assert.equal(pasToBaseUnits('12'), '12000000000000000000');
});

test('pasToBaseUnits rejects amounts it cannot represent as a decimal', () => {
  assert.throws(() => pasToBaseUnits(1e-7), /valid PAS amount/);
  assert.throws(() => pasToBaseUnits(-1), /valid PAS amount/);
});
