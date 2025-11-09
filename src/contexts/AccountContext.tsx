/**
 * Account Context - Unified wallet connection and balance management
 * 
 * Manages:
 * - Wallet connection (browser extensions + WalletConnect/Nova)
 * - Account address and network detection
 * - Live balance polling
 * - Auto-reconnect on page load
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { normalizeToPolkadot } from '../services/chain/address';
import { chain } from '../services/chain';
import { connectNovaWallet, disconnectWalletConnect, getWalletConnectSession } from '../services/chain/walletconnect';

export type AccountConnector = 'extension' | 'walletconnect' | null;

export type AccountNetwork = 'polkadot' | 'asset-hub' | 'westend' | 'unknown';

export interface AccountState {
  status: 'disconnected' | 'connecting' | 'connected';
  connector: AccountConnector;
  address: string | null; // SS58 any format
  address0: string | null; // Normalized to SS58-0 (Polkadot)
  network: AccountNetwork;
  balanceFree: string | null; // planck string
  balanceHuman: string | null; // DOT string (10 decimals)
  walletName?: string; // e.g., "Polkadot.js", "Nova Wallet", "SubWallet"
  error?: string | null;
}

interface AccountContextType extends AccountState {
  connectExtension: (selectedAddress?: string) => Promise<void>;
  connectWalletConnect: () => Promise<string>; // Returns URI for QR code
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  canAfford: (amountDot: string) => boolean;
  requireAccountOrToast: (showToast: (message: string, type?: 'success' | 'error' | 'info') => void) => boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'account.connector';
const BALANCE_POLL_INTERVAL = 25000; // 25 seconds
const FEE_BUFFER_DOT = '0.005'; // 0.005 DOT buffer for fees

// Helper to format planck to DOT
const fmtPlanckToDot = (planck: string): string => {
  if (!planck) return '0';
  const decimals = 10;
  const s = planck.replace(/^0+(?=\d)/, '');
  if (s.length <= decimals) return `0.${'0'.repeat(decimals - s.length)}${s}`.replace(/\.?0+$/, '');
  const intPart = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return frac ? `${intPart}.${frac}` : intPart;
};

// Helper to convert DOT to planck
const dotToPlanck = (dot: string): string => {
  const [intPart, fracPartRaw = ''] = dot.split('.');
  const fracPart = fracPartRaw.padEnd(10, '0').slice(0, 10);
  const combined = `${intPart}${fracPart}`.replace(/^0+(?=\d)/, '');
  return combined.length ? combined : '0';
};

interface AccountProviderProps {
  children: ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  const [state, setState] = useState<AccountState>({
    status: 'disconnected',
    connector: null,
    address: null,
    address0: null,
    network: 'unknown',
    balanceFree: null,
    balanceHuman: null,
    walletName: undefined,
    error: null,
  });

  // Auto-detect network from chain service
  const detectNetwork = useCallback((): AccountNetwork => 'asset-hub', []);

  // Fetch and update balance
  const refreshBalance = useCallback(async () => {
    if (!state.address || state.status !== 'connected') {
      console.warn('[Account] Cannot refresh balance: wallet not connected', {
        hasAddress: !!state.address,
        status: state.status
      });
      throw new Error('Wallet not connected');
    }

    try {
      console.log('[Account] Refreshing balance for:', state.address);
      const balancePlanck = await chain.getFreeBalance(state.address);
      const balanceHuman = fmtPlanckToDot(balancePlanck);
      const network = detectNetwork();

      console.log('[Account] Balance refreshed:', { balanceHuman, network });

      setState(prev => ({
        ...prev,
        balanceFree: balancePlanck,
        balanceHuman,
        network,
      }));
    } catch (error: any) {
      console.error('[Account] Balance refresh error:', error);
      // Re-throw error so caller can handle it
      throw error;
    }
  }, [state.address, state.status, detectNetwork]);

  // Connect via browser extension
  const connectExtension = useCallback(async (selectedAddress?: string) => {
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      
      // Request permission
      const extensions = await web3Enable('ChopDot');
      if (extensions.length === 0) {
        throw new Error('No wallet extension found. Install SubWallet, Talisman, or Polkadot.js.');
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in your wallet.');
      }

      // Use selected address if provided, otherwise use first account
      let account = accounts[0];
      if (selectedAddress) {
        const found = accounts.find(acc => acc.address === selectedAddress);
        if (found) account = found;
      }

      if (!account) {
        throw new Error('No account found');
      }

      const address = account.address;
      const address0 = normalizeToPolkadot(address);
      
      // Map wallet name
      const walletNameMap: Record<string, string> = {
        'subwallet-js': 'SubWallet',
        'subwallet': 'SubWallet',
        'talisman': 'Talisman',
        'polkadot-js': 'Polkadot.js',
        'polkadot{.js}': 'Polkadot.js',
        'polkagate': 'PolkaGate',
        'polkagate-extension': 'PolkaGate',
        'metamask': 'MetaMask',
      };
      const walletName = walletNameMap[account.meta?.source?.toLowerCase() || ''] || account.meta?.source || extensions[0]?.name || 'Extension';

      // Get initial balance
      chain.setChain('assethub'); // Default to Asset Hub
      const balancePlanck = await chain.getFreeBalance(address);
      const balanceHuman = fmtPlanckToDot(balancePlanck);
      const network = detectNetwork();

      // Save connector preference
      localStorage.setItem(STORAGE_KEY, 'extension');

      setState({
        status: 'connected',
        connector: 'extension',
        address,
        address0,
        network,
        balanceFree: balancePlanck,
        balanceHuman,
        walletName,
        error: null,
      });
    } catch (error: any) {
      console.error('[Account] Extension connection error:', error);
      setState(prev => ({
        ...prev,
        status: 'disconnected',
        error: error?.message || 'Failed to connect extension',
      }));
      throw error;
    }
  }, [detectNetwork]);

  // Connect via WalletConnect (Nova Wallet)
  // Returns URI for QR code display - connection completes asynchronously
  const connectWalletConnect = useCallback(async (): Promise<string> => {
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      const { uri, onConnect } = await connectNovaWallet();
      
      // Wait for connection asynchronously (handled by AccountMenu showing QR)
      onConnect
        .then(({ address }) => {
          const address0 = normalizeToPolkadot(address);
          const walletName = 'Nova Wallet';

          // Get initial balance
          chain.setChain('assethub'); // Default to Asset Hub
          chain.getFreeBalance(address)
            .then(balancePlanck => {
              const balanceHuman = fmtPlanckToDot(balancePlanck);
              const network = detectNetwork();

              // Save connector preference
              localStorage.setItem(STORAGE_KEY, 'walletconnect');

              setState({
                status: 'connected',
                connector: 'walletconnect',
                address,
                address0,
                network,
                balanceFree: balancePlanck,
                balanceHuman,
                walletName,
                error: null,
              });
            })
            .catch(console.error);
        })
        .catch((error: any) => {
          console.error('[Account] WalletConnect connection error:', error);
          setState(prev => ({
            ...prev,
            status: 'disconnected',
            error: error?.message || 'Failed to connect Nova Wallet',
          }));
        });

      return uri; // Return URI for QR code display
    } catch (error: any) {
      console.error('[Account] WalletConnect setup error:', error);
      setState(prev => ({
        ...prev,
        status: 'disconnected',
        error: error?.message || 'Failed to setup Nova Wallet connection',
      }));
      throw error;
    }
  }, [detectNetwork]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (state.connector === 'walletconnect') {
      disconnectWalletConnect().catch(console.error);
    }
    
    localStorage.removeItem(STORAGE_KEY);
    
    setState({
      status: 'disconnected',
      connector: null,
      address: null,
      address0: null,
      network: 'unknown',
      balanceFree: null,
      balanceHuman: null,
      walletName: undefined,
      error: null,
    });
  }, [state.connector]);

  // Helper: Check if user can afford amount
  const canAfford = useCallback((amountDot: string): boolean => {
    if (!state.balanceFree || state.status !== 'connected') return false;
    
    const amountPlanck = dotToPlanck(amountDot);
    const feeBufferPlanck = dotToPlanck(FEE_BUFFER_DOT);
    const totalNeeded = BigInt(amountPlanck) + BigInt(feeBufferPlanck);
    const balance = BigInt(state.balanceFree);
    
    return balance >= totalNeeded;
  }, [state.balanceFree, state.status]);

  // Helper: Require account or show toast
  const requireAccountOrToast = useCallback((showToast: (message: string, type?: 'success' | 'error' | 'info') => void): boolean => {
    if (state.status !== 'connected') {
      showToast('Please connect a wallet first', 'error');
      return false;
    }
    return true;
  }, [state.status]);

  // Auto-reconnect on mount
  useEffect(() => {
    const savedConnector = localStorage.getItem(STORAGE_KEY) as AccountConnector;
    
    if (savedConnector && (savedConnector === 'extension' || savedConnector === 'walletconnect')) {
      // Try to auto-reconnect
      if (savedConnector === 'walletconnect') {
        // Check if WalletConnect session still exists
        const session = getWalletConnectSession();
        if (session?.namespaces?.polkadot?.accounts && session.namespaces.polkadot.accounts.length > 0) {
          const accounts = session.namespaces.polkadot.accounts;
          const address = accounts[0]?.split(':').slice(2).join(':');
          if (address) {
            const address0 = normalizeToPolkadot(address);
            chain.setChain('assethub');
            chain.getFreeBalance(address)
              .then(balancePlanck => {
                const balanceHuman = fmtPlanckToDot(balancePlanck);
                setState({
                  status: 'connected',
                  connector: 'walletconnect',
                  address,
                  address0,
                  network: detectNetwork(),
                  balanceFree: balancePlanck,
                  balanceHuman,
                  walletName: 'Nova Wallet',
                  error: null,
                });
              })
              .catch(console.error);
          }
        }
      } else if (savedConnector === 'extension') {
        // Try to reconnect extension (silent - won't show error if user removed extension)
        connectExtension().catch(() => {
          // Silent fail - user can manually connect
        });
      }
    }
  }, []); // Run once on mount

  // Balance polling
  useEffect(() => {
    if (state.status !== 'connected') return;

    // Initial fetch
    refreshBalance();

    // Set up interval
    const interval = setInterval(() => {
      refreshBalance();
    }, BALANCE_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [state.status, refreshBalance]);

  const value: AccountContextType = {
    ...state,
    connectExtension,
    connectWalletConnect,
    disconnect,
    refreshBalance,
    canAfford,
    requireAccountOrToast,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextType {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
}
