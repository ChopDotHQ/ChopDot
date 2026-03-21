import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '../../types/auth';
import { setAuthItem, AUTH_USER_KEY, AUTH_TOKEN_KEY } from './session-manager';

export async function loginAsGuestAction(
  supabase: SupabaseClient | null,
  useSupabaseAnonymous: boolean,
  setUser: (u: User) => void,
): Promise<void> {
  if (useSupabaseAnonymous && supabase) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;

    const session = data.session;
    if (!session?.user) throw new Error('Anonymous login failed: no session');

    const anonUser: User = {
      id: session.user.id,
      authMethod: 'anonymous',
      name: 'Anonymous User',
      createdAt: new Date().toISOString(),
      isGuest: true,
    };

    setAuthItem(AUTH_USER_KEY, JSON.stringify(anonUser));
    setAuthItem(AUTH_TOKEN_KEY, session.access_token);
    setUser(anonUser);
    return;
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
