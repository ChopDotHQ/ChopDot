export const POLKADOT_RELAY_CHAIN = {
  wsEndpoint: 'wss://rpc.polkadot.io',
  ss58Prefix: 0,
  dotDecimals: 10,
  subscanExtrinsicBase: 'https://polkadot.subscan.io/extrinsic',
  name: 'Polkadot Relay Chain',
} as const;

export const POLKADOT_ASSET_HUB = {
  wsEndpoint: 'wss://polkadot-asset-hub-rpc.polkadot.io',
  ss58Prefix: 0,
  dotDecimals: 10,
  subscanExtrinsicBase: 'https://assethub-polkadot.subscan.io/extrinsic',
  name: 'Polkadot Asset Hub',
} as const;

export const POLKADOT_MAINNET = POLKADOT_RELAY_CHAIN; // Default to relay chain for backwards compatibility

export type PolkadotChainConfig = typeof POLKADOT_RELAY_CHAIN;


