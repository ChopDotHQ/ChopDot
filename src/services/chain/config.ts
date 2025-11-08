export const CHAIN_CONFIG = {
  assethub: {
    key: 'assethub',
    ss58: 0,
    decimals: 10,
    subscanExtrinsicBase: 'https://assethub-polkadot.subscan.io/extrinsic',
    rpc: [
      'wss://polkadot-asset-hub-rpc.polkadot.io',
      'wss://rpc-asset-hub-polkadot.publicnode.com',
      'wss://assethub.dotters.network',
      'wss://statemint-rpc.dwellir.com',
    ],
    walletConnectChainId: 'polkadot-asset-hub:91b171bb158e2d3848fa23a9f1c25182',
    displayName: 'Asset Hub (Polkadot)',
  },
} as const;

export type ChainKey = keyof typeof CHAIN_CONFIG;
export type ChainConfig = (typeof CHAIN_CONFIG)[ChainKey];

export const resolveChainKey = (chain: string): ChainKey => {
  if (chain === 'relay') {
    console.warn('[chain] "relay" deprecated, using Asset Hub');
    return 'assethub';
  }
  return 'assethub';
};
