export function currencyDecimals(currency: string): number {
  switch (currency.trim().toUpperCase()) {
    case 'PAS': return 10;
    case 'USDC': return 6;
    case 'USD':
    case 'EUR':
    case 'GBP': return 2;
    default: return 2;
  }
}

export function parseStrictDecimal(value: string, decimals: number, {allowZero = false}: {allowZero?: boolean} = {}): number | null {
  const source = value.trim();
  if (!source || !Number.isInteger(decimals) || decimals < 0 || decimals > 30) return null;
  const pattern = decimals === 0 ? /^\d+$/u : new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`, 'u');
  if (!pattern.test(source)) return null;
  const parsed = Number(source);
  if (!Number.isFinite(parsed)) return null;
  if (allowZero ? parsed < 0 : parsed <= 0) return null;
  return parsed;
}

export function parseNonNegativeDecimal(value: string, decimals: number): number | null {
  return parseStrictDecimal(value, decimals, {allowZero: true});
}

export function amountsMatchAtPrecision(left: number, right: number, decimals: number): boolean {
  const factor = 10 ** decimals;
  return Math.round(left * factor) === Math.round(right * factor);
}
