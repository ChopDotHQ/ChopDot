/**
 * Backup Service
 * 
 * Provides interface for backing up pots to Crust/IPFS.
 */

import type { Pot } from '../../schema/pot';
import { savePotSnapshotCrust } from './crustBackup';

/**
 * Save a pot snapshot to Crust/IPFS
 * 
 * @param pot - Pot to backup
 * @returns CID of the uploaded snapshot
 * @throws Error if backup fails
 */
export async function savePotSnapshot(pot: Pot): Promise<{ cid: string }> {
  // Check if Crust is enabled
  const crustEnabled = import.meta.env.VITE_ENABLE_CRUST === '1';
  
  if (!crustEnabled) {
    // In dev mode, return a fake CID if Crust is disabled
    if (import.meta.env.DEV) {
      const fakeCid = `Qm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      console.log('[BackupService] Crust disabled, returning stub CID', { potId: pot.id, cid: fakeCid });
      await new Promise(resolve => setTimeout(resolve, 100));
      return { cid: fakeCid };
    }
    throw new Error('Crust backup is disabled. Set VITE_ENABLE_CRUST=1 to enable.');
  }
  
  try {
    // Build pot snapshot JSON
    const snapshot = JSON.stringify({
      potId: pot.id,
      name: pot.name,
      type: pot.type,
      baseCurrency: pot.baseCurrency,
      members: pot.members,
      expenses: pot.expenses,
      createdAt: pot.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, null, 2);
    
    // Upload to Crust/IPFS
    const { cid, gatewayUrl } = await savePotSnapshotCrust(snapshot);
    
    console.log('[BackupService] Pot snapshot uploaded to Crust', {
      potId: pot.id,
      cid,
      gatewayUrl,
    });
    
    return { cid };
  } catch (error) {
    console.error('[BackupService] Failed to backup pot snapshot:', error);
    throw error;
  }
}

