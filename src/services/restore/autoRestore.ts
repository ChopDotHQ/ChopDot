/**
 * Auto-Restore Service
 * 
 * Automatically restores pots from IPFS when localStorage is empty or corrupted.
 * Uses user's wallet address to find their pot list index.
 * 
 * FREE: Uses IPFS-only storage (no Crust pinning costs)
 */

import type { Pot } from '../../schema/pot';
import { getUserPotIndex } from '../storage/userIndex';
import { fetchFromIPFSWithFallback } from '../storage/ipfs';

/**
 * Attempt to restore pots from IPFS
 * 
 * @param walletAddress - User's wallet address (SS58 format)
 * @returns Array of restored pots, or empty array if none found
 */
export async function attemptAutoRestore(walletAddress: string): Promise<Pot[]> {
  try {
    console.log('[AutoRestore] Attempting to restore pots from IPFS', {
      walletAddress: walletAddress.slice(0, 10) + '...',
    });

    // Check if localStorage has data
    const localPotsJson = localStorage.getItem('chopdot_pots');
    if (localPotsJson && localPotsJson.length > 0) {
      try {
        const localPots = JSON.parse(localPotsJson);
        if (Array.isArray(localPots) && localPots.length > 0) {
          console.log('[AutoRestore] LocalStorage has data, skipping restore', {
            potCount: localPots.length,
          });
          return localPots; // Use local data
        }
      } catch (error) {
        console.warn('[AutoRestore] LocalStorage data corrupted, attempting restore');
      }
    }

    // localStorage empty or corrupted - try IPFS restore
    const userIndex = await getUserPotIndex(walletAddress);
    
    if (!userIndex || !userIndex.potCids || userIndex.potCids.length === 0) {
      console.log('[AutoRestore] No backup found on IPFS', {
        walletAddress: walletAddress.slice(0, 10) + '...',
      });
      return []; // No backup found
    }

    console.log('[AutoRestore] Found user index, restoring pots', {
      walletAddress: walletAddress.slice(0, 10) + '...',
      potCount: userIndex.potCids.length,
    });

    // Fetch all pots from IPFS
    const restoredPots: Pot[] = [];
    
    for (const cid of userIndex.potCids) {
      try {
        const pot = await fetchPotFromIPFS(cid);
        if (pot) {
          restoredPots.push(pot);
          console.log('[AutoRestore] Restored pot', {
            potId: pot.id,
            potName: pot.name,
            cid,
          });
        }
      } catch (error) {
        console.warn(`[AutoRestore] Failed to fetch pot ${cid}:`, error);
        // Continue with other pots
      }
    }

    // Save restored pots to localStorage
    if (restoredPots.length > 0) {
      try {
        localStorage.setItem('chopdot_pots', JSON.stringify(restoredPots));
        console.log(`[AutoRestore] Restored ${restoredPots.length} pot(s) from IPFS`);
      } catch (error) {
        console.error('[AutoRestore] Failed to save restored pots:', error);
      }
    }

    return restoredPots;
  } catch (error) {
    console.error('[AutoRestore] Failed to restore pots:', error);
    return []; // Fallback to empty array
  }
}

/**
 * Fetch a pot from IPFS using its CID
 * 
 * @param cid - IPFS Content Identifier
 * @returns Pot object or null if not found
 */
async function fetchPotFromIPFS(cid: string): Promise<Pot | null> {
  try {
    // Try fetching with fallback across multiple gateways
    const response = await fetchFromIPFSWithFallback(cid);
    
    if (!response) {
      console.warn(`[AutoRestore] Failed to fetch pot ${cid} from all gateways`);
      return null;
    }

    const potData = await response.json();
    
    // Validate pot structure
    if (potData && potData.potId && potData.name) {
      // Convert snapshot format to Pot format with all required fields
      const pot: Pot = {
        id: potData.potId,
        name: potData.name,
        type: (potData.type === 'savings' ? 'savings' : 'expense') as 'expense' | 'savings',
        baseCurrency: (potData.baseCurrency === 'DOT' ? 'DOT' : 'USD') as 'DOT' | 'USD',
        members: (potData.members || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          address: m.address || null,
          verified: m.verified || false,
          role: m.role === 'Owner' ? 'Owner' : (m.role === 'Member' ? 'Member' : undefined),
          status: m.status || 'active',
        })),
        expenses: potData.expenses || [],
        history: potData.history || [],
        budgetEnabled: potData.budgetEnabled || false,
        checkpointEnabled: potData.checkpointEnabled ?? true,
        archived: potData.archived || false,
        mode: potData.mode || 'casual',
        createdAt: potData.createdAt,
        updatedAt: potData.updatedAt,
      };
      
      return pot;
    }

    return null;
  } catch (error) {
    console.error(`[AutoRestore] Error fetching pot ${cid}:`, error);
    return null;
  }
}

/**
 * Restore a single pot from IPFS CID
 * Useful for pot sharing/import
 * 
 * @param cid - IPFS Content Identifier
 * @returns Pot object or null if not found
 */
export async function restorePotFromCID(cid: string): Promise<Pot | null> {
  return fetchPotFromIPFS(cid);
}

