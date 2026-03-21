import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '../../types/auth';
import { mapSupabaseSessionUser } from '../../utils/auth-mapping';
import { getAuthPersistence } from '../../utils/authPersistence';

export const AUTH_USER_KEY = 'chopdot_user';
export const AUTH_TOKEN_KEY = 'chopdot_auth_token';

// Capture OAuth callback code at module load — before React renders or
// Supabase's async _initialize can race with us. Runs exactly once.
let pendingOAuthCode: string | null = null;
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    pendingOAuthCode = code;
    window.history.replaceState({}, '', window.location.pathname);
    console.log('[auth] Captured OAuth code from URL before React render');
  }
}

export function consumePendingOAuthCode(): string | null {
  const code = pendingOAuthCode;
  pendingOAuthCode = null;
  return code;
}

const getPreferredStorage = () => {
  if (typeof window === 'undefined') return null;
  return getAuthPersistence() === 'session' ? window.sessionStorage : window.localStorage;
};

export function setAuthItem(key: string, value: string): void {
  const storage = getPreferredStorage();
  if (!storage || typeof window === 'undefined') return;
  storage.setItem(key, value);
  const other = storage === window.sessionStorage ? window.localStorage : window.sessionStorage;
  other.removeItem(key);
}

export function getAuthItem(key: string): string | null {
  const storage = getPreferredStorage();
  if (!storage) return null;
  return storage.getItem(key);
}

export function clearAuthItem(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

export function applySession(
  sessionUser: Record<string, unknown>,
  accessToken: string,
  setUser: (u: User) => void,
): void {
  const mapped = mapSupabaseSessionUser(sessionUser);
  setUser(mapped);
  setAuthItem(AUTH_USER_KEY, JSON.stringify(mapped));
  setAuthItem(AUTH_TOKEN_KEY, accessToken);
}

export function tryRestoreGuestFromStorage(
  allowLocalGuestFallback: boolean,
  setUser: (u: User) => void,
): boolean {
  if (!allowLocalGuestFallback) return false;
  const storedUser = getAuthItem(AUTH_USER_KEY);
  const storedToken = getAuthItem(AUTH_TOKEN_KEY);
  if (!storedUser || !storedToken) return false;
  try {
    const parsed = JSON.parse(storedUser) as User;
    if (parsed.authMethod === 'guest') {
      setUser(parsed);
      return true;
    }
  } catch {
    // ignore malformed payload
  }
  return false;
}

export interface InitSessionResult {
  unsubscribe?: () => void;
}

export async function initSession(
  supabase: SupabaseClient | null,
  allowLocalGuestFallback: boolean,
  setUser: (u: User | null) => void,
): Promise<InitSessionResult> {
  if (!supabase) {
    const storedUser = getAuthItem(AUTH_USER_KEY);
    const storedToken = getAuthItem(AUTH_TOKEN_KEY);
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch {
        clearAuthItem(AUTH_USER_KEY);
        clearAuthItem(AUTH_TOKEN_KEY);
      }
    }
    return {};
  }

  let unsubscribe: (() => void) | undefined;

  const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
    if (newSession?.user) {
      applySession(newSession.user as unknown as Record<string, unknown>, newSession.access_token, setUser);
    } else {
      if (!tryRestoreGuestFromStorage(allowLocalGuestFallback, setUser)) {
        setUser(null);
        clearAuthItem(AUTH_USER_KEY);
        clearAuthItem(AUTH_TOKEN_KEY);
      }
    }
  });
  unsubscribe = () => sub.subscription.unsubscribe();

  const code = consumePendingOAuthCode();
  if (code) {
    console.log('[auth] Exchanging captured OAuth code…');
    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[auth] Code exchange failed:', exchangeError.message);
    } else if (exchangeData.session?.user) {
      console.log('[auth] Code exchange succeeded, user:', exchangeData.session.user.email ?? exchangeData.session.user.id);
      applySession(exchangeData.session.user as unknown as Record<string, unknown>, exchangeData.session.access_token, setUser);
    }
  } else {
    const { data } = await supabase.auth.getSession();
    const session = data.session || null;
    if (session?.user) {
      applySession(session.user as unknown as Record<string, unknown>, session.access_token, setUser);
    } else {
      tryRestoreGuestFromStorage(allowLocalGuestFallback, setUser);
    }
  }

  return { unsubscribe };
}

export async function checkSession(
  supabase: SupabaseClient | null,
  allowLocalGuestFallback: boolean,
  setUser: (u: User | null) => void,
): Promise<void> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const session = data.session || null;
    if (session?.user) {
      applySession(session.user as unknown as Record<string, unknown>, session.access_token, setUser);
      return;
    }
  }
  const storedUser = getAuthItem(AUTH_USER_KEY);
  const storedToken = getAuthItem(AUTH_TOKEN_KEY);
  if (storedUser && storedToken) {
    const userData = JSON.parse(storedUser) as User;
    if (allowLocalGuestFallback || userData?.authMethod !== 'guest') {
      setUser(userData);
    } else {
      setUser(null);
    }
  } else {
    setUser(null);
  }
}
