import { simChain } from './sim';
import type { PolkadotChainService } from './adapter';

const useSim = import.meta.env.VITE_SIMULATE_CHAIN === '1';
let chainPromise: Promise<PolkadotChainService> | null = null;

export const getChain = async (): Promise<PolkadotChainService> => {
  if (useSim) {
    return simChain;
  }
  if (!chainPromise) {
    chainPromise = import('./polkadot').then((module) => module.polkadotChainService);
  }
  return chainPromise;
};
