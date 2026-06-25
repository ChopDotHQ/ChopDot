import { describe, expect, it } from 'vitest';
import { CHOPDOT_CHAPTER_SCHEMA, CHOPDOT_CHAPTER_SCHEMA_V1 } from './types';
import { migrateChapter } from './migrateChapter';

describe('migrateChapter', () => {
  it('returns 0.2.0 documents unchanged', () => {
    const doc = {
      schemaVersion: CHOPDOT_CHAPTER_SCHEMA,
      id: 'chapter_1',
      name: 'Dinner',
      currency: 'CHF' as const,
      chapterState: 'open' as const,
      potId: 'pot_1',
      members: [{ id: 'alex', name: 'Alex' }],
      expenses: [],
      legs: [],
      spendCards: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    expect(migrateChapter(doc)).toEqual(doc);
  });

  it('upgrades 0.1.0 with telegramChatId and empty spendCards', () => {
    const v1 = {
      schemaVersion: CHOPDOT_CHAPTER_SCHEMA_V1,
      id: 'chapter_2',
      name: 'Trip',
      currency: 'EUR' as const,
      chapterState: 'open' as const,
      telegramChatId: '-1001',
      members: [{ id: 'alex', name: 'Alex', telegramUserId: 'tg_alex' }],
      expenses: [],
      legs: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const migrated = migrateChapter(v1);
    expect(migrated.schemaVersion).toBe(CHOPDOT_CHAPTER_SCHEMA);
    expect(migrated.telegramChatId).toBe('-1001');
    expect(migrated.spendCards).toEqual([]);
    expect(migrated.potId).toBeUndefined();
  });

  it('treats missing telegramChatId as app-only chapter', () => {
    const v1 = {
      schemaVersion: CHOPDOT_CHAPTER_SCHEMA_V1,
      id: 'chapter_3',
      name: 'App pot',
      currency: 'CHF' as const,
      chapterState: 'open' as const,
      telegramChatId: '',
      members: [{ id: 'owner', name: 'You' }],
      expenses: [],
      legs: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const migrated = migrateChapter(v1);
    expect(migrated.telegramChatId).toBeUndefined();
  });

  it('rejects unknown schema versions', () => {
    expect(() =>
      migrateChapter({
        schemaVersion: '9.9.9',
        id: 'x',
      }),
    ).toThrow(/Unsupported chapter schema/);
  });
});
