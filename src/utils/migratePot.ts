/**
 * Pot Migration Utility
 * 
 * Provides backward-compatible migration for pots stored in localStorage.
 * Handles old pot shapes and injects missing fields with sensible defaults.
 */

import { PotSchema, type Pot } from '../schema/pot';
import { z } from 'zod';

/**
 * Migrate a single pot from old format to current format
 * 
 * @param raw - Raw pot data from localStorage (may be old format)
 * @returns Migrated pot matching current schema
 * @throws Error if pot cannot be migrated
 */
export function migratePot(raw: unknown): Pot {
  // Step 1: Try parsing with current schema
  const parseResult = PotSchema.safeParse(raw);
  
  if (parseResult.success) {
    return parseResult.data;
  }

  // Step 2: Attempt to coerce old shapes
  const coerced = coerceOldPotShape(raw);
  
  // Step 3: Re-parse with coerced data
  const reparseResult = PotSchema.safeParse(coerced);
  
  if (reparseResult.success) {
    return reparseResult.data;
  }

  // Step 4: If still failing, throw labeled error
  const errors = reparseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  throw new Error(`Failed to migrate pot: ${errors}`);
}

/**
 * Coerce old pot shape to current format
 */
function coerceOldPotShape(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Pot data must be an object');
  }

  const pot = raw as Record<string, unknown>;

  // Ensure baseCurrency exists (default to USD, or DOT if pot has DOT-related fields)
  if (!pot.baseCurrency) {
    // Heuristic: if any member has an address, assume DOT pot
    const hasAddresses = Array.isArray(pot.members) && 
      pot.members.some((m: unknown) => 
        typeof m === 'object' && m !== null && 'address' in m && (m as { address?: unknown }).address
      );
    pot.baseCurrency = hasAddresses ? 'DOT' : 'USD';
  }

  // Ensure type exists (default to 'expense')
  if (!pot.type) {
    pot.type = 'expense';
  }

  // Ensure history is array (default to empty)
  if (!pot.history) {
    pot.history = [];
  }

  // Ensure members have address field (null if missing)
  if (Array.isArray(pot.members)) {
    pot.members = pot.members.map((m: unknown) => {
      if (typeof m === 'object' && m !== null) {
        const member = m as Record<string, unknown>;
        if (!('address' in member)) {
          member.address = null;
        }
        return member;
      }
      return m;
    });
  }

  // Ensure expenses have required fields
  if (Array.isArray(pot.expenses)) {
    pot.expenses = pot.expenses.map((exp: unknown) => {
      if (typeof exp === 'object' && exp !== null) {
        const expense = exp as Record<string, unknown>;
        
        // Normalize memo/description: use memo if present, fallback to description
        if (!expense.memo && expense.description) {
          expense.memo = expense.description;
        } else if (!expense.memo) {
          expense.memo = '';
        }
        // Keep description for backward compatibility
        if (!expense.description && expense.memo) {
          expense.description = expense.memo;
        }
        
        // Ensure currency exists (default to pot's baseCurrency or USD)
        if (!expense.currency) {
          expense.currency = (pot.baseCurrency as string) || 'USD';
        }
        
        // Ensure split exists (default to empty array)
        if (!expense.split) {
          expense.split = [];
        }
        
        // Ensure attestations exists (default to empty array)
        if (!expense.attestations) {
          expense.attestations = [];
        }
        
        // Ensure hasReceipt exists (default to false)
        if (expense.hasReceipt === undefined) {
          expense.hasReceipt = false;
        }
        
        return expense;
      }
      return exp;
    });
  } else {
    pot.expenses = [];
  }

  // Set flags with defaults
  if (pot.budgetEnabled === undefined) {
    pot.budgetEnabled = false;
  }
  
  if (pot.checkpointEnabled === undefined) {
    pot.checkpointEnabled = true;
  }

  // Ensure archived is boolean
  if (pot.archived === undefined) {
    pot.archived = false;
  }

  return pot;
}

/**
 * Migrate all pots from localStorage
 * 
 * @param pots - Array of raw pot data from localStorage
 * @returns Array of migrated pots
 */
export function migrateAllPotsOnLoad(pots: unknown[]): Pot[] {
  const migrated: Pot[] = [];
  const errors: string[] = [];

  for (let i = 0; i < pots.length; i++) {
    try {
      const migratedPot = migratePot(pots[i]);
      migrated.push(migratedPot);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Pot ${i}: ${errorMsg}`);
      console.warn(`[ChopDot] Failed to migrate pot at index ${i}:`, errorMsg);
      // Skip invalid pots rather than crashing
    }
  }

  if (errors.length > 0) {
    console.warn(`[ChopDot] Migration completed with ${errors.length} error(s):`, errors);
  }

  return migrated;
}

/**
 * Check if pots need migration (i.e., any pot is missing baseCurrency or history)
 */
export function needsMigration(pots: unknown[]): boolean {
  return pots.some(pot => {
    if (typeof pot === 'object' && pot !== null) {
      const p = pot as Record<string, unknown>;
      return !p.baseCurrency || !p.history;
    }
    return false;
  });
}

