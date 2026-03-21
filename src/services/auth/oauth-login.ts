import type { SupabaseClient } from '@supabase/supabase-js';
import type { OAuthProvider } from '../../types/auth';

export async function loginWithOAuthRedirect(
  supabase: SupabaseClient,
  provider: OAuthProvider,
): Promise<void> {
  const redirectTo = window.location.origin;
  console.log(`[auth] Starting OAuth for ${provider}, redirectTo:`, redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  console.log(`[auth] signInWithOAuth result:`, { url: data?.url, error: error?.message });

  if (error) {
    console.error(`OAuth login failed (${provider}):`, error);
    throw error;
  }
}
