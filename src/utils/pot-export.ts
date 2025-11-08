/**
 * Pot Export/Import Utilities
 * 
 * Provides JSON export/import functionality for pots with schema validation and migration.
 */

import type { Pot } from '../schema/pot';
import { migratePot } from './migratePot';

const SCHEMA_VERSION = '1.0.0';

export interface ExportedPot {
  schemaVersion: string;
  exportedAt: number;
  pot: Pot;
}

/**
 * Export a pot to JSON format
 */
export function exportPotToJSON(pot: Pot): string {
  const exported: ExportedPot = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    pot,
  };
  
  return JSON.stringify(exported, null, 2);
}

/**
 * Download pot as JSON file
 */
export function downloadPotAsJSON(pot: Pot, filename?: string): void {
  const json = exportPotToJSON(pot);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `pot-${pot.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import pot from JSON file with migration support
 */
export function importPotFromJSON(json: string, existingPotIds: string[] = []): { success: boolean; pot?: Pot; error?: string } {
  try {
    const parsed = JSON.parse(json);
    
    // Handle both ExportedPot format and raw Pot format
    const rawPot = parsed.pot || parsed;
    
    // Migrate pot to current schema (handles old formats)
    let migratedPot: Pot;
    try {
      migratedPot = migratePot(rawPot);
    } catch (migrationError) {
      const errorMsg = migrationError instanceof Error ? migrationError.message : 'Migration failed';
      return { success: false, error: `Failed to migrate pot: ${errorMsg}` };
    }
    
    // De-duplicate IDs if collision occurs
    const timestamp = Date.now();
    let finalPotId = migratedPot.id;
    
    // Check for ID collision
    if (existingPotIds.includes(finalPotId)) {
      finalPotId = `${migratedPot.id}-imported-${timestamp}`;
    }
    
    // Update pot ID and expense IDs
    const importedPot: Pot = {
      ...migratedPot,
      id: finalPotId,
      expenses: migratedPot.expenses.map(exp => ({
        ...exp,
        id: `${exp.id}-imported-${timestamp}`,
      })),
    };
    
    return { success: true, pot: importedPot };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Read JSON file from file input
 */
export function readPotFile(file: File, existingPotIds: string[] = []): Promise<{ success: boolean; pot?: Pot; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        resolve({ success: false, error: 'File is empty' });
        return;
      }
      
      const result = importPotFromJSON(text, existingPotIds);
      resolve(result);
    };
    
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };
    
    reader.readAsText(file);
  });
}

