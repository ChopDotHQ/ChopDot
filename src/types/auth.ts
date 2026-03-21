export type AuthMethod = 'polkadot' | 'metamask' | 'rainbow' | 'ethereum' | 'google' | 'facebook' | 'apple' | 'email' | 'guest' | 'anonymous';

export type OAuthProvider = 'google' | 'facebook' | 'apple';

export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  authMethod: AuthMethod;
  name?: string;
  createdAt: string;
  isGuest?: boolean;
}

export type LoginCredentials =
  | { type: 'wallet'; address: string; signature: string; chain?: 'polkadot' | 'evm' }
  | { type: 'email'; email: string; password: string }
  | { type: 'guest' };
