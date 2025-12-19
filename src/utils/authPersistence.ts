export type AuthPersistence = 'local' | 'session';

const STORAGE_KEY = 'chopdot.auth.persistence';

export const getAuthPersistence = (): AuthPersistence => {
  if (typeof window === 'undefined') return 'local';
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'session' ? 'session' : 'local';
  } catch {
    return 'local';
  }
};

export const setAuthPersistence = (value: AuthPersistence) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore storage write failures (e.g. private browsing).
  }
};

