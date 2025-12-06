/**
 * WALLET LINKS REPOSITORY
 * 
 * Handles linking wallet addresses to authenticated Supabase users.
 * Creates entries when users connect wallets while logged in.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface WalletLinkRecord {
  id?: string;
  user_id: string;
  chain: 'polkadot' | 'evm';
  address: string;
  provider: string;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Link a wallet address to the authenticated user
 * Creates or updates an entry in wallet_links table
 */
export async function linkWalletToUser(
  supabase: SupabaseClient,
  userId: string,
  chain: 'polkadot' | 'evm',
  address: string,
  provider: string
): Promise<void> {
  try {
    // Check if this wallet is already linked to this user
    const { data: existing } = await supabase
      .from('wallet_links')
      .select('id, verified_at')
      .eq('user_id', userId)
      .eq('chain', chain)
      .ilike('address', address)
      .maybeSingle();

    if (existing) {
      console.log('[walletLinks] Wallet already linked:', { userId, chain, address, provider });
      // Update provider and mark as verified (user successfully connected)
      const { error } = await supabase
        .from('wallet_links')
        .update({
          provider,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('[walletLinks] Failed to update wallet link:', error);
        throw error;
      }
      return;
    }

    // Create new wallet link
    const record: WalletLinkRecord = {
      user_id: userId,
      chain,
      address,
      provider,
      verified_at: new Date().toISOString(), // Mark as verified immediately on successful connection
    };

    const { error } = await supabase
      .from('wallet_links')
      .insert(record);

    if (error) {
      // Check if this is a unique constraint violation for verified wallets
      if (error.code === '23505' && error.message?.includes('wallet_links_verified_unique')) {
        console.warn('[walletLinks] This wallet is already verified for another user:', { chain, address });
        throw new Error('This wallet is already linked to another account');
      }
      console.error('[walletLinks] Failed to create wallet link:', error);
      throw error;
    }

    console.log('[walletLinks] Successfully linked wallet:', { userId, chain, address, provider });
  } catch (error) {
    console.error('[walletLinks] linkWalletToUser error:', error);
    throw error;
  }
}

/**
 * Get all wallet links for a user
 */
export async function getUserWalletLinks(
  supabase: SupabaseClient,
  userId: string
): Promise<WalletLinkRecord[]> {
  try {
    const { data, error } = await supabase
      .from('wallet_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[walletLinks] Failed to fetch wallet links:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[walletLinks] getUserWalletLinks error:', error);
    throw error;
  }
}

/**
 * Find a verified wallet link by address and chain
 * Returns the user_id if found, null otherwise
 */
export async function findVerifiedWalletLink(
  supabase: SupabaseClient,
  chain: 'polkadot' | 'evm',
  address: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('wallet_links')
      .select('user_id')
      .eq('chain', chain)
      .ilike('address', address)
      .not('verified_at', 'is', null)
      .maybeSingle();

    if (error) {
      console.error('[walletLinks] Failed to find wallet link:', error);
      return null;
    }

    if (data?.user_id) {
      console.log('[walletLinks] Found verified wallet link:', { chain, address, userId: data.user_id });
      return data.user_id;
    }

    return null;
  } catch (error) {
    console.error('[walletLinks] findVerifiedWalletLink error:', error);
    return null;
  }
}

/**
 * Unlink a wallet from a user
 */
export async function unlinkWallet(
  supabase: SupabaseClient,
  userId: string,
  walletLinkId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('wallet_links')
      .delete()
      .eq('id', walletLinkId)
      .eq('user_id', userId); // Ensure user can only delete their own links

    if (error) {
      console.error('[walletLinks] Failed to unlink wallet:', error);
      throw error;
    }

    console.log('[walletLinks] Successfully unlinked wallet:', { userId, walletLinkId });
  } catch (error) {
    console.error('[walletLinks] unlinkWallet error:', error);
    throw error;
  }
}
