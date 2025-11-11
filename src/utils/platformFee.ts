/**
 * Platform Fee Utilities
 * 
 * Handles display-only platform fee calculations with currency awareness.
 * Fees are calculated but NOT collected until VITE_COLLECT_PLATFORM_FEE=1 and VITE_TREASURY_ADDRESS is set.
 */

export type DisplayCurrency = 'CHF' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'DOT' | string;

// Get runtime-configured BPS (basis points) from feature flags
export function getPlatformFeeBps(): number {
  const raw = Number(localStorage.getItem('flag_SERVICE_FEE_CAP_BPS') ?? '20');
  return Number.isFinite(raw) && raw >= 0 ? raw : 20; // Default: 20 BPS (0.20%)
}

export function shouldShowPlatformFee(): boolean {
  return import.meta.env.VITE_SHOW_PLATFORM_FEE === '1';
}

export function canCollectPlatformFee(): boolean {
  const addr = (import.meta.env.VITE_TREASURY_ADDRESS as string | undefined)?.trim();
  const enabled = import.meta.env.VITE_COLLECT_PLATFORM_FEE === '1';
  return !!addr && enabled; // Always false for now
}

/**
 * Compute platform fee for display purposes only
 * 
 * For DOT pots: fee is calculated in DOT with DOT-based floor/cap
 * For fiat pots: fee is calculated in the pot's currency
 * 
 * Floor/cap are in the same currency as the calculation
 */
export function computeDisplayPlatformFee(
  amountDisplayCurrency: number,
  currency: DisplayCurrency = 'CHF'
): { bps: number; pctStr: string; fee: number; currency: DisplayCurrency } {
  const bps = getPlatformFeeBps();
  const raw = Math.max(0, Math.abs(amountDisplayCurrency)) * (bps / 10_000);
  
  // Get floor/cap from flags (currency-aware defaults)
  const floorAbs = Number(localStorage.getItem('flag_SERVICE_FEE_FLOOR_ABS') ?? 
    (currency === 'DOT' ? '0.000002' : '0.02'));
  const capAbs = Number(localStorage.getItem('flag_SERVICE_FEE_CAP_ABS') ?? 
    (currency === 'DOT' ? '0.00002' : '0.20'));
  
  // Apply floor and cap, round to appropriate precision
  const precision = currency === 'DOT' ? 6 : 2;
  const fee = Math.min(
    Math.max(
      Math.round(raw * Math.pow(10, precision)) / Math.pow(10, precision),
      floorAbs
    ),
    capAbs
  );
  
  return {
    bps,
    pctStr: (bps / 100).toFixed(2),
    fee,
    currency,
  };
}

/**
 * Format DOT amount with 6 decimal places
 */
export function formatDOT(amount: number): string {
  return `${amount.toFixed(6)} DOT`;
}

/**
 * Format fiat amount with 2 decimal places and currency symbol
 */
export function formatFiat(amount: number, currency: DisplayCurrency = 'CHF'): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get currency symbol for display
 */
function getCurrencySymbol(currency: DisplayCurrency): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CHF: 'CHF ',
  };
  return symbols[currency.toUpperCase()] || `${currency} `;
}

/**
 * Format fee with fiat equivalent for DOT pots
 * Example: "0.02 DOT (~$0.14)"
 */
export function formatFeeWithEquivalent(
  feeDot: number,
  fiatEquivalent: number | null,
  fiatCurrency: DisplayCurrency = 'USD'
): string {
  const dotStr = formatDOT(feeDot);
  if (fiatEquivalent && fiatEquivalent > 0) {
    return `${dotStr} (~${formatFiat(fiatEquivalent, fiatCurrency)})`;
  }
  return dotStr;
}

