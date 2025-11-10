export const CHAIN_CONFIG = {
  westend: {
    key: 'westend',
    ss58: 42,
    decimals: 12,
    subscanExtrinsicBase: 'https://westend.subscan.io/extrinsic',
    rpc: [
      'wss://westend-rpc.polkadot.io',
      'wss://rpc.dotters.network/westend',
      'wss://westend.public.curie.xyz',
    ],
    walletConnectChainId: 'polkadot-westend:91b171bb158e2d3848fa23a9f1c25182',
    displayName: 'Westend (Testnet)',
  },
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

/**
 * Get the active chain configuration based on environment
 */
export const getActiveChain = (): ChainKey => {
  const envChain = import.meta.env.VITE_CHAIN_NETWORK?.toLowerCase();
  if (envChain === 'westend' || envChain === 'assethub') {
    return envChain;
  }
  return 'assethub'; // Default
};

export const getActiveChainConfig = (): ChainConfig => {
  return CHAIN_CONFIG[getActiveChain()];
};

export const resolveChainKey = (chain: string): ChainKey => {
  if (chain === 'relay') {
    console.warn('[chain] "relay" deprecated, using Asset Hub');
    return 'assethub';
  }
  return 'assethub';
};
