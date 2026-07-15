import { getSupabase } from './supabase-client';

export async function getApiAuthHeaders(): Promise<HeadersInit> {
  const client = getSupabase();
  if (!client) return {};

  const { data } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
