import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAuthPersistence } from './authPersistence';

let cached: SupabaseClient | null | undefined;

export const getSupabaseConfig = (): { url?: string; anonKey?: string } => {
  const url =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined);
  const anonKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined);
  return { url, anonKey };
};

export const getSupabase = (): SupabaseClient | null => {
  if (cached !== undefined) return cached;

  const { url, anonKey: anon } = getSupabaseConfig();

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

  console.log('[supabase] Creating client:', { url, persistence });

  cached = createClient(url, anon, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage,
    },
  });
  return cached;
};
