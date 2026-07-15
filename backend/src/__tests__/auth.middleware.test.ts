import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthConfigurationError,
  AuthServiceUnavailableError,
  createRequireAuth,
  getAuthenticatedPrincipal,
  verifySupabaseAccessToken,
} from '../auth/authenticate';

function buildApp(
  verifier: (token: string) => Promise<{ userId: string } | null>,
) {
  const app = express();
  app.get('/protected', createRequireAuth(verifier), (_req, res) => {
    res.json(getAuthenticatedPrincipal(res));
  });
  return app;
}

describe('authenticated principal middleware', () => {
  it('rejects a missing bearer token', async () => {
    const verifier = vi.fn();
    const response = await request(buildApp(verifier)).get('/protected');

    expect(response.status).toBe(401);
    expect(verifier).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer token', async () => {
    const verifier = vi.fn().mockResolvedValue(null);
    const response = await request(buildApp(verifier))
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(verifier).toHaveBeenCalledWith('invalid-token');
  });

  it('derives the principal from the verified bearer token and ignores x-user-id', async () => {
    const verifier = vi.fn().mockResolvedValue({ userId: 'verified-user' });
    const response = await request(buildApp(verifier))
      .get('/protected')
      .set('Authorization', 'Bearer valid-token')
      .set('x-user-id', 'forged-user');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 'verified-user' });
  });

  it('fails closed when auth configuration is missing', async () => {
    const verifier = vi.fn().mockRejectedValue(new AuthConfigurationError('missing auth config'));
    const response = await request(buildApp(verifier))
      .get('/protected')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(503);
  });

  it('fails closed when the auth service is unavailable', async () => {
    const verifier = vi.fn().mockRejectedValue(new AuthServiceUnavailableError('auth unavailable'));
    const response = await request(buildApp(verifier))
      .get('/protected')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(503);
  });
});

describe('Supabase access-token verification', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('derives the user from the Supabase Auth user endpoint', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co/');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'public-project-key');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'verified-user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifySupabaseAccessToken('access-token')).resolves.toEqual({
      userId: 'verified-user',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        method: 'GET',
        headers: {
          apikey: 'public-project-key',
          Authorization: 'Bearer access-token',
        },
      }),
    );
  });

  it('treats a rejected Supabase token as invalid identity', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-project-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(verifySupabaseAccessToken('expired-token')).resolves.toBeNull();
  });

  it('fails closed when server Auth configuration is absent', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');

    await expect(verifySupabaseAccessToken('access-token')).rejects.toBeInstanceOf(
      AuthConfigurationError,
    );
  });
});
