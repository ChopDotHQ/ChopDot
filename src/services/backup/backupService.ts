/**
 * Backup Service (Stub)
 * 
 * Provides interface for backing up pots to Crust/IPFS.
 * Currently returns a stub CID; will be wired to real Crust uploader later.
 */

import type { Pot } from '../../schema/pot';

/**
 * Save a pot snapshot to Crust/IPFS
 * 
 * @param pot - Pot to backup
 * @returns CID of the uploaded snapshot
 * @throws Error if backup fails
 */
export async function savePotSnapshot(pot: Pot): Promise<{ cid: string }> {
  // Task 7: Stub implementation - returns fake CID in dev
  // TODO: Wire to real Crust uploader
  
  if (import.meta.env.DEV) {
    // Generate a fake CID for dev testing
    const fakeCid = `Qm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (import.meta.env.DEV) {
      console.log('[BackupService] Stub backup completed', { potId: pot.id, cid: fakeCid });
    }
    
    return { cid: fakeCid };
  }
  
  // In production, this would call the real Crust uploader
  throw new Error('Crust backup not yet implemented');
}

