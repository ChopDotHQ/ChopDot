import { isBaseCurrency, type BaseCurrency } from '../schema/pot';
import { formatDOT, formatFiat, type DisplayCurrency } from './platformFee';

export const normalizeCurrency = (currency?: string): BaseCurrency => {
  return isBaseCurrency(currency ?? '') ? (currency as BaseCurrency) : 'USD';
};

export const formatCurrencyAmount = (
  amount: number,
  currency?: string,
  options?: { withSign?: boolean }
): string => {
  const normalized = normalizeCurrency(currency);
  const magnitude = Math.abs(amount);
  const formatted =
    normalized === 'DOT'
      ? formatDOT(magnitude)
      : formatFiat(magnitude, normalized as DisplayCurrency);
  const sign = options?.withSign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : '';
  return `${sign}${formatted}`;
};
