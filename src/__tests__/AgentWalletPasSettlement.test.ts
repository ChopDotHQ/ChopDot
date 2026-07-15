import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkDirectPasPayment,
  POLKADOT_HUB_TESTNET_CHAIN_ID,
} from '../services/capture/AgentWalletPaymentSettlement';
import type { HandoffLeg } from '../services/capture/types/settlementAdapter';

const payerAddress = '0x1111111111111111111111111111111111111111';
const receiverAddress = '0x2222222222222222222222222222222222222222';
const txHash = `0x${'ab'.repeat(32)}`;
const leg: HandoffLeg = {
  id: 'leg_1',
  fromMemberId: 'leo',
  toMemberId: 'mina',
  fromName: 'Leo',
  toName: 'Mina',
  amount: 0.01,
  currency: 'PAS',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('direct PAS payment observation', () => {
  it('matches a completed transaction with the exact payer, receiver, and amount', async () => {
    vi.stubGlobal('fetch', mockRpc({
      transaction: {
        from: payerAddress,
        to: receiverAddress,
        value: '0x2386f26fc10000',
      },
      receipt: { status: '0x1', blockNumber: '0x10' },
    }));

    const result = await checkDirectPasPayment(leg, {
      txHash,
      payerAddress,
      receiverAddress,
      rpcUrl: 'https://rpc.invalid',
    });

    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.receipt.chainId).toBe(POLKADOT_HUB_TESTNET_CHAIN_ID);
      expect(result.receipt.amountBaseUnits).toBe('10000000000000000');
      expect(result.receipt.explorerUrl).toContain(txHash);
    }
  });

  it('keeps the payment open while the transaction is not observable', async () => {
    vi.stubGlobal('fetch', mockRpc({ transaction: null, receipt: null }));

    await expect(checkDirectPasPayment(leg, {
      txHash,
      payerAddress,
      receiverAddress,
      rpcUrl: 'https://rpc.invalid',
    })).resolves.toEqual({ status: 'pending' });
  });

  it('rejects a transaction sent to a different wallet', async () => {
    vi.stubGlobal('fetch', mockRpc({
      transaction: {
        from: payerAddress,
        to: '0x3333333333333333333333333333333333333333',
        value: '0x2386f26fc10000',
      },
      receipt: { status: '0x1', blockNumber: '0x10' },
    }));

    const result = await checkDirectPasPayment(leg, {
      txHash,
      payerAddress,
      receiverAddress,
      rpcUrl: 'https://rpc.invalid',
    });

    expect(result).toEqual({
      status: 'failed',
      message: 'This payment went to a different wallet.',
    });
  });

  it('does not promote DOT or USDC through the PAS observer', async () => {
    for (const currency of ['DOT', 'USDC']) {
      await expect(checkDirectPasPayment({ ...leg, currency }, {
        txHash,
        payerAddress,
        receiverAddress,
      })).resolves.toEqual({
        status: 'failed',
        message: 'This payment check only supports PAS.',
      });
    }
  });
});

function mockRpc(input: {
  transaction: { from: string; to: string | null; value: string } | null;
  receipt: { status: string; blockNumber: string | null } | null;
}): typeof fetch {
  return (async (_request: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { method: string };
    const result = body.method === 'eth_getTransactionByHash'
      ? input.transaction
      : input.receipt;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 'test', result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}
