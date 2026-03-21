export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  isTalisman?: boolean;
  isSubWallet?: boolean;
  providerInfo?: {
    name?: string;
    rdns?: string;
  };
};

export type WalletCapabilities = {
  canSettleOnAssetHub: boolean;
  canCloseoutOnPolkadotHub: boolean;
  closeoutSupportReason: string | null;
  closeoutProviderLabel: string | null;
};

export type CloseoutProviderCandidate = {
  label: string;
  provider: Eip1193Provider;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
    talismanEth?: Eip1193Provider;
  }
}

const SETTLEMENT_ONLY_SOURCES = new Set(['polkadot-js', 'polkadot{.js}', 'walletconnect']);

const toWalletSourceKey = (source?: string | null): string | null => {
  const normalized = source?.trim().toLowerCase() || null;
  if (!normalized) return null;
  if (normalized === 'subwallet-js') return 'subwallet';
  if (normalized === 'polkadot{.js}') return 'polkadot-js';
  return normalized;
};

const getProviderLabel = (provider: Eip1193Provider, origin: string): string => {
  const infoName = provider.providerInfo?.name?.trim();
  if (infoName) return infoName;
  if (provider.isTalisman || origin === 'window.talismanEth') return 'Talisman';
  if (provider.isSubWallet) return 'SubWallet';
  if (provider.isMetaMask) return 'MetaMask';
  return 'Injected wallet';
};

const getAllInjectedEvmProviders = (): Array<{ label: string; provider: Eip1193Provider }> => {
  if (typeof window === 'undefined') return [];

  const seen = new Set<Eip1193Provider>();
  const providers: Array<{ label: string; provider: Eip1193Provider }> = [];

  const addProvider = (provider: Eip1193Provider | undefined, origin: string) => {
    if (!provider || seen.has(provider)) return;
    seen.add(provider);
    providers.push({ label: getProviderLabel(provider, origin), provider });
  };

  addProvider(window.talismanEth, 'window.talismanEth');

  if (window.ethereum?.providers?.length) {
    window.ethereum.providers.forEach((provider, index) => {
      addProvider(provider, `window.ethereum.providers.${index}`);
    });
  }

  addProvider(window.ethereum, 'window.ethereum');

  return providers;
};

const rankCloseoutProvider = (provider: Eip1193Provider, label: string, walletSource?: string | null): number => {
  const normalizedSource = toWalletSourceKey(walletSource);
  const normalizedLabel = label.trim().toLowerCase();

  const isMetaMask = provider.isMetaMask || normalizedLabel.includes('metamask');
  const isTalisman = provider === window.talismanEth || provider.isTalisman || normalizedLabel.includes('talisman');
  const isSubWallet = provider.isSubWallet || normalizedLabel.includes('subwallet');

  if (normalizedSource === 'talisman') {
    if (isTalisman) return 0;
    if (isMetaMask) return 1;
    if (isSubWallet) return 2;
    return 3;
  }

  if (normalizedSource === 'subwallet') {
    if (isSubWallet) return 0;
    if (isMetaMask) return 1;
    if (isTalisman) return 2;
    return 3;
  }

  if (normalizedSource === 'metamask') {
    if (isMetaMask) return 0;
    if (isTalisman) return 1;
    if (isSubWallet) return 2;
    return 3;
  }

  if (isMetaMask) return 0;
  if (isTalisman) return 1;
  if (isSubWallet) return 2;
  return 3;
};

export const getCloseoutProviderCandidates = (
  walletSource?: string | null,
): { candidates: CloseoutProviderCandidate[]; reason: string | null } => {
  if (import.meta.env.VITE_SIMULATE_PVM_CLOSEOUT === '1') {
    return {
      candidates: [],
      reason: null,
    };
  }

  const providers = getAllInjectedEvmProviders();
  if (providers.length === 0) {
    return {
      candidates: [],
      reason: 'No injected EVM provider was detected for closeout.',
    };
  }

  const normalizedSource = toWalletSourceKey(walletSource);
  if (!normalizedSource) {
    return {
      candidates: [...providers].sort(
        (left, right) =>
          rankCloseoutProvider(left.provider, left.label, normalizedSource)
          - rankCloseoutProvider(right.provider, right.label, normalizedSource),
      ),
      reason: null,
    };
  }

  if (SETTLEMENT_ONLY_SOURCES.has(normalizedSource)) {
    return {
      candidates: [...providers].sort(
        (left, right) =>
          rankCloseoutProvider(left.provider, left.label, normalizedSource)
          - rankCloseoutProvider(right.provider, right.label, normalizedSource),
      ),
      reason:
        normalizedSource === 'walletconnect'
          ? 'WalletConnect can settle on Asset Hub, but closeout still needs a browser-injected EVM wallet for contract writes.'
          : 'The connected settlement wallet does not expose an EVM closeout provider, so ChopDot will fall back to another injected EVM wallet if one is available.',
    };
  }

  return {
    candidates: [...providers].sort(
      (left, right) =>
        rankCloseoutProvider(left.provider, left.label, normalizedSource)
        - rankCloseoutProvider(right.provider, right.label, normalizedSource),
    ),
    reason: null,
  };
};

export const getPreferredCloseoutProvider = (
  walletSource?: string | null,
): { provider: Eip1193Provider | null; label: string | null; reason: string | null } => {
  const normalizedSource = toWalletSourceKey(walletSource);
  if (import.meta.env.VITE_SIMULATE_PVM_CLOSEOUT === '1') {
    return {
      provider: null,
      label: 'Simulation mode',
      reason: null,
    };
  }

  const { candidates, reason } = getCloseoutProviderCandidates(walletSource);
  if (candidates.length === 0) {
    return {
      provider: null,
      label: null,
      reason: reason || (
        normalizedSource
          ? 'No closeout-compatible EVM wallet was detected for the connected wallet.'
          : 'Connect a supported wallet before anchoring a closeout.'
      ),
    };
  }

  return {
    provider: candidates[0]!.provider,
    label: candidates[0]!.label,
    reason,
  };
};

export const getWalletCapabilities = ({
  connector,
  status,
  walletSource,
}: {
  connector: 'extension' | 'walletconnect' | null;
  status: 'disconnected' | 'connecting' | 'connected';
  walletSource?: string | null;
}): WalletCapabilities => {
  const canSettleOnAssetHub = status === 'connected' && (connector === 'extension' || connector === 'walletconnect');

  if (!canSettleOnAssetHub) {
    return {
      canSettleOnAssetHub: false,
      canCloseoutOnPolkadotHub: false,
      closeoutSupportReason: 'Connect a wallet before starting settlement or closeout.',
      closeoutProviderLabel: null,
    };
  }

  const preferredProvider = getPreferredCloseoutProvider(walletSource);
  return {
    canSettleOnAssetHub,
    canCloseoutOnPolkadotHub: Boolean(preferredProvider.provider || import.meta.env.VITE_SIMULATE_PVM_CLOSEOUT === '1'),
    closeoutSupportReason: preferredProvider.reason,
    closeoutProviderLabel: preferredProvider.label,
  };
};

export const normalizeWalletSource = toWalletSourceKey;
