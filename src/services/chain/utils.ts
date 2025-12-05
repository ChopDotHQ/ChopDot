import { getActiveChainConfig } from './config';

/**
 * Build Subscan URL for a transaction hash
 * This is a simple utility that doesn't require Polkadot API
 */
export function buildSubscanUrl(txHash: string): string {
  const config = getActiveChainConfig();
  return `${config.subscanExtrinsicBase}/${txHash}`;
}

/**
 * Convert DOT amount to Planck string
 * This is a simple utility that doesn't require Polkadot API
 */
export function toPlanckString(amountDot: number, decimals: number = 10): string {
  const multiplier = Math.pow(10, decimals);
  const planck = Math.floor(amountDot * multiplier);
  return planck.toString();
}
