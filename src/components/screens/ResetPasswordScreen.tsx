import { useEffect, useState, FormEvent } from 'react';
import { getSupabase } from '../../utils/supabase-client';
import { toast, Toaster } from 'sonner';

type ResetStatus = 'loading' | 'ready' | 'error' | 'success';

const cleanResetUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('type');
  url.hash = '';
  window.history.replaceState({}, '', url.toString());
};

const getHashParams = () => {
  const hash = window.location.hash.replace(/^#/, '');
  return new URLSearchParams(hash);
};

export default function ResetPasswordScreen() {
  const [status, setStatus] = useState<ResetStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase auth is not configured.');
      setStatus('error');
      return;
    }

    const bootstrap = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const hashParams = getHashParams();
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          setStatus('error');
          return;
        }
        cleanResetUrl();
      } else if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) {
          setError(setSessionError.message);
          setStatus('error');
          return;
        }
        cleanResetUrl();
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        setError(sessionError?.message || 'Reset link is invalid or expired.');
        setStatus('error');
        return;
      }

      setStatus('ready');
    };

    void bootstrap();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.password || !form.confirmPassword) {
      setError('Please fill out both fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase auth is not configured.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      });
      if (updateError) {
        throw updateError;
      }
      setStatus('success');
      toast.success('Password updated. You can sign in now.');
    } catch (err: any) {
      const message = err?.message || 'Failed to update password.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#0f0f11] flex items-center justify-center px-4 py-12">
      <Toaster />
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="text-sm text-[#5b5b5f]">
            Choose a new password to continue using ChopDot.
          </p>
        </div>

        {status === 'loading' && (
          <p className="text-sm text-[#5b5b5f]">Checking reset link…</p>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || 'Reset link is invalid or expired.'}
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="reset-password" className="text-sm font-semibold">
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reset-password-confirm" className="text-sm font-semibold">
                Confirm password
              </label>
              <input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                value={form.confirmPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10 disabled:opacity-60"
              disabled={isSubmitting}
            >
              Update password
            </button>
          </form>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password updated successfully.
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10"
              onClick={() => {
                window.location.href = '/pots';
              }}
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

