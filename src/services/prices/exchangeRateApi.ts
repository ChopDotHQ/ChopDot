import { FIAT_CURRENCY_CODES, type FiatCurrencyCode } from './types';

interface RateCache {
  base: FiatCurrencyCode;
  rates: Record<FiatCurrencyCode, number>;
  timestamp: number;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const RATE_API_BASE = 'https://api.exchangerate-api.com/v4/latest';

const rateCache = new Map<FiatCurrencyCode, RateCache>();

const buildEmptyRates = (base: FiatCurrencyCode): Record<FiatCurrencyCode, number> => {
  return FIAT_CURRENCY_CODES.reduce((acc, code) => {
    acc[code] = code === base ? 1 : 0;
    return acc;
  }, {} as Record<FiatCurrencyCode, number>);
};

export async function getFiatRates(base: FiatCurrencyCode): Promise<Record<FiatCurrencyCode, number>> {
  const cached = rateCache.get(base);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.rates;
  }

  try {
    const url = `${RATE_API_BASE}/${base}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ExchangeRate API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = FIAT_CURRENCY_CODES.reduce((acc, code) => {
      const value = data?.rates?.[code];
      acc[code] = typeof value === 'number' ? value : 0;
      return acc;
    }, {} as Record<FiatCurrencyCode, number>);

    rateCache.set(base, {
      base,
      rates,
      timestamp: Date.now(),
    });

    return rates;
  } catch (error) {
    console.error('[ExchangeRateApi] Failed to fetch rates:', error);

    if (cached) {
      console.warn('[ExchangeRateApi] Using stale cache due to API error');
      return cached.rates;
    }

    return buildEmptyRates(base);
  }
}

export async function getFiatRate(base: FiatCurrencyCode, target: FiatCurrencyCode): Promise<number> {
  if (base === target) return 1;
  const rates = await getFiatRates(base);
  return rates[target] || 0;
}

export function clearFiatRateCache(): void {
  rateCache.clear();
}
