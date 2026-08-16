/**
 * platformFee - MVP stub (DOT fee calculations removed)
 */

export type DisplayCurrency = 'USD' | 'EUR' | 'GBP' | 'CHF' | string;

export function formatDOT(_amount: number | string): string {
  return String(_amount);
}

export function formatFiat(amount: number | string, _currency?: DisplayCurrency): string {
  return String(amount);
}
