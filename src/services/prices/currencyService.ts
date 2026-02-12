import { getDotPrice, getUsdcPrice } from './coingecko';
import { getFiatRate } from './exchangeRateApi';
import {
  type CurrencyCode,
  type FiatCurrencyCode,
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

const getDotPriceInFiat = async (currency: FiatCurrencyCode): Promise<number> => {
  return getDotPrice(toFiatCurrencyParam(currency));
};

const getUsdcPriceInFiat = async (currency: FiatCurrencyCode): Promise<number> => {
  return getUsdcPrice(toFiatCurrencyParam(currency));
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

  if (base === 'DOT' && isFiatCurrencyCode(target)) {
    const rate = await getDotPriceInFiat(target);
    return safeRate(rate, 'coingecko');
  }

  if (base === 'USDC' && isFiatCurrencyCode(target)) {
    const rate = await getUsdcPriceInFiat(target);
    return safeRate(rate, 'coingecko');
  }

  if (isFiatCurrencyCode(base) && target === 'DOT') {
    const dotPrice = await getDotPriceInFiat(base);
    return safeRate(dotPrice > 0 ? 1 / dotPrice : 0, 'coingecko');
  }

  if (isFiatCurrencyCode(base) && target === 'USDC') {
    const usdcPrice = await getUsdcPriceInFiat(base);
    return safeRate(usdcPrice > 0 ? 1 / usdcPrice : 0, 'coingecko');
  }

  if (base === 'DOT' && target === 'USDC') {
    const dotUsd = await getDotPriceInFiat('USD');
    const usdcUsd = await getUsdcPriceInFiat('USD');
    return safeRate(usdcUsd > 0 ? dotUsd / usdcUsd : 0, 'coingecko');
  }

  if (base === 'USDC' && target === 'DOT') {
    const dotUsd = await getDotPriceInFiat('USD');
    const usdcUsd = await getUsdcPriceInFiat('USD');
    return safeRate(dotUsd > 0 ? usdcUsd / dotUsd : 0, 'coingecko');
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
