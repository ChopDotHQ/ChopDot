const STORAGE_KEY = 'chopdot.auth.remembered_email';

export const getRememberedEmail = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const setRememberedEmail = (email: string, remember: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    if (remember && email) {
      window.localStorage.setItem(STORAGE_KEY, email);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage write failures (e.g. private browsing).
  }
};
