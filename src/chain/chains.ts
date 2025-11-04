export type ChainKey = 'westend' | 'polkadot';

export interface ChainPreset {
  key: ChainKey;
  label: string;
  wellKnown: 'westend2' | 'polkadot';
  explorerBaseUrl: string;
}

export const CHAINS: Record<ChainKey, ChainPreset> = {
  westend: { key: 'westend', label: 'Westend', wellKnown: 'westend2', explorerBaseUrl: 'https://westend.subscan.io' },
  polkadot: { key: 'polkadot', label: 'Asset Hub (Polkadot)', wellKnown: 'polkadot', explorerBaseUrl: 'https://polkadot.subscan.io' },
};

const STORAGE_KEY = 'chopdot_chain';

export function getCurrentChain(): ChainPreset {
  const val = (localStorage.getItem(STORAGE_KEY) as ChainKey | null) || 'westend';
  return CHAINS[val] || CHAINS.westend;
}

export function setCurrentChain(key: ChainKey) {
  localStorage.setItem(STORAGE_KEY, key);
  window.dispatchEvent(new CustomEvent('chopdot:chainChanged', { detail: key }));
}


