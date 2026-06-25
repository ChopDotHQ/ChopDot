import type { ChapterDocument, ChapterDocumentV1 } from './types';
import { CHOPDOT_CHAPTER_SCHEMA, CHOPDOT_CHAPTER_SCHEMA_V1 } from './types';

function isV1Document(doc: unknown): doc is ChapterDocumentV1 {
  if (!doc || typeof doc !== 'object') {
    return false;
  }
  const record = doc as Record<string, unknown>;
  return record.schemaVersion === CHOPDOT_CHAPTER_SCHEMA_V1;
}

export function migrateChapter(doc: unknown): ChapterDocument {
  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid chapter document');
  }

  const record = doc as Record<string, unknown>;

  if (record.schemaVersion === CHOPDOT_CHAPTER_SCHEMA) {
    return doc as ChapterDocument;
  }

  if (!isV1Document(doc)) {
    throw new Error(`Unsupported chapter schema: ${String(record.schemaVersion)}`);
  }

  return {
    schemaVersion: CHOPDOT_CHAPTER_SCHEMA,
    id: doc.id,
    name: doc.name,
    currency: doc.currency,
    chapterState: doc.chapterState,
    potId: undefined,
    telegramChatId: doc.telegramChatId || undefined,
    members: doc.members.map((member) => ({
      id: member.id,
      name: member.name,
      telegramUserId: member.telegramUserId,
      userId: undefined,
    })),
    expenses: doc.expenses,
    legs: doc.legs,
    spendCards: [],
    createdAt: doc.createdAt,
    closedAt: doc.closedAt,
  };
}
