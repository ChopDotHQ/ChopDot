import Decimal from 'decimal.js';

const getMinorUnit = (currency?: string | null) => {
  if (currency === 'DOT' || currency === 'USDC') {
    return new Decimal(1_000_000);
  }
  return new Decimal(100);
};

export const toMinorAmount = (amount: number, currency?: string | null): string => {
  return new Decimal(amount).times(getMinorUnit(currency)).toNearest(1).toFixed(0);
};

export const fromMinorAmount = (
  amountMinor: number | string | null | undefined,
  currency?: string | null,
): number => {
  if (amountMinor === null || amountMinor === undefined) {
    return 0;
  }
  return new Decimal(amountMinor).div(getMinorUnit(currency)).toNumber();
};
