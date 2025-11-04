import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProfileRecord {
  id: string;
  username?: string | null;
}

export async function upsertProfile(supabase: SupabaseClient, userId: string, username?: string | null): Promise<void> {
  const record: ProfileRecord = { id: userId };
  if (typeof username === 'string' && username.trim().length > 0) {
    record.username = username.trim();
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(record, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    // Non-fatal: surface in console but do not throw to avoid blocking auth
    // eslint-disable-next-line no-console
    console.warn('[profiles.upsert] failed:', error.message);
  }
}


