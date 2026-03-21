import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { InjectedWindow } from '@polkadot/extension-inject/types';

export interface ExtensionInfo {
  name: string;
  source: string;
  accounts: Array<{ address: string; name?: string; source?: string }>;
}

const WALLET_NAME_MAP: Record<string, string> = {
  'subwallet-js': 'SubWallet',
  'subwallet': 'SubWallet',
  'talisman': 'Talisman',
  'polkadot-js': 'Polkadot.js',
  'polkadot{.js}': 'Polkadot.js',
  'polkagate': 'PolkaGate',
  'polkagate-extension': 'PolkaGate',
  'metamask': 'MetaMask',
};

interface UseExtensionConnectOptions {
  connectExtension: (address?: string, isAutoReconnect?: boolean, preferredSource?: string) => Promise<void>;
  onConnectingChange: (connecting: boolean) => void;
}

interface ExtensionAccountOption {
  address: string;
  name?: string;
  source?: string;
}

const EXTENSION_DISCOVERY_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Check that your Polkadot wallet extension is installed, unlocked, and approved for this site.`));
    }, EXTENSION_DISCOVERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function useExtensionConnect({ connectExtension, onConnectingChange }: UseExtensionConnectOptions) {
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionInfo[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedExtensionSource, setSelectedExtensionSource] = useState<string | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<ExtensionAccountOption[]>([]);

  const discoverExtensions = useCallback(async () => {
    try {
      const injectedWindow = typeof window !== 'undefined' ? (window as unknown as InjectedWindow) : null;
      const injectedEntries = Object.entries(injectedWindow?.injectedWeb3 || {}).filter(([, provider]) => Boolean(provider?.connect || provider?.enable));

      if (injectedEntries.length === 0) {
        throw new Error('No wallet extension found. Install SubWallet, Talisman, or Polkadot.js.');
      }

      const extensionList = injectedEntries.map(([source]) => ({
        name: WALLET_NAME_MAP[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1),
        source,
        accounts: [],
      }));

      setAvailableExtensions(extensionList);
      setSelectedExtensionSource(null);
      setAvailableAccounts([]);
      return extensionList;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to connect browser extension.';
      toast.error(message);
      setAvailableExtensions([]);
      return [];
    }
  }, []);

  const startConnect = useCallback(async () => {
    onConnectingChange(true);
    const extensions = await discoverExtensions();
    setShowSelector(true);
    onConnectingChange(false);
    return extensions;
  }, [discoverExtensions, onConnectingChange]);

  const connectToExtensionSource = useCallback(async (source: string) => {
    const extension = availableExtensions.find(ext => ext.source === source);
    if (!extension) {
      toast.error('That wallet is not currently available in this browser.');
      return;
    }

    setShowSelector(false);
    onConnectingChange(true);

    try {
      const injectedWindow = typeof window !== 'undefined' ? (window as unknown as InjectedWindow) : null;
      const selectedProvider = injectedWindow?.injectedWeb3?.[source];
      if (!selectedProvider) {
        throw new Error(`Unable to find ${extension.name} in this browser.`);
      }

      const enabledExtension = await withTimeout(
        selectedProvider.connect
          ? selectedProvider.connect('ChopDot')
          : selectedProvider.enable
            ? selectedProvider.enable('ChopDot')
            : Promise.reject(new Error(`${extension.name} does not expose a connect or enable hook.`)),
        `${extension.name} connection`,
      );

      const accounts = await withTimeout(enabledExtension.accounts.get(), `${extension.name} account discovery`);
      const discoveredAccounts = accounts.map((account) => ({
        address: account.address,
        name: account.name,
        source,
      }));
      const firstAccount = discoveredAccounts[0];
      if (!firstAccount) {
        throw new Error(`No accounts found in ${extension.name}.`);
      }

      if (discoveredAccounts.length > 1) {
        setSelectedExtensionSource(source);
        setAvailableAccounts(discoveredAccounts);
        onConnectingChange(false);
        return;
      }

      await connectExtension(firstAccount.address, false, source);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to connect browser extension.';
      toast.error(message);
    }
    onConnectingChange(false);
    if (availableAccounts.length === 0) {
      setAvailableExtensions([]);
    }
  }, [availableAccounts.length, availableExtensions, connectExtension, onConnectingChange]);

  const connectToExtensionAccount = useCallback(async (address: string) => {
    if (!selectedExtensionSource) {
      toast.error('Select a wallet extension first.');
      return;
    }

    setShowSelector(false);
    onConnectingChange(true);

    try {
      await connectExtension(address, false, selectedExtensionSource);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to connect browser extension.';
      toast.error(message);
    }

    setAvailableExtensions([]);
    setAvailableAccounts([]);
    setSelectedExtensionSource(null);
    onConnectingChange(false);
  }, [connectExtension, onConnectingChange, selectedExtensionSource]);

  const selectExtension = connectToExtensionSource;

  const backToExtensionList = useCallback(() => {
    setAvailableAccounts([]);
    setSelectedExtensionSource(null);
    onConnectingChange(false);
  }, [onConnectingChange]);

  const closeSelector = useCallback(() => {
    setShowSelector(false);
    setAvailableExtensions([]);
    setAvailableAccounts([]);
    setSelectedExtensionSource(null);
    onConnectingChange(false);
  }, [onConnectingChange]);

  const reset = useCallback(() => {
    setShowSelector(false);
    setAvailableExtensions([]);
    setAvailableAccounts([]);
    setSelectedExtensionSource(null);
  }, []);

  return {
    availableExtensions,
    availableAccounts,
    selectedExtensionSource,
    showSelector,
    discoverExtensions,
    startConnect,
    connectToExtensionSource,
    connectToExtensionAccount,
    selectExtension,
    backToExtensionList,
    closeSelector,
    reset,
  };
}
