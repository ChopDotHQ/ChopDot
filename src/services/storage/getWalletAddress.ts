/**
 * Get Wallet Address Helper
 * 
 * Automatically retrieves the current user's wallet address from various sources.
 * Used for automatic IPFS authentication.
 */

/**
 * Get wallet address from various sources
 * 
 * Tries multiple methods to get the current wallet address:
 * 1. localStorage (cached from AccountContext)
 * 2. window.__chopdot_wallet_address (set by AccountContext)
 * 3. Returns null if not found
 */
export function getWalletAddress(): string | null {
  // Try localStorage first (most reliable)
  try {
    const stored = localStorage.getItem('account.address0');
    if (stored) {
      return stored;
    }
  } catch (error) {
    // localStorage not available
  }

  // Try window global (set by AccountContext)
  try {
    const globalAddress = (window as any).__chopdot_wallet_address;
    if (globalAddress && typeof globalAddress === 'string') {
      return globalAddress;
    }
  } catch (error) {
    // window not available
  }

  return null;
}








