import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProfileRecord {
  id: string;
  username?: string | null;
  // Note: profiles table only has: id, username, created_at, updated_at
  // wallet_address column does not exist in the schema
}

export async function upsertProfile(
  supabase: SupabaseClient, 
  userId: string, 
  username?: string | null,
  _walletAddress?: string | null // Deprecated: profiles table doesn't have wallet_address column
): Promise<void> {
  const record: ProfileRecord = { id: userId };
  if (typeof username === 'string' && username.trim().length > 0) {
    record.username = username.trim();
  }
  // wallet_address removed - column doesn't exist in profiles table schema

  const { error } = await supabase
    .from('profiles')
    .upsert(record, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    // Non-fatal: surface in console but do not throw to avoid blocking auth
    // eslint-disable-next-line no-console
    console.warn('[profiles.upsert] failed:', error.message);
  }
}


