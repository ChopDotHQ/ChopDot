/**
 * AccountContext - MVP stub (blockchain wallet removed)
 * 
 * In MVP, there is no wallet connection. This stub provides a compatible
 * interface so existing code that reads account.address0 gets null.
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface AccountState {
  status: 'disconnected';
  connector: null;
  address: null;
  address0: null;
  network: 'unknown';
  balanceFree: null;
  balanceHuman: null;
  balanceUsdc: null;
  balanceUsdcHuman: null;
  walletName: undefined;
  walletSource: null;
  error: null;
  linkedUserId: null;
}

interface AccountContextType extends AccountState {
  connect: () => void;
  disconnect: () => void;
  refreshBalance: () => void;
  canAfford: () => boolean;
  requireAccountOrToast: () => boolean;
}

const DISCONNECTED_STATE: AccountState = {
  status: 'disconnected',
  connector: null,
  address: null,
  address0: null,
  network: 'unknown',
  balanceFree: null,
  balanceHuman: null,
  balanceUsdc: null,
  balanceUsdcHuman: null,
  walletName: undefined,
  walletSource: null,
  error: null,
  linkedUserId: null,
};

const AccountContext = createContext<AccountContextType>({
  ...DISCONNECTED_STATE,
  connect: () => {},
  disconnect: () => {},
  refreshBalance: () => {},
  canAfford: () => false,
  requireAccountOrToast: () => false,
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const value: AccountContextType = {
    ...DISCONNECTED_STATE,
    connect: () => {},
    disconnect: () => {},
    refreshBalance: () => {},
    canAfford: () => false,
    requireAccountOrToast: () => false,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextType {
  return useContext(AccountContext);
}
