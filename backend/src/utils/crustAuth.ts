/**
 * Crust Web3Auth Token Generator (Backend)
 * 
 * Generates authentication tokens for Crust IPFS API using Web3Auth.
 * 
 * Format: Authorization: Basic base64(sub-<PubKey>:<SignedMsg>)
 */

/**
 * Generate Crust Web3Auth token from wallet address and signature
 * 
 * @param walletAddress - User's wallet address (SS58 format)
 * @param signature - Signature of the wallet address (hex string)
 * @returns Base64-encoded Web3Auth token
 */
export function generateCrustWeb3AuthToken(
  walletAddress: string,
  signature: string
): string {
  try {
    // Build the auth string
    // Format: sub-<PubKey>:<SignedMsg>
    // For Polkadot/Substrate, ChainType is "sub"
    const authString = `sub-${walletAddress}:${signature}`;

    // Base64 encode
    const token = Buffer.from(authString).toString('base64');

    console.log('[CrustAuth] Generated Web3Auth token', {
      walletAddress: walletAddress.slice(0, 10) + '...',
      signatureLength: signature.length,
      tokenLength: token.length,
    });

    return token;
  } catch (error) {
    console.error('[CrustAuth] Failed to generate token:', error);
    throw new Error(
      `Failed to generate Crust Web3Auth token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Format the token for use in Authorization header
 * 
 * @param token - Base64-encoded Web3Auth token
 * @returns Authorization header value
 */
export function formatCrustAuthHeader(token: string): string {
  return `Basic ${token}`;
}









