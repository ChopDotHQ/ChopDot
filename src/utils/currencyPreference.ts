import { isBaseCurrency } from '../schema/pot';
import type { CurrencyCode } from '../services/prices/types';

const STORAGE_KEY = 'chopdot-preferred-currency';

export const getPreferredCurrency = (): CurrencyCode | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && isBaseCurrency(stored) ? stored : null;
};

export const setPreferredCurrency = (currency: CurrencyCode): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, currency);
};
