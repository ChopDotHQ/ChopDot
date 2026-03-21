import type { AuthMethod, User } from '../types/auth';

export function mapSupabaseSessionUser(sessionUser: Record<string, unknown>): User {
  const appMeta = sessionUser?.app_metadata as Record<string, unknown> | undefined;
  const userMeta = sessionUser?.user_metadata as Record<string, unknown> | undefined;
  const identities = sessionUser?.identities as Array<Record<string, unknown>> | undefined;

  const hasAnonymousProvider =
    appMeta?.provider === 'anonymous' ||
    identities?.some?.((identity) => identity?.provider === 'anonymous');
  const isAnonymous = Boolean(sessionUser?.is_anonymous || hasAnonymousProvider);

  const isWeb3 = appMeta?.provider === 'web3';
  const walletAddress = (userMeta?.wallet_address as string) ?? undefined;
  const oauthProvider = appMeta?.provider as string | undefined;
  const isOAuth = oauthProvider === 'google' || oauthProvider === 'facebook' || oauthProvider === 'apple';

  const email = (sessionUser?.email as string) ?? undefined;

  let authMethod: AuthMethod = 'email';
  if (isAnonymous) authMethod = 'anonymous';
  else if (isWeb3) authMethod = 'ethereum';
  else if (isOAuth) authMethod = oauthProvider as AuthMethod;

  const oauthName = (userMeta?.full_name as string) ?? (userMeta?.name as string) ?? undefined;

  const name =
    oauthName ??
    email?.split('@')[0] ??
    (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : undefined) ??
    (isAnonymous ? 'Anonymous User' : undefined);

  return {
    id: sessionUser.id as string,
    email,
    walletAddress,
    authMethod,
    name,
    createdAt: new Date().toISOString(),
    isGuest: isAnonymous ? true : undefined,
  };
}
