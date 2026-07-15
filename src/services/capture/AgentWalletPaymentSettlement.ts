import type { HandoffLeg } from './types/settlementAdapter';

export const POLKADOT_HUB_TESTNET_CHAIN_ID = '0x190f1b41';
export const POLKADOT_HUB_TESTNET_RPC = 'https://services.polkadothub-rpc.com/testnet';
export const POLKADOT_HUB_TESTNET_EXPLORER = 'https://blockscout-testnet.polkadot.io/tx';

export type DirectPasPaymentReceipt = {
  txHash: string;
  chainId: string;
  from: string;
  to: string;
  amountBaseUnits: string;
  blockNumber: string;
  explorerUrl: string;
};

export type DirectPasPaymentCheck =
  | { status: 'matched'; receipt: DirectPasPaymentReceipt }
  | { status: 'pending' }
  | { status: 'failed'; message: string };

type RpcTransaction = {
  from: string;
  to: string | null;
  value: string;
};

type RpcReceipt = {
  status: string;
  blockNumber: string | null;
};

function normalizeEvmAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/u.test(normalized)) {
    throw new Error('This wallet address is not valid.');
  }
  return normalized;
}

function pasToBaseUnits(amount: number): string {
  const source = amount.toFixed(18).replace(/0+$/u, '').replace(/\.$/u, '');
  if (!/^\d+(?:\.\d{1,18})?$/u.test(source)) {
    throw new Error('This payment amount is not valid.');
  }
  const [whole = '0', fraction = ''] = source.split('.');
  return (BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))).toString();
}

async function rpcRequest<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `${method}-${Date.now()}`, method, params }),
  });
  if (!response.ok) {
    throw new Error('ChopDot could not check the payment yet.');
  }
  const payload = await response.json() as { result?: T; error?: { message?: string } };
  if (payload.error) {
    throw new Error(payload.error.message || 'ChopDot could not check the payment yet.');
  }
  return payload.result as T;
}

export async function checkDirectPasPayment(
  leg: HandoffLeg,
  input: {
    txHash: string;
    payerAddress: string;
    receiverAddress: string;
    rpcUrl?: string;
  },
): Promise<DirectPasPaymentCheck> {
  if (leg.currency !== 'PAS') {
    return { status: 'failed', message: 'This payment check only supports PAS.' };
  }

  try {
    const txHash = input.txHash.trim().toLowerCase();
    if (!/^0x[0-9a-f]{64}$/u.test(txHash)) {
      throw new Error('The payment reference is not valid.');
    }

    const rpcUrl = input.rpcUrl ?? POLKADOT_HUB_TESTNET_RPC;
    const [transaction, receipt] = await Promise.all([
      rpcRequest<RpcTransaction | null>(rpcUrl, 'eth_getTransactionByHash', [txHash]),
      rpcRequest<RpcReceipt | null>(rpcUrl, 'eth_getTransactionReceipt', [txHash]),
    ]);

    if (!transaction || !receipt || !receipt.blockNumber) {
      return { status: 'pending' };
    }
    if (receipt.status !== '0x1') {
      return { status: 'failed', message: 'The payment did not complete.' };
    }

    const payerAddress = normalizeEvmAddress(input.payerAddress);
    const receiverAddress = normalizeEvmAddress(input.receiverAddress);
    if (normalizeEvmAddress(transaction.from) !== payerAddress) {
      return { status: 'failed', message: 'This payment came from a different wallet.' };
    }
    if (!transaction.to || normalizeEvmAddress(transaction.to) !== receiverAddress) {
      return { status: 'failed', message: 'This payment went to a different wallet.' };
    }

    const amountBaseUnits = BigInt(transaction.value).toString();
    if (amountBaseUnits !== pasToBaseUnits(leg.amount)) {
      return { status: 'failed', message: 'This payment has a different amount.' };
    }

    return {
      status: 'matched',
      receipt: {
        txHash,
        chainId: POLKADOT_HUB_TESTNET_CHAIN_ID,
        from: payerAddress,
        to: receiverAddress,
        amountBaseUnits,
        blockNumber: receipt.blockNumber,
        explorerUrl: `${POLKADOT_HUB_TESTNET_EXPLORER}/${txHash}`,
      },
    };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'ChopDot could not check the payment yet.',
    };
  }
}
