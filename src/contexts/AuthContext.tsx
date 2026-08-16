import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSupabase } from '../utils/supabase-client';
import { setErrorTrackingUser } from '../utils/errorTracking';
import { loginWithEmailAction, signUpWithEmailAction } from './authActions';
import { upsertProfile } from '../repos/profiles';
import {
  initSession, checkSession,
  setAuthItem, clearAuthItem,
  AUTH_USER_KEY, AUTH_TOKEN_KEY,
} from '../services/auth/session-manager';
import { loginWithOAuthRedirect } from '../services/auth/oauth-login';
import { loginAsGuestAction } from '../services/auth/guest-login';
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
  const useSupabaseAnonymousGuest = import.meta.env.VITE_ENABLE_SUPABASE_ANON_GUEST_LOGIN === '1';
  const allowLocalGuestFallback = !useSupabaseAnonymousGuest;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const result = await initSession(getSupabase(), allowLocalGuestFallback, setUser);
        unsubscribe = result.unsubscribe;
      } catch (error) {
        console.error('[AuthContext] Session init failed:', error);
      } finally {
        setIsLoading(false);
      }
    })();
    return () => { unsubscribe?.(); };
  }, []);

  useEffect(() => {
    setErrorTrackingUser(user ? { id: user.id, email: user.email } : null);
  }, [user]);

  const login = useCallback(async (_method: AuthMethod, credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase is not configured.');
      const { email, password } = credentials as { type: 'email'; email: string; password: string };
      const result = await loginWithEmailAction(supabase as any, email, password);
      const userData = result.user;
      try {
        await upsertProfile(supabase, result.sessionUser.id, result.sessionUser.user_metadata?.username ?? null);
      } catch (e) {
        console.warn('[auth.login] profile upsert failed:', (e as Error).message);
      }
      if (userData) {
        setAuthItem(AUTH_USER_KEY, JSON.stringify(userData));
        setAuthItem(AUTH_TOKEN_KEY, result.accessToken);
        setUser(userData);
      }
    } catch (error) {
      console.error('[auth.login] failed:', error);
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
    } catch (error) {
      console.error('[auth.signUp] failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      clearAuthItem(AUTH_USER_KEY);
      clearAuthItem(AUTH_TOKEN_KEY);
      setUser(null);
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('[AuthContext] Supabase signOut failed (local session already cleared):', err);
        }
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      await loginAsGuestAction(getSupabase(), useSupabaseAnonymousGuest, setUser);
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [useSupabaseAnonymousGuest]);

  const loginWithEthereum = useCallback(async () => {
    throw new Error('Ethereum login not available in MVP');
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
