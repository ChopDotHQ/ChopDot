import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearAuthItem,
} from './session-manager';

export const LOCAL_ACCOUNT_SESSION_KEYS = [
  'account.connector',
  'account.walletSource',
  'account.address0',
] as const;

export const SESSION_ONLY_PERSON_KEYS = [
  'chopdot_capture_acting_member',
] as const;

export function clearLocalAuthAndAccountSession(): void {
  clearAuthItem(AUTH_USER_KEY);
  clearAuthItem(AUTH_TOKEN_KEY);

  if (typeof window === 'undefined') return;

  for (const key of LOCAL_ACCOUNT_SESSION_KEYS) {
    window.localStorage.removeItem(key);
  }

  for (const key of SESSION_ONLY_PERSON_KEYS) {
    window.sessionStorage.removeItem(key);
  }

  delete (window as typeof window & { __chopdot_wallet_address?: string }).__chopdot_wallet_address;
}
