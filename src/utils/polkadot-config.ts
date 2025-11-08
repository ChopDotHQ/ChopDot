export const polkadotConfig = {
  networkName: 'Asset Hub (Polkadot)',
  ss58Prefix: 0,
  rpcUrl: 'wss://polkadot-asset-hub-rpc.polkadot.io',
  explorerBaseUrl: 'https://assethub-polkadot.subscan.io',
} as const;

export const explorer = {
  address: (addr: string): string => `${polkadotConfig.explorerBaseUrl}/account/${addr}`,
  extrinsic: (hash: string): string => `${polkadotConfig.explorerBaseUrl}/extrinsic/${hash}`,
};

