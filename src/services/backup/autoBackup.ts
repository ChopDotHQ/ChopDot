/**
 * Auto-Backup Service
 * 
 * Automatically backs up pots to IPFS when they change.
 * Uses debouncing to batch multiple changes into single backup.
 * 
 * FREE: Uses IPFS-only storage (no Crust pinning costs)
 */

import type { Pot } from '../../schema/pot';
import { savePotSnapshotCrust } from './crustBackup';
import { saveUserPotIndex, cacheUserIndexCid } from '../storage/userIndex';

// Debounce timer (2 seconds)
let backupTimers = new Map<string, NodeJS.Timeout>();

// Backup queue to prevent simultaneous uploads (rate limiting)
type BackupTask = {
  pot: Pot;
  walletAddress?: string;
};

let backupQueue: BackupTask[] = [];
let isProcessingQueue = false;
const QUEUE_DELAY_MS = 3000; // 3 seconds between backups to avoid rate limits

/**
 * Auto-backup a pot to IPFS
 * Debounced: waits 2 seconds after last change before backing up
 * 
 * @param pot - Pot to backup
 * @param walletAddress - User's wallet address (for user index update)
 */
export async function autoBackupPot(
  pot: Pot,
  walletAddress?: string
): Promise<void> {
  // Skip if Crust is disabled
  const crustEnabled = import.meta.env.VITE_ENABLE_CRUST === '1';
  if (!crustEnabled) {
    console.log('[AutoBackup] Crust disabled, skipping backup');
    return;
  }

  // Clear existing timer for this pot
  const existingTimer = backupTimers.get(pot.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer (debounce)
  const timer = setTimeout(async () => {
    // Add to queue instead of processing immediately
    // Remove any existing entry for this pot
    backupQueue = backupQueue.filter(task => task.pot.id !== pot.id);
    backupQueue.push({ pot, walletAddress });
    
    // Start processing queue if not already processing
    processBackupQueue();
    
    // Clean up timer
    backupTimers.delete(pot.id);
  }, 2000); // 2 second debounce

  backupTimers.set(pot.id, timer);
}

/**
 * Process backup queue sequentially to avoid rate limiting
 */
async function processBackupQueue(): Promise<void> {
  if (isProcessingQueue || backupQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (backupQueue.length > 0) {
    const task = backupQueue.shift();
    if (!task) break;

    try {
      console.log('[AutoBackup] Backing up pot to IPFS', {
        potId: task.pot.id,
        potName: task.pot.name,
        queueLength: backupQueue.length,
      });

      // Backup pot snapshot to IPFS (FREE)
      const { cid } = await savePotSnapshotCrust(
        JSON.stringify({
          potId: task.pot.id,
          name: task.pot.name,
          type: task.pot.type,
          baseCurrency: task.pot.baseCurrency,
          members: task.pot.members,
          expenses: task.pot.expenses,
          createdAt: task.pot.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, null, 2)
      );

      console.log('[AutoBackup] Pot backed up successfully', {
        potId: task.pot.id,
        cid,
      });

      // Store CID in pot metadata (for tracking and user index)
      // Update pot in localStorage with CID
      try {
        const potsJson = localStorage.getItem('chopdot_pots');
        if (potsJson) {
          const pots: Pot[] = JSON.parse(potsJson);
          const updatedPots = pots.map((p) => 
            p.id === task.pot.id 
              ? { ...p, lastBackupCid: cid, lastBackupAt: new Date().toISOString() }
              : p
          );
          localStorage.setItem('chopdot_pots', JSON.stringify(updatedPots));
        }
      } catch (error) {
        console.warn('[AutoBackup] Failed to store CID in pot metadata:', error);
      }

      // Update user index if wallet address provided (only after last pot)
      if (task.walletAddress && backupQueue.length === 0) {
        await updateUserPotIndex(task.walletAddress);
      }

      // Wait before processing next item to avoid rate limiting
      if (backupQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY_MS));
      }
    } catch (error) {
      console.error('[AutoBackup] Failed to backup pot:', error);
      // Continue processing queue even if one fails
      // Wait before next attempt
      if (backupQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY_MS));
    }
    }
  }

  isProcessingQueue = false;
}

/**
 * Update user's pot index on IPFS
 * Collects all pot CIDs and updates the user index
 */
async function updateUserPotIndex(walletAddress: string): Promise<void> {
  try {
    // Get all pots from localStorage
    const potsJson = localStorage.getItem('chopdot_pots');
    if (!potsJson) {
      return;
    }

    const pots: Pot[] = JSON.parse(potsJson);
    
    // Collect pot CIDs from pot metadata
    // If a pot doesn't have a CID, we'll skip it (it will be backed up on next change)
    const potCids: string[] = [];
    
    for (const pot of pots) {
      const cid = (pot as any).lastBackupCid;
      if (cid && typeof cid === 'string') {
        potCids.push(cid);
      }
    }
    
    // Only update index if we have at least one CID
    if (potCids.length === 0) {
      console.log('[AutoBackup] No pot CIDs found, skipping user index update');
      return;
    }

    // Save user index to IPFS (FREE)
    const cid = await saveUserPotIndex(walletAddress, potCids);
    
    // Cache the CID for later retrieval
    cacheUserIndexCid(walletAddress, cid);

    console.log('[AutoBackup] User pot index updated', {
      walletAddress: walletAddress.slice(0, 10) + '...',
      potCount: potCids.length,
      cid,
    });
  } catch (error) {
    console.error('[AutoBackup] Failed to update user pot index:', error);
    // Silent fail - non-critical
  }
}

/**
 * Force immediate backup (skip debounce)
 * Useful for manual backups or before important operations
 */
export async function forceBackupPot(
  pot: Pot,
  walletAddress?: string
): Promise<string | null> {
  // Clear any pending timer
  const existingTimer = backupTimers.get(pot.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
    backupTimers.delete(pot.id);
  }

  try {
    console.log('[AutoBackup] Force backing up pot', {
      potId: pot.id,
      potName: pot.name,
    });

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

    // Update user index if wallet address provided
    if (walletAddress) {
      await updateUserPotIndex(walletAddress);
    }

    return cid;
  } catch (error) {
    console.error('[AutoBackup] Force backup failed:', error);
    return null;
  }
}

/**
 * Clean up all backup timers and queue
 * Call this when app unmounts or user logs out
 */
export function cleanupBackupTimers(): void {
  backupTimers.forEach((timer) => clearTimeout(timer));
  backupTimers.clear();
  backupQueue = [];
  isProcessingQueue = false;
  console.log('[AutoBackup] Cleaned up backup timers and queue');
}

