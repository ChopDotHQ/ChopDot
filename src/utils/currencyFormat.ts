import { isBaseCurrency, type BaseCurrency } from '../schema/pot';
import { formatFiat } from './platformFee';

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
  const formatted = formatFiat(magnitude, normalized);
  const sign = options?.withSign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : '';
  return `${sign}${formatted}`;
};
