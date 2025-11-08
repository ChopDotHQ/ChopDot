import { polkadotChainService } from './polkadot';
import { simChain } from './sim';
import type { PolkadotChainService } from './adapter';

const useSim = import.meta.env.VITE_SIMULATE_CHAIN === '1';

export const chain: PolkadotChainService = useSim ? simChain : polkadotChainService;

