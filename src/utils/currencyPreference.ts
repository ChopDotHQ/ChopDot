import { FIAT_CURRENCY_CODES, CRYPTO_CURRENCY_CODES, type CurrencyCode } from '../services/prices/types';

const STORAGE_KEY = 'chopdot-preferred-currency';

const ALL_CURRENCY_CODES = [...FIAT_CURRENCY_CODES, ...CRYPTO_CURRENCY_CODES] as const;

const isValidCurrencyCode = (value: string): value is CurrencyCode => {
  return ALL_CURRENCY_CODES.includes(value as CurrencyCode);
};

export const getPreferredCurrency = (): CurrencyCode | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  return isValidCurrencyCode(stored) ? stored : null;
};

export const setPreferredCurrency = (currency: CurrencyCode): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, currency);
};
