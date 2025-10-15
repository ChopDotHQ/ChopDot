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
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export type LoginCredentials = 
  | { type: 'wallet'; address: string; signature: string; message: string }
  | { type: 'email'; email: string; password: string }
  | { type: 'guest' };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount (once only)
  useEffect(() => {
    // Synchronous auth check - no logging, instant
    try {
      const storedUser = localStorage.getItem('chopdot_user');
      const storedToken = localStorage.getItem('chopdot_auth_token');
      
      if (storedUser && storedToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (parseError) {
          console.error('[ChopDot] Failed to parse user data, clearing session');
          localStorage.removeItem('chopdot_user');
          localStorage.removeItem('chopdot_auth_token');
        }
      }
    } catch (error) {
      console.error('[ChopDot] Auth check failed:', error);
      try {
        localStorage.removeItem('chopdot_user');
        localStorage.removeItem('chopdot_auth_token');
      } catch (storageError) {
        console.error('[ChopDot] Failed to clear localStorage:', storageError);
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps = run once on mount only

  const checkAuth = async () => {
    // Kept for refreshUser() calls
    setIsLoading(true);
    
    try {
      const storedUser = localStorage.getItem('chopdot_user');
      const storedToken = localStorage.getItem('chopdot_auth_token');
      
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('[ChopDot] Auth refresh failed:', error);
      localStorage.removeItem('chopdot_user');
      localStorage.removeItem('chopdot_auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (method: AuthMethod, credentials: LoginCredentials) => {
    try {
      setIsLoading(true);

      // In a real app, this would call your backend API
      // For now, we'll simulate the auth flow
      
      let userData: User;
      
      if (credentials.type === 'wallet') {
        // Verify wallet signature
        // const isValid = await verifySignature(credentials.address, credentials.signature, credentials.message);
        // if (!isValid) throw new Error('Invalid signature');
        
        // Call backend to get or create user
        // const response = await fetch('/api/auth/wallet', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     walletAddress: credentials.address,
        //     signature: credentials.signature,
        //     message: credentials.message,
        //     authMethod: method,
        //   }),
        // });
        
        // Mock user data
        userData = {
          id: `user_${Date.now()}`,
          walletAddress: credentials.address,
          authMethod: method,
          name: `${method.charAt(0).toUpperCase() + method.slice(1)} User`,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Email/password login
        // const response = await fetch('/api/auth/email', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     email: credentials.email,
        //     password: credentials.password,
        //   }),
        // });
        
        // Mock user data
        userData = {
          id: `user_${Date.now()}`,
          email: credentials.email,
          authMethod: 'email',
          name: credentials.email.split('@')[0],
          createdAt: new Date().toISOString(),
        };
      }
      
      // Store user and token
      const mockToken = `mock_jwt_token_${Date.now()}`;
      localStorage.setItem('chopdot_user', JSON.stringify(userData));
      localStorage.setItem('chopdot_auth_token', mockToken);
      
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // In a real app, call backend to invalidate token
      // await fetch('/api/auth/logout', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('chopdot_auth_token')}`,
      //   },
      // });
      
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
