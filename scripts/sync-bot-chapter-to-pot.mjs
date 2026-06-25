#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { migrateChapter } from '../src/chapter/migrateChapter.ts';

/**
 * @typedef {{
 *   id: string;
 *   chapter?: unknown;
 *   [key: string]: unknown;
 * }} PotRow
 */

async function main() {
  const potId = process.argv[2];
  const chapterPath = process.argv[3];
  const potsPath =
    process.argv[4] ??
    path.join(process.cwd(), '.chopdot-bot-data', 'linked-pots', `${potId}.chapter.json`);

  if (!potId || !chapterPath) {
    console.error('Usage: sync-bot-chapter-to-pot.mjs <potId> <chapter.json> [pots-export.json]');
    process.exit(1);
  }

  const chapterRaw = await readFile(chapterPath, 'utf8');
  const chapter = migrateChapter(JSON.parse(chapterRaw));

  const potsRaw = await readFile(potsPath, 'utf8');
  /** @type {PotRow[]} */
  const pots = JSON.parse(potsRaw);
  if (!Array.isArray(pots)) {
    throw new Error('Pots export must be a JSON array');
  }

  const index = pots.findIndex((pot) => pot.id === potId);
  if (index === -1) {
    throw new Error(`Pot ${potId} not found in export`);
  }

  const existing = pots[index];
  if (!existing) {
    throw new Error(`Pot ${potId} not found in export`);
  }

  pots[index] = {
    ...existing,
    chapter,
    lastEditAt: new Date().toISOString(),
  };

  await writeFile(potsPath, JSON.stringify(pots, null, 2), 'utf8');
  console.info(`Synced chapter for pot ${potId}`);
}

void main();
