import Decimal from 'decimal.js';

const MINOR_UNIT = new Decimal(100);

export const toMinorAmount = (amount: number): string => {
  return new Decimal(amount).times(MINOR_UNIT).toNearest(1).toFixed(0);
};

export const fromMinorAmount = (amountMinor: number | string | null | undefined): number => {
  if (amountMinor === null || amountMinor === undefined) {
    return 0;
  }
  return new Decimal(amountMinor).div(MINOR_UNIT).toNumber();
};
