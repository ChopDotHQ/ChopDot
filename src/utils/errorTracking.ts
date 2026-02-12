import * as Sentry from '@sentry/react';

let enabled = false;

const getRelease = () => {
  const explicit = import.meta.env.VITE_APP_VERSION as string | undefined;
  if (explicit && explicit.trim() !== '') {
    return explicit;
  }
  return undefined;
};

export const initErrorTracking = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || dsn.trim() === '') {
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: getRelease(),
    tracesSampleRate: 0,
  });
  enabled = true;
};

export const reportError = (error: unknown, context?: Record<string, unknown>) => {
  if (!enabled) {
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
    return;
  }

  Sentry.captureException(error);
};

export const setErrorTrackingUser = (user: { id: string; email?: string } | null) => {
  if (!enabled) {
    return;
  }
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
};
