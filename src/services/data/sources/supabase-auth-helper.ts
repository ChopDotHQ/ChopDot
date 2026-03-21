import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthError } from '../errors';

const AUTH_TOKEN_KEY = 'chopdot_auth_token';
const AUTH_USER_KEY = 'chopdot_auth_user';
const GUEST_TOKEN = 'guest_session';

export function isGuestSession(): boolean {
  if (typeof window === 'undefined') return false;
  const parseAuthMethod = (raw: string | null): string | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { authMethod?: string; isGuest?: boolean };
      if (parsed?.isGuest) return 'guest';
      return parsed?.authMethod || null;
    } catch {
      return null;
    }
  };
  const localAuthMethod = parseAuthMethod(window.localStorage.getItem(AUTH_USER_KEY));
  const sessionAuthMethod = parseAuthMethod(window.sessionStorage.getItem(AUTH_USER_KEY));
  const effectiveAuthMethod = localAuthMethod || sessionAuthMethod;
  if (effectiveAuthMethod === 'guest' || effectiveAuthMethod === 'anonymous') {
    return true;
  }
  const localToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
  return localToken === GUEST_TOKEN || sessionToken === GUEST_TOKEN;
}

export async function getOptionalUserId(
  client: SupabaseClient,
  context: string,
): Promise<string | null> {
  if (isGuestSession()) {
    return null;
  }
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new AuthError(`[SupabaseSource] Failed to resolve Supabase session (${context})`, error);
  }
  return data.session?.user?.id ?? null;
}

export async function requireAuthenticatedUser(
  client: SupabaseClient,
  context: string,
): Promise<string> {
  const userId = await getOptionalUserId(client, context);
  if (!userId) {
    throw new AuthError(`[SupabaseSource] Authentication required (${context})`);
  }
  return userId;
}
