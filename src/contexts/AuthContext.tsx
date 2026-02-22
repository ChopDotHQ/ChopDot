/**
 * AUTHENTICATION CONTEXT
 * 
 * Manages user authentication state across the app.
 * Supports multiple auth methods:
 * - Polkadot wallet (Polkadot.js, SubWallet, Talisman)
 * - EVM wallets (MetaMask, Rainbow via WalletConnect)
 * - Email/password
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from './AccountContext';
import { getSupabase, getSupabaseConfig } from '../utils/supabase-client';
import { upsertProfile } from '../repos/profiles';
import { getAuthPersistence } from '../utils/authPersistence';
import { setErrorTrackingUser } from '../utils/errorTracking';
import { loginWithEmailAction, signUpWithEmailAction } from './authActions';

export type AuthMethod = 'polkadot' | 'metamask' | 'rainbow' | 'email' | 'guest' | 'anonymous';

export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  authMethod: AuthMethod;
  name?: string;
  createdAt: string;
  isGuest?: boolean;
}

function mapSupabaseSessionUser(sessionUser: any): User {
  const hasAnonymousProvider =
    sessionUser?.app_metadata?.provider === 'anonymous' ||
    sessionUser?.identities?.some?.((identity: any) => identity?.provider === 'anonymous');
  const isAnonymous = Boolean(sessionUser?.is_anonymous || hasAnonymousProvider);
  const email = sessionUser?.email ?? undefined;
  return {
    id: sessionUser.id,
    email,
    authMethod: isAnonymous ? 'anonymous' : 'email',
    name: email?.split('@')[0] ?? (isAnonymous ? 'Anonymous User' : undefined),
    createdAt: new Date().toISOString(),
    isGuest: isAnonymous ? true : undefined,
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (method: AuthMethod, credentials: LoginCredentials) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export type LoginCredentials = 
  | { type: 'wallet'; address: string; signature: string; chain?: 'polkadot' | 'evm' }
  | { type: 'email'; email: string; password: string }
  | { type: 'guest' };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'chopdot_user';
const AUTH_TOKEN_KEY = 'chopdot_auth_token';

const getPreferredStorage = () => {
  if (typeof window === 'undefined') return null;
  return getAuthPersistence() === 'session' ? window.sessionStorage : window.localStorage;
};

const setAuthItem = (key: string, value: string) => {
  const storage = getPreferredStorage();
  if (!storage || typeof window === 'undefined') return;
  storage.setItem(key, value);
  const other = storage === window.sessionStorage ? window.localStorage : window.sessionStorage;
  other.removeItem(key);
};

const getAuthItem = (key: string) => {
  const storage = getPreferredStorage();
  if (!storage) return null;
  return storage.getItem(key);
};

const clearAuthItem = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const account = useAccount();
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'local';
  const allowLocalGuestFallback = dataSource !== 'supabase';

  // Initial session check and subscription to Supabase auth changes
  useEffect(() => {
    const supabase = getSupabase();
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data.session || null;
          if (session?.user) {
            const mapped = mapSupabaseSessionUser(session.user);
            setUser(mapped);
            setAuthItem(AUTH_USER_KEY, JSON.stringify(mapped));
            setAuthItem(AUTH_TOKEN_KEY, session.access_token);
          } else if (allowLocalGuestFallback) {
            const storedUser = getAuthItem(AUTH_USER_KEY);
            const storedToken = getAuthItem(AUTH_TOKEN_KEY);
            if (storedUser && storedToken) {
              try {
                const parsed = JSON.parse(storedUser) as User;
                if (parsed.authMethod === 'guest') {
                  setUser(parsed);
                }
              } catch {
                // ignore malformed local guest payload
              }
            }
          }

          const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (newSession?.user) {
              const mapped = mapSupabaseSessionUser(newSession.user);
              setUser(mapped);
              setAuthItem(AUTH_USER_KEY, JSON.stringify(mapped));
              setAuthItem(AUTH_TOKEN_KEY, newSession.access_token);
            } else {
              if (allowLocalGuestFallback) {
                const storedUser = getAuthItem(AUTH_USER_KEY);
                const storedToken = getAuthItem(AUTH_TOKEN_KEY);
                if (storedUser && storedToken) {
                  try {
                    const parsed = JSON.parse(storedUser) as User;
                    if (parsed.authMethod === 'guest') {
                      setUser(parsed);
                      return;
                    }
                  } catch {
                    // ignore malformed local guest payload
                  }
                }
              }
              setUser(null);
              clearAuthItem(AUTH_USER_KEY);
              clearAuthItem(AUTH_TOKEN_KEY);
            }
          });
          unsubscribe = () => sub.subscription.unsubscribe();
        } else {
          // Fallback to local storage only when Supabase is not configured
          const storedUser = getAuthItem(AUTH_USER_KEY);
          const storedToken = getAuthItem(AUTH_TOKEN_KEY);
          if (storedUser && storedToken) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } catch {
              clearAuthItem(AUTH_USER_KEY);
              clearAuthItem(AUTH_TOKEN_KEY);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    setErrorTrackingUser(user ? { id: user.id, email: user.email } : null);
  }, [user]);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const session = data.session || null;
        if (session?.user) {
          const mapped = mapSupabaseSessionUser(session.user);
          setUser(mapped);
          setAuthItem(AUTH_USER_KEY, JSON.stringify(mapped));
          setAuthItem(AUTH_TOKEN_KEY, session.access_token);
          return;
        }
      }
      const storedUser = getAuthItem(AUTH_USER_KEY);
      const storedToken = getAuthItem(AUTH_TOKEN_KEY);
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        if (allowLocalGuestFallback || userData?.authMethod !== 'guest') {
          setUser(userData);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (method: AuthMethod, credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      let userData: User | null = null;
      if (credentials.type === 'wallet') {
        const { url: supabaseUrl, anonKey } = getSupabaseConfig();
        const supabase = getSupabase();
        if (!supabase || !supabaseUrl || !anonKey) {
          throw new Error('Supabase not configured for wallet auth');
        }

        const chain: 'polkadot' | 'evm' = credentials.chain || (method === 'polkadot' ? 'polkadot' : 'evm');

        const verifyRes = await fetch(`${supabaseUrl}/functions/v1/wallet-auth/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            address: credentials.address,
            signature: credentials.signature,
            chain,
          }),
        });

        if (!verifyRes.ok) {
          const text = await verifyRes.text();
          throw new Error(`Wallet auth failed: ${verifyRes.status} ${text}`);
        }

        const verifyData = await verifyRes.json();
        if (!verifyData?.access_token || !verifyData?.refresh_token) {
          throw new Error('Wallet auth failed: tokens not returned');
        }

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: verifyData.access_token,
          refresh_token: verifyData.refresh_token,
        });
        if (setSessionError) {
          throw setSessionError;
        }

        const { data } = await supabase.auth.getSession();
        const session = data.session || null;
        if (!session?.user) {
          throw new Error('Wallet auth failed: no session returned');
        }

        // Ensure profile row exists (non-blocking)
        try {
          await upsertProfile(supabase, session.user.id, session.user.user_metadata?.username ?? null, credentials.address);
        } catch (profileError) {
          console.warn('[auth.login] profile upsert failed:', (profileError as Error).message);
        }

        userData = {
          id: session.user.id,
          walletAddress: credentials.address,
          authMethod: method,
          name: session.user.email?.split('@')[0] || `${method.charAt(0).toUpperCase() + method.slice(1)} User`,
          createdAt: new Date().toISOString(),
        };
      } else {
        const supabase = getSupabase();
        if (!supabase) {
          throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.');
        }
        const { email, password } = credentials as { type: 'email'; email: string; password: string };
        const result = await loginWithEmailAction(supabase as any, email, password);
        userData = result.user;

        // Ensure profile row exists (non-blocking)
        try {
          await upsertProfile(supabase, result.sessionUser.id, result.sessionUser.user_metadata?.username ?? null);
        } catch (e) {
          console.warn('[auth.login] profile upsert failed:', (e as Error).message);
        }
      }
      
      // Store user and token (keep legacy keys for now)
      if (!userData) {
        throw new Error('Authentication failed: missing user data');
      }

      setAuthItem(AUTH_USER_KEY, JSON.stringify(userData));
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? `mock_jwt_token_${Date.now()}`;
        setAuthItem(AUTH_TOKEN_KEY, token);
      } else {
        setAuthItem(AUTH_TOKEN_KEY, `mock_jwt_token_${Date.now()}`);
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.');
      }
      const result = await signUpWithEmailAction(supabase as any, email, password, username);
      if (result?.user) {
        setUser(result.user);
        setAuthItem(AUTH_USER_KEY, JSON.stringify(result.user));
        setAuthItem(AUTH_TOKEN_KEY, result.accessToken);

        // Ensure profile row exists (non-blocking)
        try {
          await upsertProfile(supabase, result.sessionUser.id, username ?? null);
        } catch (e) {
          console.warn('[auth.signUp] profile upsert failed:', (e as Error).message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Disconnect all wallets if connected
      if (account.status === 'connected') {
        console.log('[AuthContext] Disconnecting wallet on logout:', account.connector);
        
        // Handle WalletConnect disconnection (requires async disconnect call)
        if (account.connector === 'walletconnect') {
          try {
            // Dynamically import to avoid loading WalletConnect packages at module init
            const walletConnectModule = await import('../services/chain/walletconnect');
            await walletConnectModule.disconnectWalletConnect();
            console.log('[AuthContext] WalletConnect disconnected on logout');
          } catch (err) {
            console.warn('[AuthContext] WalletConnect disconnect failed (continuing):', err);
          }
        }
        
        // Disconnect account state (clears local storage and resets state)
        // This handles extension wallets and cleans up WalletConnect state
        account.disconnect();
        console.log('[AuthContext] All wallet connections cleared');
      }
      
      // Sign out from Supabase
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
        console.log('[AuthContext] Supabase session cleared');
      }
      
      // Clear local storage
      clearAuthItem(AUTH_USER_KEY);
      clearAuthItem(AUTH_TOKEN_KEY);
      
      // Clear user state
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = async () => {
    try {
      setIsLoading(true);

      const useSupabaseAnonymous =
        (import.meta.env.VITE_DATA_SOURCE || 'local') === 'supabase';
      const supabase = getSupabase();

      if (useSupabaseAnonymous && supabase) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;

        const session = data.session;
        if (!session?.user) {
          throw new Error('Anonymous login failed: no session');
        }

        const anonUser: User = {
          id: session.user.id,
          authMethod: 'anonymous',
          name: 'Anonymous User',
          createdAt: new Date().toISOString(),
          isGuest: true,
        };

        setAuthItem(AUTH_USER_KEY, JSON.stringify(anonUser));
        setAuthItem(AUTH_TOKEN_KEY, session.access_token);
        setUser(anonUser);
        return;
      }

      // Local fallback guest session (non-Supabase mode)
      const guestUser: User = {
        id: `guest_${Date.now()}`,
        authMethod: 'guest',
        name: 'Guest User',
        createdAt: new Date().toISOString(),
        isGuest: true,
      };

      setAuthItem(AUTH_USER_KEY, JSON.stringify(guestUser));
      setAuthItem(AUTH_TOKEN_KEY, 'guest_session');
      setUser(guestUser);
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  // Auto-login when a linked wallet is detected
  useEffect(() => {
    if (account.linkedUserId && account.status === 'connected' && account.address && !user && !isLoading) {
      console.log('[AuthContext] Linked wallet detected, triggering auto-login...');
      
      // Trigger wallet auth flow automatically
      (async () => {
        try {
          const walletAddress = account.address;
          if (!walletAddress) {
            console.warn('[AuthContext] No wallet address available for auto-login');
            return;
          }

          const { url: supabaseUrl, anonKey } = getSupabaseConfig();
          
          if (!supabaseUrl || !anonKey) {
            console.warn('[AuthContext] Supabase not configured for auto-login');
            return;
          }

          // Request nonce
          const nonceRes = await fetch(`${supabaseUrl}/functions/v1/wallet-auth/nonce`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ address: walletAddress }),
          });

          if (!nonceRes.ok) {
            throw new Error('Failed to request nonce');
          }

          const { nonce } = await nonceRes.json();
          const message = `Sign this message to login to ChopDot.\nNonce: ${nonce}`;

          // Request signature from wallet
          let signature: string;
          
          if (account.connector === 'extension') {
            const { web3FromAddress } = await import('@polkadot/extension-dapp');
            const injector = await web3FromAddress(walletAddress);
            const signRaw = injector?.signer?.signRaw;
            
            if (!signRaw) {
              throw new Error('Wallet does not support signing');
            }

            const result = await signRaw({
              address: walletAddress,
              data: message,
              type: 'bytes',
            });
            
            signature = result.signature;
          } else if (account.connector === 'walletconnect') {
            const walletConnectModule = await import('../services/chain/walletconnect');
            const result = await walletConnectModule.signMessage(walletAddress, message);
            signature = result.signature;
          } else {
            throw new Error('Unsupported wallet connector');
          }

          // Login with the signature
          await login('polkadot', {
            type: 'wallet',
            address: walletAddress,
            signature,
            chain: 'polkadot',
          });

          console.log('[AuthContext] ✓ Auto-login successful!');
        } catch (error) {
          console.error('[AuthContext] Auto-login failed:', error);
          // Don't throw - allow manual login
        }
      })();
    }
  }, [account.linkedUserId, account.status, account.address, account.connector, user, isLoading, login]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signUp,
        loginAsGuest,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
