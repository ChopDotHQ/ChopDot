import type { ChainConfig } from './config';

export type TxStatus = 'submitted' | 'inBlock' | 'finalized';

export type SignAndSendArgs = {
  buildTx: (ctx: { api: any; config: ChainConfig }) => any;
  from: string;
  onStatus?: (s: TxStatus, ctx?: { txHash?: string; blockHash?: string }) => void;
  forceBrowserExtension?: boolean;
};

export type SendDotArgs = {
  from: string;
  to: string;
  amountDot: number; // Note: number, not string
  onStatus?: (s: TxStatus, ctx?: { txHash?: string; blockHash?: string }) => void;
  forceBrowserExtension?: boolean;
};

export type EstimateFeeArgs = {
  from: string;
  to: string;
  amountDot: number;
};

export interface PolkadotChainService {
  setChain: (chain: 'relay' | 'assethub') => void; // Synchronous, accepts both for compatibility
  getCurrentChain: () => 'assethub';
  getConfig: () => ChainConfig; // Full ChainConfig type, not simplified
  getCurrentRpc: () => string | null; // Returns the currently active RPC endpoint, or null if not connected

  // balances
  getFreeBalance: (address: string) => Promise<string>; // planck string
  estimateFee: (args: EstimateFeeArgs) => Promise<string>; // planck string

  // utils
  isValidPolkadotAddress: (a: string) => boolean;
  isValidSs58: (a: string) => boolean;
  normalizeToPolkadot: (a: string) => string;
  buildSubscanUrl: (txHash: string) => string;
  toPlanckString: (amountDot: number) => string; // Exported utility

  // txs
  signAndSendExtrinsic: (args: SignAndSendArgs) => Promise<{ txHash: string; finalizedBlock?: string }>;
  sendDot: (args: SendDotArgs) => Promise<{ txHash: string; finalizedBlock?: string }>;
}

export type SendDotResult = {
  txHash: string;
  finalizedBlock?: string;
};

