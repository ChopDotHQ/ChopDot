export const FIAT_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'] as const;
export type FiatCurrencyCode = (typeof FIAT_CURRENCY_CODES)[number];

export const CRYPTO_CURRENCY_CODES = ['DOT', 'USDC'] as const;
export type CryptoCurrencyCode = (typeof CRYPTO_CURRENCY_CODES)[number];

export type CurrencyCode = FiatCurrencyCode | CryptoCurrencyCode;
export type FiatCurrencyParam = Lowercase<FiatCurrencyCode>;

export const isFiatCurrencyCode = (value: string): value is FiatCurrencyCode => {
  return FIAT_CURRENCY_CODES.includes(value as FiatCurrencyCode);
};

export const isCryptoCurrencyCode = (value: string): value is CryptoCurrencyCode => {
  return CRYPTO_CURRENCY_CODES.includes(value as CryptoCurrencyCode);
};

export const toFiatCurrencyParam = (currency: FiatCurrencyCode): FiatCurrencyParam => {
  return currency.toLowerCase() as FiatCurrencyParam;
};
