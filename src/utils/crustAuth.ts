/**
 * Crust Web3Auth Token Generator
 * 
 * Generates authentication tokens for Crust IPFS API using Web3Auth.
 * 
 * Based on: https://wiki.crust.network/docs/en/buildIPFSW3AuthPin
 */

import { signPolkadotMessage } from './walletAuth';

/**
 * Generate Crust Web3Auth token for IPFS API
 * 
 * Format: Authorization: Basic base64(ChainType-PubKey:SignedMsg)
 * 
 * @param walletAddress - Your Polkadot wallet address (SS58 format)
 * @param signer - Function to sign a message (returns signature hex string)
 * @returns Base64-encoded Web3Auth token
 */
export async function generateCrustWeb3AuthToken(
  walletAddress: string,
  signer: (message: string) => Promise<string>
): Promise<string> {
  try {
    // Step 1: Create the message to sign
    // Crust expects the message to be the wallet address itself
    const message = walletAddress;

    // Step 2: Sign the message
    const signature = await signer(message);

    // Step 3: Build the auth string
    // Format: sub-<PubKey>:<SignedMsg>
    // For Polkadot/Substrate, ChainType is "sub"
    const authString = `sub-${walletAddress}:${signature}`;

    // Step 4: Base64 encode
    const token = btoa(authString);

    console.log('[CrustAuth] Generated Web3Auth token', {
      walletAddress: walletAddress.slice(0, 10) + '...',
      messageLength: message.length,
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
 * Generate Crust Web3Auth token using Polkadot wallet
 * 
 * Convenience function that uses the app's wallet connection
 * 
 * @param walletAddress - Your Polkadot wallet address (SS58 format)
 * @returns Base64-encoded Web3Auth token
 */
export async function generateCrustTokenFromWallet(
  walletAddress: string
): Promise<string> {
  // Use the existing signPolkadotMessage function
  const signer = async (message: string) => {
    return await signPolkadotMessage(walletAddress, message);
  };

  return await generateCrustWeb3AuthToken(walletAddress, signer);
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








