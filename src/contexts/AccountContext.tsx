/**
 * Account Context - Unified wallet connection and balance management
 * 
 * Manages:
 * - Wallet connection (browser extensions + WalletConnect/Nova)
 * - Account address and network detection
 * - Live balance polling
 * - Auto-reconnect on page load
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { normalizeToPolkadot } from '../services/chain/address';
import { getChain } from '../services/chain';
import { getSupabase } from '../utils/supabase-client';
import { linkWalletToUser, findVerifiedWalletLink } from '../repos/walletLinks';
import { getWalletCapabilities, normalizeWalletSource, type WalletCapabilities } from '../services/wallet/capabilities';
import type { Injected, InjectedWindow } from '@polkadot/extension-inject/types';
// Dynamic imports for WalletConnect to avoid "require is not defined" error
// These are loaded only when needed, not at module initialization

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
  balanceUsdc: string | null; // raw assets balance
  balanceUsdcHuman: string | null; // USDC string (6 decimals)
  walletName?: string; // e.g., "Polkadot.js", "Nova Wallet", "SubWallet"
  walletSource?: string | null;
  error?: string | null;
  linkedUserId?: string | null; // Set when wallet is linked to an existing account (but user not logged in)
}

interface AccountContextType extends AccountState {
  capabilities: WalletCapabilities;
  connect: (wallet: any) => Promise<void>;
  connectExtension: (selectedAddress?: string, isAutoReconnect?: boolean, preferredSource?: string) => Promise<void>;
  connectWalletConnect: () => Promise<string>; // Returns URI for QR code
  syncWalletConnectSession: () => Promise<void>; // Sync with existing WalletConnect session
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  canAfford: (amountDot: string) => boolean;
  requireAccountOrToast: (showToast: (message: string, type?: 'success' | 'error' | 'info') => void) => boolean;
  triggerWalletAuth: () => Promise<void>; // Trigger wallet authentication for linked wallet
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'account.connector';
const WALLET_SOURCE_STORAGE_KEY = 'account.walletSource';
const BALANCE_POLL_INTERVAL = 25000; // 25 seconds
const FEE_BUFFER_DOT = '0.005'; // 0.005 DOT buffer for fees

// Helper: Link wallet to authenticated user OR detect if wallet is already linked
const linkWalletIfAuthenticated = async (
  address: string,
  provider: string,
  chainType: 'polkadot' | 'evm' = 'polkadot',
  onLinkedAccountFound?: (userId: string) => void
): Promise<{ linkedUserId?: string }> => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.log('[Account] Supabase not configured, skipping wallet link');
      return {};
    }

    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    
    if (userId) {
      // User is already authenticated, just link the wallet
      await linkWalletToUser(supabase, userId, chainType, address, provider);
      console.log('[Account] Wallet linked to user:', { userId, chain: chainType, address, provider });
      return {};
    }

    // User is not authenticated - check if this wallet is linked to an existing account
    console.log('[Account] Checking for existing wallet link:', { chain: chainType, address });
    const linkedUserId = await findVerifiedWalletLink(supabase, chainType, address);
    
    if (linkedUserId) {
      console.log('[Account] ✓ Found existing wallet link!', { userId: linkedUserId });
      onLinkedAccountFound?.(linkedUserId);
      return { linkedUserId };
    }

    console.log('[Account] No existing wallet link found');
    return {};
  } catch (error) {
    // Non-fatal - log but don't block wallet connection
    console.warn('[Account] Failed to link wallet (non-blocking):', error);
    return {};
  }
};

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

const fmtUnits = (value: string, decimals: number): string => {
  if (!value) return '0';
  const s = value.replace(/^0+(?=\d)/, '');
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
    balanceUsdc: null,
    balanceUsdcHuman: null,
    walletName: undefined,
    walletSource: null,
    error: null,
    linkedUserId: null,
  });

  // Track if user has explicitly logged in (vs auto-reconnect)
  // This prevents balance fetching from auto-reconnect on login screen
  const [hasExplicitlyLoggedIn, setHasExplicitlyLoggedIn] = useState(false);

  // Auto-detect network from chain service
  const detectNetwork = useCallback((): AccountNetwork => 'asset-hub', []);

  // Store wallet address in localStorage and window for IPFS auth
  useEffect(() => {
    if (state.address0) {
      try {
        localStorage.setItem('account.address0', state.address0);
        (window as any).__chopdot_wallet_address = state.address0;
      } catch (error) {
        // Silent fail
      }
    } else {
      try {
        localStorage.removeItem('account.address0');
        delete (window as any).__chopdot_wallet_address;
      } catch (error) {
        // Silent fail
      }
    }
  }, [state.address0]);

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
      
      // Add timeout with retry logic
      let balancePlanck = '0';
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const chainService = await getChain();
          const balancePromise = chainService.getFreeBalance(state.address);
          const timeoutPromise = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Balance fetch timeout')), 30000) // 30 seconds - allow time for RPC connection
          );
          
          balancePlanck = await Promise.race([balancePromise, timeoutPromise]);
          break; // Success, exit retry loop
        } catch (error) {
          attempts++;
          console.warn(`[Account] Balance fetch attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            // All attempts failed - throw error
            throw error;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      const balanceHuman = fmtPlanckToDot(balancePlanck);
      let balanceUsdc = '0';
      let balanceUsdcHuman = '0';
      try {
        const chainService = await getChain();
        balanceUsdc = await chainService.getUsdcBalance(state.address);
        balanceUsdcHuman = fmtUnits(balanceUsdc, 6);
      } catch (usdcError) {
        console.warn('[Account] USDC balance refresh skipped:', usdcError);
      }
      const network = detectNetwork();

      console.log('[Account] Balance refreshed:', { balanceHuman, balanceUsdcHuman, network, attempts });

      setState(prev => ({
        ...prev,
        balanceFree: balancePlanck,
        balanceHuman,
        balanceUsdc,
        balanceUsdcHuman,
        network,
      }));
    } catch (error: any) {
      console.error('[Account] Balance refresh error after retries:', error);
      // Don't throw - just log the error and keep current balance
      // This prevents UI from breaking if RPC is temporarily unavailable
      console.warn('[Account] Keeping previous balance due to fetch failure');
    }
  }, [state.address, state.status, detectNetwork]);

  // Connect via browser extension
  const connectExtension = useCallback(async (selectedAddress?: string, isAutoReconnect: boolean = false, preferredSource?: string) => {
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      const normalizedPreferredSource = normalizeWalletSource(preferredSource);
      let enabledExtension: Pick<Injected, 'accounts'> | null = null;
      let accounts: Array<{ address: string; meta?: { source?: string; name?: string } }> = [];

      if (normalizedPreferredSource && typeof window !== 'undefined' && 'injectedWeb3' in (window as unknown as InjectedWindow)) {
        const injectedWindow = window as unknown as InjectedWindow;
        const selectedProvider = injectedWindow.injectedWeb3?.[normalizedPreferredSource];
        if (selectedProvider) {
          enabledExtension = selectedProvider.connect
            ? await selectedProvider.connect('ChopDot')
            : selectedProvider.enable
              ? await selectedProvider.enable('ChopDot')
              : null;

          accounts = enabledExtension
            ? (await enabledExtension.accounts.get()).map((account) => ({
                address: account.address,
                meta: {
                  source: normalizedPreferredSource,
                  name: account.name,
                },
              }))
            : [];
        }
      }

      if (!enabledExtension) {
        const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');

        // Request permission
        const extensions = await web3Enable('ChopDot');
        if (extensions.length === 0) {
          throw new Error('No wallet extension found. Install SubWallet, Talisman, or Polkadot.js.');
        }

        accounts = await web3Accounts({
          extensions: normalizedPreferredSource ? [normalizedPreferredSource] : undefined,
        });
      }

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
      const walletSource = normalizeWalletSource(account.meta?.source);
      
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
      const walletName =
        walletNameMap[account.meta?.source?.toLowerCase() || ''] ||
        account.meta?.source ||
        normalizedPreferredSource ||
        'Extension';

      const network = detectNetwork();
      const balancePlanck = '0';
      const balanceHuman = '0';
      const balanceUsdc = '0';
      const balanceUsdcHuman = '0';

      // Save connector preference before background work begins.
      localStorage.setItem(STORAGE_KEY, 'extension');
      if (walletSource) {
        localStorage.setItem(WALLET_SOURCE_STORAGE_KEY, walletSource);
      } else {
        localStorage.removeItem(WALLET_SOURCE_STORAGE_KEY);
      }

      if (!isAutoReconnect) {
        setHasExplicitlyLoggedIn(true);
      }

      // Mark the wallet connected immediately. Balance and chain initialization
      // happen in the background so a slow RPC does not block extension login.
      setState({
        status: 'connected',
        connector: 'extension',
        address,
        address0,
        network,
        balanceFree: balancePlanck,
        balanceHuman,
        balanceUsdc,
        balanceUsdcHuman,
        walletName,
        walletSource,
        error: null,
        linkedUserId: null,
      });

      // Fetch balance in background (don't block connection)
      // This allows login to complete immediately even if RPC is slow
      // Skip if auto-reconnect to prevent WebSocket attempts on login screen
      if (!isAutoReconnect) {
        (async () => {
        try {
          const chainService = await getChain();
          chainService.setChain('assethub'); // Default to Asset Hub
          let attempts = 0;
          const maxAttempts = 2;
          
          while (attempts < maxAttempts) {
            try {
              const balancePromise = chainService.getFreeBalance(address);
              const timeoutPromise = new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error('Balance fetch timeout')), 30000) // 30 seconds
              );
              
              const fetchedBalance = await Promise.race([balancePromise, timeoutPromise]);
              const fetchedBalanceHuman = fmtPlanckToDot(fetchedBalance);
              let fetchedUsdcBalance = '0';
              let fetchedUsdcHuman = '0';
              try {
                fetchedUsdcBalance = await chainService.getUsdcBalance(address);
                fetchedUsdcHuman = fmtUnits(fetchedUsdcBalance, 6);
              } catch (usdcError) {
                console.warn('[Account] Initial USDC balance fetch failed, keeping zero:', usdcError);
              }
              
              // Update state if still connected to same address
              setState((prev) => {
                if (prev.address === address && prev.status === 'connected') {
                  return {
                    ...prev,
                    balanceHuman: fetchedBalanceHuman,
                    balanceFree: fetchedBalance,
                    balanceUsdc: fetchedUsdcBalance,
                    balanceUsdcHuman: fetchedUsdcHuman,
                  };
                }
                return prev;
              });
              break; // Success
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) {
                console.warn('[Account] Initial balance fetch failed, will retry via polling:', error);
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          console.warn('[Account] Background balance fetch failed:', error);
          // Polling will retry automatically
        }
      })();
      }

      // Link wallet to user if authenticated OR detect linked account (non-blocking)
      if (!isAutoReconnect) {
        linkWalletIfAuthenticated(address, walletName, 'polkadot', (userId) => {
          setState(prev => ({ ...prev, linkedUserId: userId }));
        }).catch(console.warn);
      }
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

  // Sync with existing WalletConnect session (for when session is created outside AccountContext)
  const syncWalletConnectSession = useCallback(async (): Promise<void> => {
    try {
      const walletConnectModule = await import('../services/chain/walletconnect');
      const session = walletConnectModule.getWalletConnectSession();
      
      if (session?.namespaces?.polkadot?.accounts && session.namespaces.polkadot.accounts.length > 0) {
        const accounts = session.namespaces.polkadot.accounts;
        const address = accounts[0]?.split(':').slice(2).join(':');
        if (address) {
          const address0 = normalizeToPolkadot(address);
          
          // Save connector preference
          localStorage.setItem(STORAGE_KEY, 'walletconnect');
          
          // Mark as explicitly logged in (not auto-reconnect)
          setHasExplicitlyLoggedIn(true);
          
          // Set connected state
          const network = detectNetwork();
          setState({
            status: 'connected',
            connector: 'walletconnect',
            address,
            address0,
            network,
            balanceFree: null, // Will be updated when balance check completes
            balanceHuman: null,
            balanceUsdc: null,
            balanceUsdcHuman: null,
            walletName: 'WalletConnect',
            walletSource: 'walletconnect',
            error: null,
          });
          
          // Try to get initial balance (non-blocking)
          const chainService = await getChain();
          chainService.setChain('assethub');
          chainService.getFreeBalance(address)
            .then(balancePlanck => {
              const balanceHuman = fmtPlanckToDot(balancePlanck);
              chainService.getUsdcBalance(address)
                .then((balanceUsdc: string) => {
                  const balanceUsdcHuman = fmtUnits(balanceUsdc, 6);
                  setState(prev => {
                    if (prev.status === 'connected' && prev.address0 === address0) {
                      return {
                        ...prev,
                        balanceFree: balancePlanck,
                        balanceHuman,
                        balanceUsdc,
                        balanceUsdcHuman,
                      };
                    }
                    return prev;
                  });
                })
                .catch(() => {
                  setState(prev => {
                    if (prev.status === 'connected' && prev.address0 === address0) {
                      return {
                        ...prev,
                        balanceFree: balancePlanck,
                        balanceHuman,
                      };
                    }
                    return prev;
                  });
                });
            })
            .catch((error) => {
              console.warn('[Account] Balance check failed (non-blocking):', error?.message || error);
            });
          
          // Link wallet to user if authenticated OR detect linked account (non-blocking)
          linkWalletIfAuthenticated(address, 'WalletConnect', 'polkadot', (userId) => {
            setState(prev => ({ ...prev, linkedUserId: userId }));
          }).catch(console.warn);
        }
      }
    } catch (error) {
      console.warn('[Account] Failed to sync WalletConnect session:', error);
    }
  }, [detectNetwork]);

  // Connect via WalletConnect (Nova Wallet)
  // Returns URI for QR code display - connection completes asynchronously
  const connectWalletConnect = useCallback(async (): Promise<string> => {
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      // Dynamic import to avoid loading WalletConnect packages at module init
      const walletConnectModule = await import('../services/chain/walletconnect');
      const { uri, onConnect } = await walletConnectModule.connectNovaWallet();
      
      // Wait for connection asynchronously (handled by AccountMenu showing QR)
      onConnect
        .then(async ({ address }) => {
          const address0 = normalizeToPolkadot(address);
          const walletName = 'Nova Wallet';

          // Save connector preference
          localStorage.setItem(STORAGE_KEY, 'walletconnect');
          localStorage.setItem(WALLET_SOURCE_STORAGE_KEY, 'walletconnect');
          
          // Mark as explicitly logged in (not auto-reconnect)
          setHasExplicitlyLoggedIn(true);

          // Set connected state immediately (don't wait for balance)
          // This allows login to proceed even if WebSocket connections are blocked
          const network = detectNetwork();
          setState({
            status: 'connected',
            connector: 'walletconnect',
            address,
            address0,
            network,
            balanceFree: null, // Will be updated when balance check completes
            balanceHuman: null,
            balanceUsdc: null,
            balanceUsdcHuman: null,
            walletName,
            walletSource: 'walletconnect',
            error: null,
          });

          // Try to get initial balance (non-blocking)
          // If WebSockets are blocked, this will fail but login can still proceed
          const chainService = await getChain();
          chainService.setChain('assethub'); // Default to Asset Hub
          chainService.getFreeBalance(address)
            .then(balancePlanck => {
              const balanceHuman = fmtPlanckToDot(balancePlanck);
              chainService.getUsdcBalance(address)
                .then((balanceUsdc: string) => {
                  const balanceUsdcHuman = fmtUnits(balanceUsdc, 6);
                  setState(prev => {
                    if (prev.status === 'connected' && prev.address0 === address0) {
                      return {
                        ...prev,
                        balanceFree: balancePlanck,
                        balanceHuman,
                        balanceUsdc,
                        balanceUsdcHuman,
                      };
                    }
                    return prev;
                  });
                })
                .catch(() => {
                  setState(prev => {
                    if (prev.status === 'connected' && prev.address0 === address0) {
                      return {
                        ...prev,
                        balanceFree: balancePlanck,
                        balanceHuman,
                      };
                    }
                    return prev;
                  });
                });
            })
            .catch((error) => {
              // Log but don't block - user can still login
              console.warn('[Account] Balance check failed (non-blocking):', error?.message || error);
              // Optionally show a warning toast, but don't prevent login
            });

          // Link wallet to user if authenticated OR detect linked account (non-blocking)
          linkWalletIfAuthenticated(address, walletName, 'polkadot', (userId) => {
            setState(prev => ({ ...prev, linkedUserId: userId }));
          }).catch(console.warn);
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
      // Dynamic import to avoid loading WalletConnect packages at module init
      // Fire and forget - don't await to keep disconnect synchronous
      import('../services/chain/walletconnect')
        .then(walletConnectModule => walletConnectModule.disconnectWalletConnect())
        .catch(console.error);
    }
    
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WALLET_SOURCE_STORAGE_KEY);
    
    // Reset explicit login flag
    setHasExplicitlyLoggedIn(false);
    
    setState({
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
        // Dynamic import to avoid loading WalletConnect packages at module init
        import('../services/chain/walletconnect')
          .then(async (walletConnectModule) => {
            // Initialize WalletConnect first - this restores sessions from IndexedDB
            // SignClient.init() automatically restores persisted sessions
            await walletConnectModule.initWalletConnect();
            
            // Now check if WalletConnect session exists (after initialization)
            const session = walletConnectModule.getWalletConnectSession();
            if (session?.namespaces?.polkadot?.accounts && session.namespaces.polkadot.accounts.length > 0) {
              const accounts = session.namespaces.polkadot.accounts;
              const address = accounts[0]?.split(':').slice(2).join(':');
              if (address) {
                const address0 = normalizeToPolkadot(address);
                const chainService = await getChain();
                chainService.setChain('assethub');
                // Don't fetch balance on auto-reconnect - wait for explicit login
                // This prevents WebSocket connection attempts on login screen
                // Don't set hasExplicitlyLoggedIn for auto-reconnect
                // Balance polling will start only after explicit login
                setState({
                  status: 'connected',
                  connector: 'walletconnect',
                  address,
                  address0,
                  network: detectNetwork(),
                  balanceFree: null,
                  balanceHuman: null,
                  balanceUsdc: null,
                  balanceUsdcHuman: null,
                  walletName: 'WalletConnect',
                  walletSource: 'walletconnect',
                  error: null,
                });
                console.log('[Account] Auto-reconnected to WalletConnect session:', address.slice(0, 10) + '...');
              }
            } else {
              console.log('[Account] No active WalletConnect session found on auto-reconnect');
            }
          })
          .catch((error) => {
            console.warn('[Account] WalletConnect auto-reconnect failed:', error);
          });
      } else if (savedConnector === 'extension') {
        // Try to reconnect extension (silent - won't show error if user removed extension)
        // Pass isAutoReconnect=true to prevent balance fetching from auto-reconnect
        connectExtension(undefined, true).catch(() => {
          // Silent fail - user can manually connect
        });
      }
    }
  }, []); // Run once on mount

  // Balance polling - only after explicit login (not auto-reconnect)
  useEffect(() => {
    if (state.status !== 'connected') return;
    if (!hasExplicitlyLoggedIn) return; // Don't fetch balance from auto-reconnect

    // Initial fetch
    refreshBalance();

    // Set up interval
    const interval = setInterval(() => {
      refreshBalance();
    }, BALANCE_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [state.status, hasExplicitlyLoggedIn, refreshBalance]);

  const capabilities = useMemo(
    () =>
      getWalletCapabilities({
        connector: state.connector,
        status: state.status,
        walletSource: state.walletSource,
      }),
    [state.connector, state.status, state.walletSource],
  );

  // Trigger wallet authentication for a linked wallet
  const triggerWalletAuth = useCallback(async () => {
    if (state.status !== 'connected' || !state.address) {
      throw new Error('No wallet connected');
    }

    if (!state.linkedUserId) {
      throw new Error('Wallet not linked to an account');
    }

    console.log('[Account] Triggering wallet auth for linked account:', state.linkedUserId);
    
    // This will be handled by the AuthContext login flow
    // The UI should call auth.login with wallet credentials
    // For now, just log that it should happen
    return;
  }, [state.status, state.address, state.linkedUserId]);

  const value: AccountContextType = {
    ...state,
    capabilities,
    connect: async (wallet: any) => {
      if (wallet.id === 'nova') {
        await connectWalletConnect();
      } else {
        await connectExtension(wallet.id);
      }
    },
    connectExtension,
    connectWalletConnect,
    syncWalletConnectSession,
    disconnect,
    refreshBalance,
    canAfford,
    requireAccountOrToast,
    triggerWalletAuth,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextType {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
