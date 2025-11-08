import type { PolkadotChainService, SignAndSendArgs, SendDotArgs, EstimateFeeArgs } from './adapter';
import { isValidSs58Any, normalizeToPolkadot } from './address';
import type { ChainConfig } from './config';

const subscanBase = 'https://assethub-polkadot.subscan.io/extrinsic';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fakeHash(prefix: string) {
  return prefix + Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 66); // 0x + 64 hex chars
}

function fakeBlockHash() {
  return fakeHash('0xblock');
}

const mockConfig: ChainConfig = {
  key: 'assethub',
  ss58: 0,
  decimals: 10,
  subscanExtrinsicBase: subscanBase,
  rpc: ['wss://polkadot-asset-hub-rpc.polkadot.io'] as any, // Simulation mode - use any to bypass readonly tuple type
  walletConnectChainId: 'polkadot-asset-hub:91b171bb158e2d3848fa23a9f1c25182',
  displayName: 'Asset Hub (Polkadot)',
};

const toPlanckString = (amountDot: number, decimals: number): string => {
  const s = amountDot.toString();
  const [intPart, fracPartRaw = ''] = s.split('.');
  const fracPart = fracPartRaw.slice(0, decimals);
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${intPart}${paddedFrac}`.replace(/^0+(?=\d)/, '');
  const asBigInt = BigInt(combined.length ? combined : '0');
  return asBigInt.toString();
};

export const simChain: PolkadotChainService = {
  setChain(_chain: 'relay' | 'assethub') {
    // No-op in simulation - always uses Asset Hub
  },

  getCurrentChain() {
    return 'assethub';
  },

  getConfig() {
    return mockConfig;
  },

  getCurrentRpc() {
    return 'mock://local';
  },

  async getFreeBalance(_address: string) {
    // 100 DOT in planck by default, overridable via localStorage 'mock_balance'
    if (typeof window !== 'undefined') {
      const ls = window.localStorage.getItem('mock_balance');
      if (ls) return ls;
    }
    return '1000000000000'; // 100 DOT in planck (10 decimals)
  },

  async estimateFee(_args: EstimateFeeArgs) {
    // Small fixed fee (0.01 DOT) for UI display: 0.01 * 10^10 planck
    return '100000000'; // 0.01 DOT in planck
  },

  isValidPolkadotAddress(a: string) {
    return isValidSs58Any(a);
  },

  isValidSs58(a: string) {
    return isValidSs58Any(a);
  },

  normalizeToPolkadot(a: string) {
    return normalizeToPolkadot(a);
  },

  buildSubscanUrl(txHash: string) {
    return `${subscanBase}/${txHash}`;
  },

  toPlanckString(amountDot: number) {
    return toPlanckString(amountDot, mockConfig.decimals);
  },

  async signAndSendExtrinsic({ onStatus }: SignAndSendArgs) {
    const txHash = fakeHash('0xsim');
    
    onStatus?.('submitted', { txHash });
    await delay(250);

    const blockHash = fakeBlockHash();
    onStatus?.('inBlock', { txHash, blockHash });
    await delay(300);

    const finalizedBlockHash = fakeBlockHash();
    onStatus?.('finalized', { txHash, blockHash: finalizedBlockHash });
    
    return { txHash, finalizedBlock: finalizedBlockHash };
  },

  async sendDot({ from, to, amountDot, onStatus }: SendDotArgs) {
    // Delegate to simulated signAndSendExtrinsic lifecycle (matches real implementation)
    return this.signAndSendExtrinsic({
      buildTx: () => ({}), // Not used in sim
      from,
      onStatus,
    });
  },
};

