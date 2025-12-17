/**
 * Data Layer Reads Flag Utility
 * 
 * Checks VITE_DL_READS environment variable to determine if DL reads should be preferred.
 * Default: 'off' (safe, uses props/UI state)
 * When 'on': Prefers DL reads with fallback to props/UI state
 */

/**
 * Check if DL reads should be preferred
 * @returns true if VITE_DL_READS=on, false otherwise
 */
export function shouldPreferDLReads(): boolean {
  const rawValue = String(import.meta.env.VITE_DL_READS ?? 'off').toLowerCase().trim();
  return rawValue === 'on' || rawValue === 'true' || rawValue === '1';
}
