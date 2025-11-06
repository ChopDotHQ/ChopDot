/**
 * Pot Export/Import Utilities
 * 
 * Provides JSON export/import functionality for pots with schema validation.
 */

import type { Pot } from '../schema/pot';
import { validatePot } from '../schema/pot';

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
 * Import pot from JSON file
 */
export function importPotFromJSON(json: string): { success: boolean; pot?: Pot; error?: string } {
  try {
    const parsed = JSON.parse(json) as ExportedPot;
    
    // Validate schema version
    if (!parsed.schemaVersion) {
      return { success: false, error: 'Invalid file format: missing schema version' };
    }
    
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return { success: false, error: `Unsupported schema version: ${parsed.schemaVersion}. Expected: ${SCHEMA_VERSION}` };
    }
    
    // Validate pot structure
    const validation = validatePot(parsed.pot);
    if (!validation.success) {
      return { success: false, error: validation.error || 'Invalid pot data' };
    }
    
    // De-dupe IDs if needed (add timestamp suffix)
    const timestamp = Date.now();
    const pot = validation.data!;
    
    // Ensure unique IDs
    pot.id = `${pot.id}-imported-${timestamp}`;
    pot.expenses = pot.expenses.map(exp => ({
      ...exp,
      id: `${exp.id}-imported-${timestamp}`,
    }));
    
    return { success: true, pot };
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
export function readPotFile(file: File): Promise<{ success: boolean; pot?: Pot; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        resolve({ success: false, error: 'File is empty' });
        return;
      }
      
      const result = importPotFromJSON(text);
      resolve(result);
    };
    
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };
    
    reader.readAsText(file);
  });
}

