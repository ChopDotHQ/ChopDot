import type { Pot } from '../types/app';

export function addImportedPot(prev: Pot[], importedPot: Pot): Pot[] {
  return [...prev.filter((pot) => pot.id !== importedPot.id), importedPot];
}

export function persistImportedPot(importedPot: Pot): Pot[] {
  let existing: Pot[] = [];

  try {
    const raw = localStorage.getItem('chopdot_pots');
    const parsed = raw ? JSON.parse(raw) : [];
    existing = Array.isArray(parsed) ? parsed : [];
  } catch {
    existing = [];
  }

  const next = addImportedPot(existing, importedPot);

  try {
    const data = JSON.stringify(next);
    if (data.length < 1000000) {
      localStorage.setItem('chopdot_pots', data);
      localStorage.setItem('chopdot_pots_backup', data);
    }
  } catch {
    // The in-memory import should still succeed if local persistence is full.
  }

  return next;
}
