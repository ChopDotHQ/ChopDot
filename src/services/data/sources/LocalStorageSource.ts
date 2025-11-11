/**
 * LocalStorage Data Source
 * 
 * Reads from and writes to localStorage.
 * Handles migration, backup, and size checks.
 * 
 * Migration runs once on first read (lazy migration).
 */

import type { Pot } from '../types';
import { migrateAllPotsOnLoad, needsMigration } from '../../../utils/migratePot';
import { QuotaExceededError, ValidationError } from '../errors';
import { PotSchema } from '../../../schema/pot';
import { ensureDefaultPots } from '../seeds/defaultPots';

const STORAGE_KEYS = {
  pots: 'chopdot_pots',
  potsBackup: 'chopdot_pots_backup',
  settlements: 'chopdot_settlements',
  notifications: 'chopdot_notifications',
} as const;

const MAX_SIZES = {
  pots: 1_000_000, // 1MB
  settlements: 500_000, // 500KB
  notifications: 100_000, // 100KB
} as const;

/**
 * LocalStorage data source
 * 
 * Provides async interface to localStorage with:
 * - Automatic migration on first read
 * - Backup key handling
 * - Size limit checks
 * - Safe JSON parsing with validation
 */
export class LocalStorageSource {
  private migrated = false;

  /**
   * Get all pots from localStorage
   * Runs migration on first access if needed
   */
  async getPots(): Promise<Pot[]> {
    try {
      // Try main key first
      const savedPots = localStorage.getItem(STORAGE_KEYS.pots);
      
      if (savedPots && savedPots.length < MAX_SIZES.pots) {
        const parsed = JSON.parse(savedPots);
        if (Array.isArray(parsed)) {
          // Migrate if needed (only once)
          if (!this.migrated && needsMigration(parsed)) {
            const migrated = migrateAllPotsOnLoad(parsed);
            this.migrated = true;
            
            // Save migrated pots back
            try {
              const migratedData = JSON.stringify(migrated);
              if (migratedData.length < MAX_SIZES.pots) {
                localStorage.setItem(STORAGE_KEYS.pots, migratedData);
                localStorage.setItem(STORAGE_KEYS.potsBackup, migratedData);
                console.info('[LocalStorageSource] Migrated pots to current schema');
              }
            } catch (saveErr) {
              console.warn('[LocalStorageSource] Failed to save migrated pots:', saveErr);
            }
            
            return migrated;
          }
          
          this.migrated = true;
          let migrated = migrateAllPotsOnLoad(parsed); // Always migrate to ensure schema compliance
          
          // Ensure all default pots exist (adds missing ones without overwriting)
          const beforeCount = migrated.length;
          migrated = ensureDefaultPots(migrated);
          const addedCount = migrated.length - beforeCount;
          
          // Save updated pots back to localStorage if any were added
          if (addedCount > 0) {
            try {
              const updatedJson = JSON.stringify(migrated);
              if (updatedJson.length < MAX_SIZES.pots) {
                localStorage.setItem(STORAGE_KEYS.pots, updatedJson);
                localStorage.setItem(STORAGE_KEYS.potsBackup, updatedJson);
                console.log(`[LocalStorageSource] Added ${addedCount} default pot(s)`);
              }
            } catch (saveErr) {
              console.warn('[LocalStorageSource] Failed to save updated pots:', saveErr);
            }
          }
          
          return migrated;
        }
      }

      // Try backup if main key is missing or corrupted
      const backupPots = localStorage.getItem(STORAGE_KEYS.potsBackup);
      if (backupPots && backupPots.length < MAX_SIZES.pots) {
        try {
          const parsed = JSON.parse(backupPots);
          if (Array.isArray(parsed)) {
            console.warn('[LocalStorageSource] Restored pots from backup');
            const migrated = migrateAllPotsOnLoad(parsed);
            this.migrated = true;
            
            // Restore to main key
            try {
              const migratedData = JSON.stringify(migrated);
              if (migratedData.length < MAX_SIZES.pots) {
                localStorage.setItem(STORAGE_KEYS.pots, migratedData);
              }
            } catch (saveErr) {
              console.warn('[LocalStorageSource] Failed to restore migrated backup:', saveErr);
            }
            
            return migrated;
          }
        } catch (e) {
          console.error('[LocalStorageSource] Failed to restore from backup:', e);
        }
      }

      // No data found - return default pots
      this.migrated = true;
      const defaultPots = ensureDefaultPots([]);
      
      // Save default pots to localStorage for future loads
      try {
        const defaultJson = JSON.stringify(defaultPots);
        if (defaultJson.length < MAX_SIZES.pots) {
          localStorage.setItem(STORAGE_KEYS.pots, defaultJson);
          localStorage.setItem(STORAGE_KEYS.potsBackup, defaultJson);
          console.log('[LocalStorageSource] Seeded default pots');
        }
      } catch (saveErr) {
        console.warn('[LocalStorageSource] Failed to save default pots:', saveErr);
      }
      
      return defaultPots;
    } catch (e) {
      console.error('[LocalStorageSource] Failed to load pots:', e);
      
      // Try to clean up corrupted data
      try {
        localStorage.removeItem(STORAGE_KEYS.pots);
      } catch (removeErr) {
        console.warn('[LocalStorageSource] Failed to remove corrupted pots:', removeErr);
      }
      
      return [];
    }
  }

  /**
   * Save pots to localStorage
   * Also saves to backup key
   */
  async savePots(pots: Pot[]): Promise<void> {
    try {
      const data = JSON.stringify(pots);
      
      // Check size before saving
      if (data.length > MAX_SIZES.pots) {
        throw new QuotaExceededError(
          `Pots data too large (${data.length} bytes, max ${MAX_SIZES.pots})`
        );
      }

      localStorage.setItem(STORAGE_KEYS.pots, data);
      
      // Always save to backup
      try {
        localStorage.setItem(STORAGE_KEYS.potsBackup, data);
      } catch (backupErr) {
        // Backup save failure is non-critical
        console.warn('[LocalStorageSource] Failed to save backup:', backupErr);
      }
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        throw e;
      }
      
      // Handle quota exceeded
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw new QuotaExceededError('localStorage quota exceeded', { originalError: e });
      }
      
      throw new ValidationError('Failed to save pots', { originalError: e });
    }
  }

  /**
   * Get a single pot by ID
   */
  async getPot(id: string): Promise<Pot | null> {
    const pots = await this.getPots();
    return pots.find(p => p.id === id) || null;
  }

  /**
   * Save a single pot (updates existing or adds new)
   */
  async savePot(pot: Pot): Promise<void> {
    const pots = await this.getPots();
    const existingIndex = pots.findIndex(p => p.id === pot.id);
    
    if (existingIndex >= 0) {
      pots[existingIndex] = pot;
    } else {
      pots.push(pot);
    }
    
    await this.savePots(pots);
  }

  /**
   * Delete a pot by ID
   */
  async deletePot(id: string): Promise<void> {
    const pots = await this.getPots();
    const filtered = pots.filter(p => p.id !== id);
    
    if (filtered.length === pots.length) {
      // Pot not found - this is OK, idempotent operation
      return;
    }
    
    await this.savePots(filtered);
  }

  /**
   * Export a pot (returns pot object)
   */
  async exportPot(id: string): Promise<Pot> {
    const pot = await this.getPot(id);
    if (!pot) {
      throw new ValidationError(`Pot with id "${id}" not found`);
    }
    return pot;
  }

  /**
   * Import a pot (adds to storage, handles de-duplication)
   */
  async importPot(pot: Pot): Promise<Pot> {
    // Validate pot schema
    const validation = PotSchema.safeParse(pot);
    if (!validation.success) {
      throw new ValidationError('Invalid pot data', { issues: validation.error.issues });
    }

    const validatedPot = validation.data;
    const pots = await this.getPots();
    
    // Check for duplicate ID
    const existingIndex = pots.findIndex(p => p.id === validatedPot.id);
    if (existingIndex >= 0) {
      // Update existing pot
      pots[existingIndex] = validatedPot;
    } else {
      // Add new pot
      pots.push(validatedPot);
    }
    
    await this.savePots(pots);
    return validatedPot;
  }

  /**
   * Get settlements from localStorage
   */
  async getSettlements(): Promise<unknown[]> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.settlements);
      if (saved && saved.length < MAX_SIZES.settlements) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.error('[LocalStorageSource] Failed to load settlements:', e);
      return [];
    }
  }

  /**
   * Save settlements to localStorage
   */
  async saveSettlements(settlements: unknown[]): Promise<void> {
    try {
      const data = JSON.stringify(settlements);
      if (data.length > MAX_SIZES.settlements) {
        throw new QuotaExceededError(
          `Settlements data too large (${data.length} bytes, max ${MAX_SIZES.settlements})`
        );
      }
      localStorage.setItem(STORAGE_KEYS.settlements, data);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        throw e;
      }
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw new QuotaExceededError('localStorage quota exceeded', { originalError: e });
      }
      throw new ValidationError('Failed to save settlements', { originalError: e });
    }
  }
}

