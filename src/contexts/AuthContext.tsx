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
import { getSupabase } from '../utils/supabase-client';
import { upsertProfile } from '../repos/profiles';
import { blake2AsHex } from '@polkadot/util-crypto';

export type AuthMethod = 'polkadot' | 'metamask' | 'rainbow' | 'email' | 'guest';

export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  authMethod: AuthMethod;
  name?: string;
  createdAt: string;
  isGuest?: boolean;
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
  | { type: 'wallet'; address: string; signature: string; message: string }
  | { type: 'email'; email: string; password: string }
  | { type: 'guest' };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const deriveWalletEmail = (address: string): string => {
  // Use hash-based approach to create deterministic, valid email
  // Hash the address to get a consistent, shorter identifier
  const hash = blake2AsHex(address.toLowerCase(), 256);
  // Take first 16 chars of hash (after '0x' prefix) for shorter email
  // Format: w{hash}@chopdot.app (max 64 chars local part per RFC, Supabase may be stricter)
  // Total: w + 16 chars + @chopdot.app = 29 chars (well within limits)
  const hashPart = hash.slice(2, 18); // Remove '0x' and take 16 chars
  return `w${hashPart}@chopdot.app`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            const mapped: User = {
              id: session.user.id,
              email: session.user.email ?? undefined,
              authMethod: 'email',
              name: session.user.email?.split('@')[0],
              createdAt: new Date().toISOString(),
            };
            setUser(mapped);
            localStorage.setItem('chopdot_user', JSON.stringify(mapped));
            localStorage.setItem('chopdot_auth_token', session.access_token);
          }

          const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (newSession?.user) {
              const mapped: User = {
                id: newSession.user.id,
                email: newSession.user.email ?? undefined,
                authMethod: 'email',
                name: newSession.user.email?.split('@')[0],
                createdAt: new Date().toISOString(),
              };
              setUser(mapped);
              localStorage.setItem('chopdot_user', JSON.stringify(mapped));
              localStorage.setItem('chopdot_auth_token', newSession.access_token);
            } else {
              setUser(null);
              localStorage.removeItem('chopdot_user');
              localStorage.removeItem('chopdot_auth_token');
            }
          });
          unsubscribe = () => sub.subscription.unsubscribe();
        } else {
          // Fallback to local storage only when Supabase is not configured
          const storedUser = localStorage.getItem('chopdot_user');
          const storedToken = localStorage.getItem('chopdot_auth_token');
          if (storedUser && storedToken) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } catch {
              localStorage.removeItem('chopdot_user');
              localStorage.removeItem('chopdot_auth_token');
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

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const session = data.session || null;
        if (session?.user) {
          const mapped: User = {
            id: session.user.id,
            email: session.user.email ?? undefined,
            authMethod: 'email',
            name: session.user.email?.split('@')[0],
            createdAt: new Date().toISOString(),
          };
          setUser(mapped);
          localStorage.setItem('chopdot_user', JSON.stringify(mapped));
          localStorage.setItem('chopdot_auth_token', session.access_token);
          return;
        }
      }
      const storedUser = localStorage.getItem('chopdot_user');
      const storedToken = localStorage.getItem('chopdot_auth_token');
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
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
        // Wallet-based authentication - simplified flow
        const supabase = getSupabase();
        
        if (supabase) {
          const walletEmail = deriveWalletEmail(credentials.address);
          
          console.log('[Auth] Wallet login attempt for:', credentials.address);
          
          // Try to sign in first (for returning users)
          let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: walletEmail,
            password: credentials.address,
          });
          
          let authUser = signInData?.user ?? null;
          
          // If sign in failed, try to sign up (new user)
          if (signInError || !authUser) {
            console.log('[Auth] Sign in failed, creating new user:', signInError?.message);
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: walletEmail,
              password: credentials.address,
              options: {
                data: {
                  wallet_address: credentials.address,
                  auth_method: method,
                },
              },
            });
            
            if (signUpError) {
              console.error('[Auth] SignUp error:', signUpError);
              throw signUpError;
            }
            
            authUser = signUpData.user ?? signUpData.session?.user ?? null;
            
            if (!authUser) {
              throw new Error('Failed to create user - no user returned from signup');
            }
            
            console.log('[Auth] New user created:', authUser.id);
            
            // Create profile for new user
            try {
              await upsertProfile(supabase, authUser.id, null, credentials.address);
              console.log('[Auth] Profile created');
            } catch (profileError) {
              console.error('[Auth] Profile creation failed:', profileError);
              // Don't throw - user is created, profile can be created later
            }
          } else {
            console.log('[Auth] User signed in:', authUser.id);
          }
          
          // Get profile to fetch username
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', authUser.id)
            .single();
          
          userData = {
            id: authUser.id,
            walletAddress: credentials.address,
            authMethod: method,
            name: profile?.username || `${method.charAt(0).toUpperCase() + method.slice(1)} User`,
            createdAt: new Date().toISOString(),
          };
          
          console.log('[Auth] Wallet auth successful:', userData);
        } else {
          // No Supabase - use mock data (development only)
          console.warn('[Auth] No Supabase configured, using mock auth');
          userData = {
            id: `user_${Date.now()}`,
            walletAddress: credentials.address,
            authMethod: method,
            name: `${method.charAt(0).toUpperCase() + method.slice(1)} User`,
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        const supabase = getSupabase();
        if (!supabase) {
          throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        }
        const { email, password } = credentials as { type: 'email'; email: string; password: string };
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const session = data.session;
        if (!session?.user) throw new Error('Login failed: no session.');
        userData = {
          id: session.user.id,
          email: session.user.email ?? undefined,
          authMethod: 'email',
          name: session.user.email?.split('@')[0],
          createdAt: new Date().toISOString(),
        };

        // Ensure profile row exists (non-blocking)
        try {
          await upsertProfile(supabase, session.user.id, session.user.user_metadata?.username ?? null);
        } catch (e) {
          console.warn('[auth.login] profile upsert failed:', (e as Error).message);
        }
      }
      
      // Store user and token (keep legacy keys for now)
      if (!userData) {
        throw new Error('Authentication failed: missing user data');
      }

      localStorage.setItem('chopdot_user', JSON.stringify(userData));
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? `mock_jwt_token_${Date.now()}`;
        localStorage.setItem('chopdot_auth_token', token);
      } else {
        localStorage.setItem('chopdot_auth_token', `mock_jwt_token_${Date.now()}`);
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
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
      const session = data.session; // may be null if email confirmation enabled
      if (session?.user) {
        const mapped: User = {
          id: session.user.id,
          email: session.user.email ?? undefined,
          authMethod: 'email',
          name: session.user.email?.split('@')[0],
          createdAt: new Date().toISOString(),
        };
        setUser(mapped);
        localStorage.setItem('chopdot_user', JSON.stringify(mapped));
        localStorage.setItem('chopdot_auth_token', session.access_token);

        // Ensure profile row exists (non-blocking)
        try {
          await upsertProfile(supabase, session.user.id, username ?? null);
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
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
      // Clear local storage
      localStorage.removeItem('chopdot_user');
      localStorage.removeItem('chopdot_auth_token');
      
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
      
      // Create guest user
      const guestUser: User = {
        id: `guest_${Date.now()}`,
        authMethod: 'guest',
        name: 'Guest User',
        createdAt: new Date().toISOString(),
        isGuest: true,
      };
      
      // Store guest session (no token needed)
      localStorage.setItem('chopdot_user', JSON.stringify(guestUser));
      localStorage.setItem('chopdot_auth_token', 'guest_session');
      
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
