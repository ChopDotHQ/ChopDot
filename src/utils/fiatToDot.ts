/**
 * Converts a fiat amount to DOT using the current DOT price.
 * Returns null if the price is unavailable or zero.
 */
export function fiatToDot(fiatAmount: number, dotPriceInFiat: number | null | undefined): number | null {
  if (!dotPriceInFiat || dotPriceInFiat <= 0) return null;
  return Math.abs(fiatAmount) / dotPriceInFiat;
}

/**
 * Returns the DOT amount for a settlement.
 * If the pot is already DOT-denominated, returns the absolute amount directly.
 * Otherwise, converts from fiat using the current price.
 */
export function settlementAmountInDot(
  totalAmount: number,
  isDotPot: boolean,
  dotPriceInFiat: number | null | undefined
): number | null {
  if (totalAmount <= 0) return null;
  if (isDotPot) return Math.abs(totalAmount);
  return fiatToDot(totalAmount, dotPriceInFiat);
}
