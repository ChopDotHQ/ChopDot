import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAccount } from './AccountContext';
import { getSupabase } from '../utils/supabase-client';
import { setErrorTrackingUser } from '../utils/errorTracking';
import { loginWithEmailAction, signUpWithEmailAction } from './authActions';
import { upsertProfile } from '../repos/profiles';
import {
  initSession, checkSession,
  setAuthItem, clearAuthItem,
  AUTH_USER_KEY, AUTH_TOKEN_KEY,
} from '../services/auth/session-manager';
import { loginWithWallet, loginWithEthereumWeb3 } from '../services/auth/wallet-login';
import { loginWithOAuthRedirect } from '../services/auth/oauth-login';
import { loginAsGuestAction } from '../services/auth/guest-login';
import { buildWalletAuthMessage, requestWalletNonce } from '../utils/walletAuth';
import type { User, AuthMethod, OAuthProvider, LoginCredentials } from '../types/auth';

export type { User, AuthMethod, OAuthProvider, LoginCredentials };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (method: AuthMethod, credentials: LoginCredentials) => Promise<void>;
  loginWithEthereum: () => Promise<void>;
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const account = useAccount();
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'local';
  const allowLocalGuestFallback = dataSource !== 'supabase';

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const result = await initSession(getSupabase(), allowLocalGuestFallback, setUser);
        unsubscribe = result.unsubscribe;
      } finally {
        setIsLoading(false);
      }
    })();
    return () => { unsubscribe?.(); };
  }, []);

  useEffect(() => {
    setErrorTrackingUser(user ? { id: user.id, email: user.email } : null);
  }, [user]);

  const login = useCallback(async (method: AuthMethod, credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      let userData: User | null = null;

      if (credentials.type === 'wallet') {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not configured for wallet auth');
        const result = await loginWithWallet(supabase, method, credentials.address, credentials.signature, credentials.chain);
        userData = result.userData;
      } else {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase is not configured.');
        const { email, password } = credentials as { type: 'email'; email: string; password: string };
        const result = await loginWithEmailAction(supabase as any, email, password);
        userData = result.user;
        try {
          await upsertProfile(supabase, result.sessionUser.id, result.sessionUser.user_metadata?.username ?? null);
        } catch (e) {
          console.warn('[auth.login] profile upsert failed:', (e as Error).message);
        }
      }

      if (!userData) throw new Error('Authentication failed: missing user data');

      setAuthItem(AUTH_USER_KEY, JSON.stringify(userData));
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          setAuthItem(AUTH_TOKEN_KEY, data.session.access_token);
        } else {
          console.warn('[auth.login] no session token — authenticated features may be limited');
        }
      }
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase is not configured.');
      const result = await signUpWithEmailAction(supabase as any, email, password, username);
      if (result?.user) {
        setUser(result.user);
        setAuthItem(AUTH_USER_KEY, JSON.stringify(result.user));
        setAuthItem(AUTH_TOKEN_KEY, result.accessToken);
        try {
          await upsertProfile(supabase, result.sessionUser.id, username ?? null);
        } catch (e) {
          console.warn('[auth.signUp] profile upsert failed:', (e as Error).message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      if (account.status === 'connected') {
        if (account.connector === 'walletconnect') {
          try {
            const walletConnectModule = await import('../services/chain/walletconnect');
            await walletConnectModule.disconnectWalletConnect();
          } catch (err) {
            console.warn('[AuthContext] WalletConnect disconnect failed (continuing):', err);
          }
        }
        account.disconnect();
      }
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
      clearAuthItem(AUTH_USER_KEY);
      clearAuthItem(AUTH_TOKEN_KEY);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  const loginAsGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      const useSupabaseAnonymous = (import.meta.env.VITE_DATA_SOURCE || 'local') === 'supabase';
      await loginAsGuestAction(getSupabase(), useSupabaseAnonymous, setUser);
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithEthereum = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase is not configured for Web3 auth');
      const { userData, accessToken } = await loginWithEthereumWeb3(supabase);
      setAuthItem(AUTH_USER_KEY, JSON.stringify(userData));
      setAuthItem(AUTH_TOKEN_KEY, accessToken);
      setUser(userData);
    } catch (error) {
      console.error('Ethereum login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithOAuth = useCallback(async (provider: OAuthProvider) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured for OAuth');
    await loginWithOAuthRedirect(supabase, provider);
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      await checkSession(getSupabase(), allowLocalGuestFallback, setUser);
    } finally {
      setIsLoading(false);
    }
  }, [allowLocalGuestFallback]);

  // Auto-login when a linked wallet is detected
  useEffect(() => {
    if (!account.linkedUserId || account.status !== 'connected' || !account.address || user || isLoading) return;

    (async () => {
      try {
        const walletAddress = account.address;
        if (!walletAddress) return;

        if (!getSupabase()) return;

        const nonce = await requestWalletNonce(walletAddress);
        const message = buildWalletAuthMessage(nonce, { chain: 'polkadot' });

        let signature: string;
        if (account.connector === 'extension') {
          const { web3FromAddress } = await import('@polkadot/extension-dapp');
          const { stringToHex } = await import('@polkadot/util');
          const injector = await web3FromAddress(walletAddress);
          const signRaw = injector?.signer?.signRaw;
          if (!signRaw) throw new Error('Wallet does not support signing');
          const result = await signRaw({ address: walletAddress, data: stringToHex(message), type: 'bytes' });
          signature = result.signature;
        } else if (account.connector === 'walletconnect') {
          const walletConnectModule = await import('../services/chain/walletconnect');
          const result = await walletConnectModule.signMessage(walletAddress, message);
          signature = result.signature;
        } else {
          throw new Error('Unsupported wallet connector');
        }

        await login('polkadot', { type: 'wallet', address: walletAddress, signature, chain: 'polkadot' });
        console.log('[AuthContext] Auto-login successful');
      } catch (error) {
        console.error('[AuthContext] Auto-login failed:', error);
      }
    })();
  }, [account.linkedUserId, account.status, account.address, account.connector, user, isLoading, login]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, loginWithEthereum, loginWithOAuth, signUp, loginAsGuest, logout, refreshUser }}
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
