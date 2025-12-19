import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAuthPersistence } from './authPersistence';

let cached: SupabaseClient | null | undefined;

export const getSupabase = (): SupabaseClient | null => {
  if (cached !== undefined) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anon) {
    cached = null; // Not configured; callers should handle gracefully
    return cached;
  }

  const persistence = getAuthPersistence();
  const storage =
    typeof window !== 'undefined' && persistence === 'session'
      ? window.sessionStorage
      : typeof window !== 'undefined'
        ? window.localStorage
        : undefined;

  cached = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage,
    },
  });
  return cached;
};

