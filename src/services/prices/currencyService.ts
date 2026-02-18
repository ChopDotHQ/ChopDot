import { getCryptoPrice } from './coingecko';
import { getFiatRate } from './exchangeRateApi';
import {
  type CurrencyCode,
  type CryptoCurrencyCode,
  type FiatCurrencyCode,
  isCryptoCurrencyCode,
  isFiatCurrencyCode,
  toFiatCurrencyParam,
} from './types';

export type RateSource = 'exchangerate-api' | 'coingecko' | 'none';

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

const getCryptoPriceInFiat = async (
  currency: CryptoCurrencyCode,
  targetFiat: FiatCurrencyCode
): Promise<number> => {
  return getCryptoPrice(currency, toFiatCurrencyParam(targetFiat));
};

export async function getConversionRate(
  base: CurrencyCode,
  target: CurrencyCode
): Promise<ConversionRate> {
  if (base === target) return safeRate(1, 'none');

  if (isFiatCurrencyCode(base) && isFiatCurrencyCode(target)) {
    const rate = await getFiatRate(base, target);
    return safeRate(rate, 'exchangerate-api');
  }

  if (isCryptoCurrencyCode(base) && isFiatCurrencyCode(target)) {
    const rate = await getCryptoPriceInFiat(base, target);
    return safeRate(rate, 'coingecko');
  }

  if (isFiatCurrencyCode(base) && isCryptoCurrencyCode(target)) {
    const cryptoPrice = await getCryptoPriceInFiat(target, base);
    return safeRate(cryptoPrice > 0 ? 1 / cryptoPrice : 0, 'coingecko');
  }

  if (isCryptoCurrencyCode(base) && isCryptoCurrencyCode(target)) {
    const baseUsd = await getCryptoPriceInFiat(base, 'USD');
    const targetUsd = await getCryptoPriceInFiat(target, 'USD');
    return safeRate(targetUsd > 0 ? baseUsd / targetUsd : 0, 'coingecko');
  }

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
