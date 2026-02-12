import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type MvpAction = {
  id: number;
  status: 'READY' | 'PARTIAL';
  description: string;
  mode: 'Cypress' | 'Manual';
};

const inventoryPath = path.resolve(process.cwd(), 'docs/MVP_ACTION_INVENTORY.md');
const raw = fs.readFileSync(inventoryPath, 'utf8');
const totalMatch = raw.match(/^- Total identified actions: (\d+)$/m);
const expectedTotal = totalMatch ? Number(totalMatch[1]) : null;

const actionRegex = /^- \[ \] MVP-(\d{3}) \| (READY|PARTIAL) \| (.+) \| (Cypress|Manual)$/gm;

const actions: MvpAction[] = [];
for (const match of raw.matchAll(actionRegex)) {
  const [, idRaw = '', statusRaw = 'PARTIAL', descriptionRaw = '', modeRaw = 'Manual'] = match;
  actions.push({
    id: Number(idRaw),
    status: statusRaw as MvpAction['status'],
    description: descriptionRaw,
    mode: modeRaw as MvpAction['mode'],
  });
}

describe('MVP inventory ticket coverage', () => {
  it('parses the expected ticket count', () => {
    expect(expectedTotal).not.toBeNull();
    expect(actions.length).toBe(expectedTotal);
  });

  actions.forEach((action) => {
    it(`MVP-${String(action.id).padStart(3, '0')} is tracked as testable (${action.mode})`, () => {
      expect(action.status).toBe('READY');
      expect(action.description.trim().length).toBeGreaterThan(0);
      expect(['Cypress', 'Manual']).toContain(action.mode);
    });
  });
});
