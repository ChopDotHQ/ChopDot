/**
 * Pot Sharing Service
 * 
 * Enables sharing pots via IPFS CID and importing pots from CIDs.
 * 
 * FREE: Uses IPFS-only storage (no Crust pinning costs)
 */

import type { Pot } from '../../schema/pot';
import { savePotSnapshotCrust } from '../backup/crustBackup';
import { restorePotFromCID } from '../restore/autoRestore';
import { getIPFSGatewayUrl } from '../storage/ipfs';

/**
 * Generate shareable link for a pot
 * 
 * @param potCid - IPFS CID of the pot
 * @returns Shareable URL
 */
export function getPotShareLink(potCid: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/import-pot?cid=${potCid}`;
}

/**
 * Generate shareable IPFS gateway URL for a pot
 * 
 * @param potCid - IPFS CID of the pot
 * @returns IPFS gateway URL
 */
export function getPotIPFSUrl(potCid: string): string {
  return getIPFSGatewayUrl(potCid, true);
}

/**
 * Share a pot (backup to IPFS and return shareable link)
 * 
 * @param pot - Pot to share
 * @returns Shareable link and IPFS gateway URL
 */
export async function sharePot(pot: Pot): Promise<{
  cid: string;
  shareLink: string;
  ipfsUrl: string;
}> {
  try {
    console.log('[PotShare] Sharing pot', {
      potId: pot.id,
      potName: pot.name,
    });

    // Backup pot to IPFS (FREE)
    const { cid } = await savePotSnapshotCrust(
      JSON.stringify({
        potId: pot.id,
        name: pot.name,
        type: pot.type,
        baseCurrency: pot.baseCurrency,
        members: pot.members,
        expenses: pot.expenses,
        createdAt: pot.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, null, 2)
    );

    const shareLink = getPotShareLink(cid);
    const ipfsUrl = getPotIPFSUrl(cid);

    console.log('[PotShare] Pot shared successfully', {
      potId: pot.id,
      cid,
      shareLink,
    });

    return {
      cid,
      shareLink,
      ipfsUrl,
    };
  } catch (error) {
    console.error('[PotShare] Failed to share pot:', error);
    throw new Error(
      `Failed to share pot: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Import a pot from IPFS CID
 * 
 * @param cid - IPFS Content Identifier
 * @returns Pot object
 * @throws Error if pot not found or invalid
 */
export async function importPotFromCID(cid: string): Promise<Pot> {
  try {
    console.log('[PotShare] Importing pot from CID', { cid });

    const pot = await restorePotFromCID(cid);
    
    if (!pot) {
      throw new Error('Pot not found on IPFS');
    }

    // Validate pot structure
    if (!pot.id || !pot.name) {
      throw new Error('Invalid pot data');
    }

    console.log('[PotShare] Pot imported successfully', {
      potId: pot.id,
      potName: pot.name,
      cid,
    });

    return pot;
  } catch (error) {
    console.error('[PotShare] Failed to import pot:', error);
    throw new Error(
      `Failed to import pot: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract CID from shareable link or URL
 * 
 * @param url - Shareable link, IPFS gateway URL, or just a CID
 * @returns CID or null if not found
 */
export function extractCIDFromUrl(url: string): string | null {
  try {
    // First check if it's just a CID (common case)
    if (/^[a-zA-Z0-9]{46,}$/.test(url.trim())) {
      return url.trim();
    }

    // Try to extract from query parameter (if it's a full URL)
    try {
      const urlObj = new URL(url);
      const cidParam = urlObj.searchParams.get('cid');
      if (cidParam) {
        return cidParam;
      }

      // Try to extract from IPFS gateway URL path
      // Format: https://cloudflare-ipfs.com/ipfs/QmABC123... or any IPFS gateway
      const ipfsMatch = urlObj.pathname.match(/\/ipfs\/([a-zA-Z0-9]+)/);
      if (ipfsMatch && ipfsMatch[1]) {
        return ipfsMatch[1];
      }
    } catch (urlError) {
      // Not a valid URL, might be just a CID or partial URL
      // Try regex matching on the string directly
      const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
      if (ipfsMatch && ipfsMatch[1]) {
        return ipfsMatch[1];
      }

      // Try to extract CID from query string pattern even if not full URL
      const queryMatch = url.match(/[?&]cid=([a-zA-Z0-9]+)/);
      if (queryMatch && queryMatch[1]) {
        return queryMatch[1];
      }
    }

    return null;
  } catch (error) {
    console.error('[PotShare] Failed to extract CID from URL:', error);
    return null;
  }
}

