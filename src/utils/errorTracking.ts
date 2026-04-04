/**
 * errorTracking - MVP stub (Sentry removed)
 * 
 * Error tracking can be added back later. For MVP, errors are logged to console.
 */

export const initErrorTracking = () => {
  // Sentry not configured in MVP
};

export const reportError = (error: unknown, context?: Record<string, unknown>) => {
  console.error('[Error]', error, context);
};

export const setErrorTrackingUser = (_user: { id: string; email?: string } | null) => {
  // No-op in MVP
};
