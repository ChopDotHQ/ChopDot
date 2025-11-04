export const polkadotConfig = {
  networkName: 'Westend',
  ss58Prefix: 42,
  rpcUrl: 'wss://westend-rpc.polkadot.io',
  explorerBaseUrl: 'https://westend.subscan.io',
} as const;

export const explorer = {
  address: (addr: string): string => `${polkadotConfig.explorerBaseUrl}/account/${addr}`,
  extrinsic: (hash: string): string => `${polkadotConfig.explorerBaseUrl}/extrinsic/${hash}`,
};


