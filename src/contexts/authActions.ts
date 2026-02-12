import type { User } from './AuthContext';

type SessionUser = {
  id: string;
  email?: string | null;
  user_metadata?: { username?: string | null };
};

type AuthSession = {
  user: SessionUser;
  access_token: string;
};

type SupabaseAuthLike = {
  signInWithPassword: (args: { email: string; password: string }) => Promise<{ data: { session: AuthSession | null }; error: Error | null }>;
  signUp: (args: { email: string; password: string; options?: { data?: { username?: string } } }) => Promise<{ data: { session: AuthSession | null }; error: Error | null }>;
};

type SupabaseLike = {
  auth: SupabaseAuthLike;
};

export async function loginWithEmailAction(
  supabase: SupabaseLike,
  email: string,
  password: string
): Promise<{ user: User; accessToken: string; sessionUser: SessionUser }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const session = data.session;
  if (!session?.user) throw new Error('Login failed: no session.');

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? undefined,
      authMethod: 'email',
      name: session.user.email?.split('@')[0],
      createdAt: new Date().toISOString(),
    },
    accessToken: session.access_token,
    sessionUser: session.user,
  };
}

export async function signUpWithEmailAction(
  supabase: SupabaseLike,
  email: string,
  password: string,
  username?: string
): Promise<{ user: User; accessToken: string; sessionUser: SessionUser } | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;

  const session = data.session;
  if (!session?.user) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? undefined,
      authMethod: 'email',
      name: session.user.email?.split('@')[0],
      createdAt: new Date().toISOString(),
    },
    accessToken: session.access_token,
    sessionUser: session.user,
  };
}
