import { getFiatRate } from './exchangeRateApi';
import {
  type CurrencyCode,
  isFiatCurrencyCode,
} from './types';

export type RateSource = 'exchangerate-api' | 'none';

export interface ConversionRate {
  rate: number;
  source: RateSource;
  timestamp: string;
}

const safeRate = (rate: number, source: RateSource): ConversionRate => ({
  rate: Number.isFinite(rate) && rate > 0 ? rate : 0,
  source: Number.isFinite(rate) && rate > 0 ? source : 'none',
  timestamp: new Date().toISOString(),
});

export async function getConversionRate(
  base: CurrencyCode,
  target: CurrencyCode
): Promise<ConversionRate> {
  if (base === target) return safeRate(1, 'none');

  if (isFiatCurrencyCode(base) && isFiatCurrencyCode(target)) {
    const rate = await getFiatRate(base, target);
    return safeRate(rate, 'exchangerate-api');
  }

  // Non-fiat currencies not supported in MVP
  return safeRate(0, 'none');
}

export async function convertAmount(
  amount: number,
  base: CurrencyCode,
  target: CurrencyCode
): Promise<{ converted: number } & ConversionRate> {
  const rateInfo = await getConversionRate(base, target);
  return {
    ...rateInfo,
    converted: rateInfo.rate > 0 ? amount * rateInfo.rate : 0,
  };
}
