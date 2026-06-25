import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearLocalAuthAndAccountSession } from './session-cleanup';

class MemoryStorage {
  private items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

describe('clearLocalAuthAndAccountSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears auth, wallet, and acting-person session artifacts', () => {
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    localStorage.setItem('chopdot_user', '{"id":"guest"}');
    localStorage.setItem('chopdot_auth_token', 'guest_session');
    sessionStorage.setItem('chopdot_user', '{"id":"session-user"}');
    sessionStorage.setItem('chopdot_auth_token', 'session_token');
    localStorage.setItem('account.connector', 'walletconnect');
    localStorage.setItem('account.walletSource', 'walletconnect');
    localStorage.setItem('account.address0', '5FAKE');
    sessionStorage.setItem('chopdot_capture_acting_member', 'leo');

    vi.stubGlobal('window', {
      localStorage,
      sessionStorage,
      __chopdot_wallet_address: '5FAKE',
    });

    clearLocalAuthAndAccountSession();

    expect(localStorage.getItem('chopdot_user')).toBeNull();
    expect(localStorage.getItem('chopdot_auth_token')).toBeNull();
    expect(sessionStorage.getItem('chopdot_user')).toBeNull();
    expect(sessionStorage.getItem('chopdot_auth_token')).toBeNull();
    expect(localStorage.getItem('account.connector')).toBeNull();
    expect(localStorage.getItem('account.walletSource')).toBeNull();
    expect(localStorage.getItem('account.address0')).toBeNull();
    expect(sessionStorage.getItem('chopdot_capture_acting_member')).toBeNull();
    expect((window as typeof window & { __chopdot_wallet_address?: string }).__chopdot_wallet_address).toBeUndefined();
  });
});
