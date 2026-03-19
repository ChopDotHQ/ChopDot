import { useEffect } from 'react';
import { getSupabase } from '../utils/supabase-client';

export function useEnsureUserProfile(
  authLoading: boolean,
  isAuthenticated: boolean,
  userId: string | undefined,
  userEmail: string | undefined,
): void {
  useEffect(() => {
    if (authLoading || !isAuthenticated || !userId) return;
    const email = userEmail?.trim?.();
    if (!email) return;

    const supabase = getSupabase();
    if (!supabase) return;

    (async () => {
      const { error } = await supabase
        .from('users')
        .upsert({ id: userId, name: email }, { onConflict: 'id' });
      if (error) console.warn('[Users] ensure profile failed', error.message);
    })();
  }, [authLoading, isAuthenticated, userId, userEmail]);
}
