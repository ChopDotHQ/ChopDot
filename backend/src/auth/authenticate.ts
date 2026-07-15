import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface AuthenticatedPrincipal {
  userId: string;
}

export type AccessTokenVerifier = (
  accessToken: string,
) => Promise<AuthenticatedPrincipal | null>;

export class AuthConfigurationError extends Error {}
export class AuthServiceUnavailableError extends Error {}

type SupabaseAuthUser = {
  id?: unknown;
};

const MAX_BEARER_TOKEN_LENGTH = 8192;
const AUTH_TIMEOUT_MS = 5000;

function getSupabaseAuthConfig(env: NodeJS.ProcessEnv = process.env): {
  authUserUrl: string;
  apiKey: string;
} {
  const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const apiKey = (env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY)?.trim();

  if (!supabaseUrl || !apiKey) {
    throw new AuthConfigurationError('Supabase auth is not configured');
  }

  return {
    authUserUrl: `${supabaseUrl}/auth/v1/user`,
    apiKey,
  };
}

/**
 * Validate a Supabase access token with the Auth server. This supports both
 * asymmetric and legacy shared-secret signing configurations without trusting
 * client-decoded claims.
 */
export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<AuthenticatedPrincipal | null> {
  const { authUserUrl, apiKey } = getSupabaseAuthConfig();

  let response: globalThis.Response;
  try {
    response = await fetch(authUserUrl, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch {
    throw new AuthServiceUnavailableError('Supabase auth is unavailable');
  }

  if (response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new AuthServiceUnavailableError('Supabase auth is unavailable');
  }

  let user: SupabaseAuthUser;
  try {
    user = (await response.json()) as SupabaseAuthUser;
  } catch {
    throw new AuthServiceUnavailableError('Supabase auth returned an invalid response');
  }

  return typeof user.id === 'string' && user.id.length > 0
    ? { userId: user.id }
    : null;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const match = /^Bearer ([^\s]+)$/i.exec(header);
  const token = match?.[1];
  if (!token || token.length > MAX_BEARER_TOKEN_LENGTH) return null;
  return token;
}

export function createRequireAuth(
  verifyAccessToken: AccessTokenVerifier = verifySupabaseAccessToken,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const principal = await verifyAccessToken(token);
      if (!principal) {
        res.status(401).json({ error: 'Invalid or expired access token' });
        return;
      }

      res.locals.principal = Object.freeze({ ...principal });
      next();
    } catch (error) {
      if (
        error instanceof AuthConfigurationError ||
        error instanceof AuthServiceUnavailableError
      ) {
        res.status(503).json({ error: 'Authentication service unavailable' });
        return;
      }
      next(error);
    }
  };
}

export const requireAuth = createRequireAuth();

export function getAuthenticatedPrincipal(res: Response): AuthenticatedPrincipal {
  const principal = res.locals.principal as AuthenticatedPrincipal | undefined;
  if (!principal) {
    throw new Error('Authenticated principal is unavailable');
  }
  return principal;
}
