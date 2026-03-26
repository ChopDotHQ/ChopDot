import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '../../types/auth';
import { setAuthItem, AUTH_USER_KEY, AUTH_TOKEN_KEY } from './session-manager';

export async function loginAsGuestAction(
  supabase: SupabaseClient | null,
  useSupabaseAnonymous: boolean,
  setUser: (u: User) => void,
): Promise<void> {
  // Attempt Supabase anonymous sign-in only if explicitly enabled.
  // If it fails (e.g. anonymous sign-ins are disabled in the project),
  // fall through to the local guest user instead of throwing.
  if (useSupabaseAnonymous && supabase) {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data.session?.user) {
        const anonUser: User = {
          id: data.session.user.id,
          authMethod: 'anonymous',
          name: 'Anonymous User',
          createdAt: new Date().toISOString(),
          isGuest: true,
        };
        setAuthItem(AUTH_USER_KEY, JSON.stringify(anonUser));
        setAuthItem(AUTH_TOKEN_KEY, data.session.access_token);
        setUser(anonUser);
        return;
      }
      // Anonymous auth disabled or returned no session — fall through
      console.warn('[auth.guest] Anonymous sign-in unavailable, using local guest session:', error?.message);
    } catch (err) {
      console.warn('[auth.guest] Anonymous sign-in threw, using local guest session:', err);
    }
  }

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
}
