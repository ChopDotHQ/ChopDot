import { describe, expect, it, vi } from 'vitest';
import { loginWithEmailAction, signUpWithEmailAction } from './authActions';

describe('authActions', () => {
  it('loginWithEmailAction returns mapped user and token on success', async () => {
    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'token-1',
              user: { id: 'u1', email: 'alex@example.com', user_metadata: { username: 'alex' } },
            },
          },
          error: null,
        }),
      },
    };

    const result = await loginWithEmailAction(supabase as any, 'alex@example.com', 'secret');
    expect(result.user.id).toBe('u1');
    expect(result.user.email).toBe('alex@example.com');
    expect(result.accessToken).toBe('token-1');
  });

  it('loginWithEmailAction fails on auth error', async () => {
    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null },
          error: new Error('Invalid credentials'),
        }),
      },
    };

    await expect(loginWithEmailAction(supabase as any, 'alex@example.com', 'bad')).rejects.toThrow('Invalid credentials');
  });

  it('signUpWithEmailAction returns null when confirmation is required', async () => {
    const supabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    };

    const result = await signUpWithEmailAction(supabase as any, 'new@example.com', 'secret', 'newuser');
    expect(result).toBeNull();
  });

  it('signUpWithEmailAction returns mapped user when session is present', async () => {
    const supabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'token-2',
              user: { id: 'u2', email: 'new@example.com', user_metadata: { username: 'newuser' } },
            },
          },
          error: null,
        }),
      },
    };

    const result = await signUpWithEmailAction(supabase as any, 'new@example.com', 'secret', 'newuser');
    expect(result?.user.id).toBe('u2');
    expect(result?.accessToken).toBe('token-2');
  });
});
