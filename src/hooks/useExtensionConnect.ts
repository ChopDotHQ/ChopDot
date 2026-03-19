import { useState, useCallback } from 'react';

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
  connectExtension: (address: string) => Promise<void>;
  onConnectingChange: (connecting: boolean) => void;
}

export function useExtensionConnect({ connectExtension, onConnectingChange }: UseExtensionConnectOptions) {
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionInfo[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const startConnect = useCallback(async () => {
    onConnectingChange(true);
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      const extensions = await web3Enable('ChopDot');

      if (extensions.length === 0) {
        throw new Error('No wallet extension found. Install SubWallet, Talisman, or Polkadot.js.');
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in your wallet.');
      }

      const accountsByExtension = new Map<string, Array<{ address: string; name?: string; source?: string }>>();
      accounts.forEach(acc => {
        const source = acc.meta.source || 'unknown';
        if (!accountsByExtension.has(source)) {
          accountsByExtension.set(source, []);
        }
        accountsByExtension.get(source)!.push({
          address: acc.address,
          name: acc.meta.name,
          source: acc.meta.source,
        });
      });

      const extensionList = Array.from(accountsByExtension.entries())
        .map(([source, accs]) => ({
          name: WALLET_NAME_MAP[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1),
          source,
          accounts: accs,
        }));

      const firstExtension = extensionList[0];
      if (extensionList.length === 1 && firstExtension && firstExtension.accounts.length > 0) {
        try {
          const firstAccount = firstExtension.accounts[0];
          if (!firstAccount) {
            throw new Error('No accounts found in your wallet.');
          }
          await connectExtension(firstAccount.address);
          onConnectingChange(false);
          return;
        } catch (err) {
          console.warn('[AccountMenu] Auto-connect failed, showing selector:', err);
        }
      }

      setAvailableExtensions(extensionList);
      setShowSelector(true);
    } catch {
      onConnectingChange(false);
    }
  }, [connectExtension, onConnectingChange]);

  const selectExtension = useCallback(async (source: string) => {
    const extension = availableExtensions.find(ext => ext.source === source);
    if (!extension) return;

    setShowSelector(false);

    const firstAccount = extension.accounts[0];
    if (firstAccount) {
      try {
        await connectExtension(firstAccount.address);
      } catch {
        // handled in context
      }
      onConnectingChange(false);
      setAvailableExtensions([]);
    }
  }, [availableExtensions, connectExtension, onConnectingChange]);

  const closeSelector = useCallback(() => {
    setShowSelector(false);
    setAvailableExtensions([]);
    onConnectingChange(false);
  }, [onConnectingChange]);

  const reset = useCallback(() => {
    setShowSelector(false);
    setAvailableExtensions([]);
  }, []);

  return {
    availableExtensions,
    showSelector,
    startConnect,
    selectExtension,
    closeSelector,
    reset,
  };
}
