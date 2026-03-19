import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthMethod, User } from '../../types/auth';
import { getSupabaseConfig } from '../../utils/supabase-client';
import { upsertProfile } from '../../repos/profiles';

export async function loginWithWallet(
  supabase: SupabaseClient,
  method: AuthMethod,
  address: string,
  signature: string,
  chain?: 'polkadot' | 'evm',
): Promise<{ userData: User; accessToken: string }> {
  const { url: supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase not configured for wallet auth');
  }

  const resolvedChain: 'polkadot' | 'evm' = chain || (method === 'polkadot' ? 'polkadot' : 'evm');

  const verifyRes = await fetch(`${supabaseUrl}/functions/v1/wallet-auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ address, signature, chain: resolvedChain }),
  });

  if (!verifyRes.ok) {
    const text = await verifyRes.text();
    throw new Error(`Wallet auth failed: ${verifyRes.status} ${text}`);
  }

  const verifyData = await verifyRes.json();
  if (!verifyData?.access_token || !verifyData?.refresh_token) {
    throw new Error('Wallet auth failed: tokens not returned');
  }

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: verifyData.access_token,
    refresh_token: verifyData.refresh_token,
  });
  if (setSessionError) throw setSessionError;

  const { data } = await supabase.auth.getSession();
  const session = data.session || null;
  if (!session?.user) throw new Error('Wallet auth failed: no session returned');

  try {
    await upsertProfile(supabase, session.user.id, session.user.user_metadata?.username ?? null, address);
  } catch (profileError) {
    console.warn('[auth.login] profile upsert failed:', (profileError as Error).message);
  }

  const userData: User = {
    id: session.user.id,
    walletAddress: address,
    authMethod: method,
    name: session.user.email?.split('@')[0] || `${method.charAt(0).toUpperCase() + method.slice(1)} User`,
    createdAt: new Date().toISOString(),
  };

  return { userData, accessToken: session.access_token };
}

export async function loginWithEthereumWeb3(
  supabase: SupabaseClient,
): Promise<{ userData: User; accessToken: string }> {
  const { data, error } = await (supabase.auth as unknown as { signInWithWeb3: (opts: Record<string, unknown>) => Promise<{ data: { session: { user: Record<string, unknown>; access_token: string } | null } | null; error: Error | null }> }).signInWithWeb3({
    chain: 'ethereum',
    statement: 'Sign in to ChopDot with your Ethereum wallet',
  });

  if (error) throw error;

  const session = (data as Record<string, unknown>)?.session as { user: Record<string, unknown>; access_token: string } | null;
  if (!session?.user) throw new Error('Ethereum sign-in failed: no session returned');

  const walletAddress = (session.user.user_metadata as Record<string, unknown>)?.wallet_address as string | undefined;
  const userData: User = {
    id: session.user.id as string,
    walletAddress,
    authMethod: 'ethereum',
    name: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Ethereum User',
    createdAt: new Date().toISOString(),
  };

  try {
    await upsertProfile(supabase, session.user.id as string, null, walletAddress);
  } catch (e) {
    console.warn('[auth.loginWithEthereum] profile upsert failed:', (e as Error).message);
  }

  return { userData, accessToken: session.access_token };
}
