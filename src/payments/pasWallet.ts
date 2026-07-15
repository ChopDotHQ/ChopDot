export const POLKADOT_HUB_TESTNET_CHAIN_ID = '0x190f1b41';
export const POLKADOT_HUB_TESTNET_RPC = 'https://services.polkadothub-rpc.com/testnet';
export const POLKADOT_HUB_TESTNET_EXPLORER = 'https://blockscout-testnet.polkadot.io/tx';

export interface Eip1193Provider {
  request(args: {method: string; params?: unknown[]}): Promise<unknown>;
}

export interface PasPaymentReceipt {
  txHash: string;
  chainId: string;
  from: string;
  to: string;
  amountBaseUnits: string;
  blockNumber: string;
  confirmedAt: string;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function pasToBaseUnits(amount: number | string): string {
  const source = typeof amount === 'number'
    ? amount.toFixed(18).replace(/0+$/u, '').replace(/\.$/u, '')
    : amount.trim();
  if (!/^\d+(?:\.\d{1,18})?$/u.test(source)) {
    throw new Error('Enter a valid PAS amount.');
  }
  const [whole, fraction = ''] = source.split('.');
  return (BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))).toString();
}

export function normalizeEvmAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/u.test(normalized)) throw new Error('This wallet address is not valid.');
  return normalized;
}

export async function connectPasWallet(provider = window.ethereum): Promise<string> {
  if (!provider) throw new Error('Open this link in a browser with a wallet.');
  const chainId = String(await provider.request({method: 'eth_chainId'})).toLowerCase();
  if (chainId !== POLKADOT_HUB_TESTNET_CHAIN_ID) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{chainId: POLKADOT_HUB_TESTNET_CHAIN_ID}],
      });
    } catch {
      throw new Error('Switch your wallet to Polkadot Hub TestNet.');
    }
  }
  const accounts = await provider.request({method: 'eth_requestAccounts'});
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
    throw new Error('No wallet account was selected.');
  }
  return normalizeEvmAddress(accounts[0]);
}

export async function sendPasPayment({
  provider = window.ethereum,
  from,
  to,
  amount,
}: {
  provider?: Eip1193Provider;
  from: string;
  to: string;
  amount: number;
}): Promise<string> {
  if (!provider) throw new Error('Open this link in a browser with a wallet.');
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: normalizeEvmAddress(from),
      to: normalizeEvmAddress(to),
      value: `0x${BigInt(pasToBaseUnits(amount)).toString(16)}`,
    }],
  });
  if (typeof txHash !== 'string' || !/^0x[0-9a-f]{64}$/iu.test(txHash)) {
    throw new Error('The wallet did not return a payment reference.');
  }
  return txHash.toLowerCase();
}

export async function waitForMatchingPasPayment({
  txHash,
  from,
  to,
  amount,
  rpcUrl = POLKADOT_HUB_TESTNET_RPC,
  attempts = 45,
  intervalMs = 1_000,
}: {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  rpcUrl?: string;
  attempts?: number;
  intervalMs?: number;
}): Promise<PasPaymentReceipt> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await verifyMatchingPasPayment({txHash, from, to, amount, rpcUrl});
      if (result) return result;
    } catch (reason) {
      lastError = reason instanceof Error ? reason : new Error(String(reason));
      if (!lastError.message.includes('still being confirmed')) throw lastError;
    }
    await new Promise(resolve => window.setTimeout(resolve, intervalMs));
  }
  throw lastError ?? new Error('The payment is still being confirmed. Try again shortly.');
}

export async function verifyMatchingPasPayment({
  txHash,
  from,
  to,
  amount,
  rpcUrl = POLKADOT_HUB_TESTNET_RPC,
}: {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  rpcUrl?: string;
}): Promise<PasPaymentReceipt | null> {
  const normalizedHash = txHash.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/u.test(normalizedHash)) throw new Error('The payment reference is not valid.');
  const [transaction, receipt] = await Promise.all([
    rpcRequest<RpcTransaction | null>(rpcUrl, 'eth_getTransactionByHash', [normalizedHash]),
    rpcRequest<RpcReceipt | null>(rpcUrl, 'eth_getTransactionReceipt', [normalizedHash]),
  ]);
  if (!transaction || !receipt || !receipt.blockNumber) {
    throw new Error('The payment is still being confirmed. Try again shortly.');
  }
  if (receipt.status !== '0x1') throw new Error('The payment did not complete.');
  if (normalizeEvmAddress(transaction.from) !== normalizeEvmAddress(from)) throw new Error('This payment came from a different wallet.');
  if (!transaction.to || normalizeEvmAddress(transaction.to) !== normalizeEvmAddress(to)) throw new Error('This payment went to a different wallet.');
  const expectedAmount = pasToBaseUnits(amount);
  const receivedAmount = BigInt(transaction.value).toString();
  if (receivedAmount !== expectedAmount) throw new Error('This payment has a different amount.');

  return {
    txHash: normalizedHash,
    chainId: POLKADOT_HUB_TESTNET_CHAIN_ID,
    from: normalizeEvmAddress(transaction.from),
    to: normalizeEvmAddress(transaction.to),
    amountBaseUnits: receivedAmount,
    blockNumber: receipt.blockNumber,
    confirmedAt: new Date().toISOString(),
  };
}

export async function verifyPasPaymentReceipt(
  reference: PasPaymentReceipt,
  rpcUrl = POLKADOT_HUB_TESTNET_RPC,
): Promise<boolean> {
  if (reference.chainId.toLowerCase() !== POLKADOT_HUB_TESTNET_CHAIN_ID) return false;
  const normalizedHash = reference.txHash.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/u.test(normalizedHash)) return false;
  const [transaction, receipt] = await Promise.all([
    rpcRequest<RpcTransaction | null>(rpcUrl, 'eth_getTransactionByHash', [normalizedHash]),
    rpcRequest<RpcReceipt | null>(rpcUrl, 'eth_getTransactionReceipt', [normalizedHash]),
  ]);
  if (!transaction || !receipt || receipt.status !== '0x1' || !receipt.blockNumber) return false;
  try {
    return normalizeEvmAddress(transaction.from) === normalizeEvmAddress(reference.from)
      && Boolean(transaction.to)
      && normalizeEvmAddress(transaction.to!) === normalizeEvmAddress(reference.to)
      && BigInt(transaction.value).toString() === reference.amountBaseUnits
      && receipt.blockNumber.toLowerCase() === reference.blockNumber.toLowerCase();
  } catch {
    return false;
  }
}

interface RpcTransaction {
  from: string;
  to: string | null;
  value: string;
}

interface RpcReceipt {
  status: string;
  blockNumber: string | null;
}

async function rpcRequest<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({jsonrpc: '2.0', id: `${method}-${Date.now()}`, method, params}),
  });
  if (!response.ok) throw new Error('ChopDot could not check the payment yet.');
  const payload = await response.json() as {result?: T; error?: {message?: string}};
  if (payload.error) throw new Error(payload.error.message || 'ChopDot could not check the payment yet.');
  return payload.result as T;
}
