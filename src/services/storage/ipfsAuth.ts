/**
 * IPFS Authentication Helper
 * 
 * Automatically handles user authentication for IPFS uploads.
 * Signs a message once and caches the signature for future uploads.
 * 
 * Supports both browser extensions and WalletConnect/Nova Wallet.
 */

import { signPolkadotMessage } from '../../utils/walletAuth';
import { createWalletConnectSigner, getWalletConnectSession } from '../../services/chain/walletconnect';
import { stringToHex } from '@polkadot/util';

// Cache for user signatures (keyed by wallet address)
const signatureCache = new Map<string, string>();

/**
 * Get connector type from localStorage
 */
function getConnectorType(): 'extension' | 'walletconnect' | null {
  try {
    const stored = localStorage.getItem('account.connector');
    if (stored === 'extension' || stored === 'walletconnect') {
      return stored;
    }
  } catch (error) {
    // localStorage not available
  }
  return null;
}

// Track pending signature requests to prevent duplicate calls
const pendingSignatures = new Map<string, Promise<string>>();

/**
 * Get or generate authentication signature for IPFS uploads
 * 
 * This signs the user's wallet address once and caches it for future uploads.
 * Supports both browser extensions and WalletConnect/Nova Wallet.
 * 
 * Prevents duplicate signing requests and handles rate limiting gracefully.
 * 
 * @param walletAddress - User's wallet address
 * @returns Signature hex string
 */
export async function getIPFSAuthSignature(walletAddress: string): Promise<string> {
  // Check cache first
  if (signatureCache.has(walletAddress)) {
    return signatureCache.get(walletAddress)!;
  }

  // If there's already a pending signature request for this address, wait for it
  const pendingRequest = pendingSignatures.get(walletAddress);
  if (pendingRequest) {
    return pendingRequest;
  }

  // Create new signature request
  const signaturePromise = (async () => {
    try {
      // Generate signature by signing the wallet address
      // This is safe - we're just signing the address itself for authentication
      const message = walletAddress;
      let signature: string;

      // Detect connector type and use appropriate signing method
      const connector = getConnectorType();
      
      if (connector === 'walletconnect') {
        // Use WalletConnect signer for Nova Wallet/SubWallet mobile
        try {
          const session = getWalletConnectSession();
          if (!session) {
            throw new Error('WalletConnect session not found');
          }

          const signer = createWalletConnectSigner(walletAddress);
          const result = await signer.signRaw({
            address: walletAddress,
            data: stringToHex(message),
          });
          signature = result.signature;

          console.log('[IPFSAuth] Generated signature via WalletConnect', {
            walletAddress: walletAddress.slice(0, 10) + '...',
          });
        } catch (error) {
          console.error('[IPFSAuth] WalletConnect signing failed, falling back to extension method:', error);
          // Fall back to extension method if WalletConnect fails
          signature = await signPolkadotMessage(walletAddress, message);
        }
      } else {
        // Use browser extension signer (default)
        signature = await signPolkadotMessage(walletAddress, message);
        
        console.log('[IPFSAuth] Generated signature via browser extension', {
          walletAddress: walletAddress.slice(0, 10) + '...',
        });
      }

      // Cache for future use
      signatureCache.set(walletAddress, signature);

      console.log('[IPFSAuth] Generated and cached signature for IPFS uploads', {
        walletAddress: walletAddress.slice(0, 10) + '...',
        connector: connector || 'extension',
      });

      return signature;
    } catch (error) {
      // If rate limited, throw a more helpful error
      if (error instanceof Error && error.message.includes('Rate limit')) {
        throw new Error('Wallet signing rate limit exceeded. Please wait a moment and try again.');
      }
      throw error;
    } finally {
      // Clean up pending request
      pendingSignatures.delete(walletAddress);
    }
  })();

  // Store pending request
  pendingSignatures.set(walletAddress, signaturePromise);

  return signaturePromise;
}

/**
 * Clear cached signature (e.g., on logout)
 */
export function clearIPFSAuthCache(walletAddress?: string): void {
  if (walletAddress) {
    signatureCache.delete(walletAddress);
  } else {
    signatureCache.clear();
  }
}

// Removed setGlobalIPFSAuth - no longer needed
// Backend receives auth via formData (walletAddress/signature fields)
// This improves security by not exposing signatures in window globals

