import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';

export type WalletAccount = { address: string; meta?: { name?: string; source?: string } };

interface WalletContextValue {
  accounts: WalletAccount[];
  selected?: WalletAccount;
  isConnected: boolean;
  selectAccount: (address: string) => void;
  signer?: unknown;
}

const WalletContext = createContext<WalletContextValue>({ accounts: [], isConnected: false, selectAccount: () => {} });

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | undefined>(localStorage.getItem('selectedAddr') || undefined);
  const [signer, setSigner] = useState<unknown>();

  useEffect(() => {
    (async () => {
      try {
        await web3Enable('ChopDot');
        const accs = await web3Accounts();
        setAccounts(accs as unknown as WalletAccount[]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[WalletProvider] wallet discovery failed:', (e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedAddr) { setSigner(undefined); return; }
      const acc = accounts.find(a => a.address === selectedAddr);
      if (!acc?.meta?.source) { setSigner(undefined); return; }
      try {
        const injector = await web3FromSource(acc.meta.source);
        setSigner(injector?.signer);
      } catch (e) {
        setSigner(undefined);
      }
    })();
  }, [accounts, selectedAddr]);

  const selectAccount = useCallback((address: string) => {
    setSelectedAddr(address);
    localStorage.setItem('selectedAddr', address);
  }, []);

  const selected = useMemo(() => accounts.find(a => a.address === selectedAddr), [accounts, selectedAddr]);

  const value = useMemo<WalletContextValue>(() => ({
    accounts,
    selected,
    isConnected: !!selected,
    selectAccount,
    signer,
  }), [accounts, selected, selectAccount, signer]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => useContext(WalletContext);


