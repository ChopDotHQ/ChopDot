/**
 * User Index Service
 * 
 * Stores user's pot list on IPFS, keyed by wallet address.
 * This enables account recovery, cross-device sync, and data portability.
 * 
 * FREE: Uses IPFS-only storage (no Crust pinning costs)
 */

import { uploadBufferToIPFS, getIPFSGatewayUrl } from './ipfs';

export interface UserPotIndex {
  walletAddress: string; // SS58 address
  potCids: string[]; // Array of IPFS CIDs for user's pots
  updatedAt: string; // ISO timestamp
  version: number; // Schema version for future migrations
}

const INDEX_VERSION = 1;

/**
 * Generate deterministic IPFS path for user index
 * Uses hash of wallet address to create consistent path
 */
function getUserIndexPath(walletAddress: string): string {
  // Simple hash function (for deterministic path)
  // In production, use crypto.subtle.digest or similar
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user-index/${Math.abs(hash).toString(36)}.json`;
}

/**
 * Save user's pot list index to IPFS
 * 
 * @param walletAddress - User's wallet address (SS58 format)
 * @param potCids - Array of IPFS CIDs for user's pots
 * @returns CID of the uploaded index
 */
export async function saveUserPotIndex(
  walletAddress: string,
  potCids: string[]
): Promise<string> {
  try {
    console.log('[UserIndex] Saving user pot index', {
      walletAddress: walletAddress.slice(0, 10) + '...',
      potCount: potCids.length,
    });

    const index: UserPotIndex = {
      walletAddress,
      potCids,
      updatedAt: new Date().toISOString(),
      version: INDEX_VERSION,
    };

    // Convert to JSON buffer
    const buffer = new TextEncoder().encode(JSON.stringify(index, null, 2));
    
    // Upload to IPFS (FREE)
    const cid = await uploadBufferToIPFS(
      buffer,
      getUserIndexPath(walletAddress),
      true // Use Crust gateway
    );

    console.log('[UserIndex] User pot index saved', {
      walletAddress: walletAddress.slice(0, 10) + '...',
      cid,
      potCount: potCids.length,
    });

    return cid;
  } catch (error) {
    console.error('[UserIndex] Failed to save user pot index:', error);
    throw new Error(
      `Failed to save user pot index: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve user's pot list index from IPFS
 * 
 * @param walletAddress - User's wallet address (SS58 format)
 * @returns User pot index or null if not found
 */
export async function getUserPotIndex(
  walletAddress: string
): Promise<UserPotIndex | null> {
  try {
    console.log('[UserIndex] Retrieving user pot index', {
      walletAddress: walletAddress.slice(0, 10) + '...',
    });

    // Try to fetch from IPFS using deterministic path
    // Note: We need to know the CID or use IPNS (InterPlanetary Name System)
    // For now, we'll use a different approach: store CID in localStorage
    
    // Check localStorage for cached CID
    const cachedCid = localStorage.getItem(`user_index_cid_${walletAddress}`);
    
    if (cachedCid) {
      try {
        const gatewayUrl = getIPFSGatewayUrl(cachedCid, true);
        const response = await fetch(gatewayUrl);
        
        if (response.ok) {
          const index: UserPotIndex = await response.json();
          
          // Validate index
          if (index.walletAddress === walletAddress && Array.isArray(index.potCids)) {
            console.log('[UserIndex] User pot index retrieved', {
              walletAddress: walletAddress.slice(0, 10) + '...',
              potCount: index.potCids.length,
            });
            return index;
          }
        }
      } catch (error) {
        console.warn('[UserIndex] Failed to fetch cached index:', error);
      }
    }

    // Index not found
    console.log('[UserIndex] User pot index not found', {
      walletAddress: walletAddress.slice(0, 10) + '...',
    });
    return null;
  } catch (error) {
    console.error('[UserIndex] Failed to retrieve user pot index:', error);
    return null; // Return null on error (non-critical)
  }
}

/**
 * Cache user index CID in localStorage
 * This helps us retrieve the index later
 */
export function cacheUserIndexCid(walletAddress: string, cid: string): void {
  try {
    localStorage.setItem(`user_index_cid_${walletAddress}`, cid);
    console.log('[UserIndex] Cached user index CID', {
      walletAddress: walletAddress.slice(0, 10) + '...',
      cid,
    });
  } catch (error) {
    console.warn('[UserIndex] Failed to cache CID:', error);
  }
}

/**
 * Get cached user index CID from localStorage
 */
export function getCachedUserIndexCid(walletAddress: string): string | null {
  return localStorage.getItem(`user_index_cid_${walletAddress}`);
}

