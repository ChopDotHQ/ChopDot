import {
  addMember,
  createAppChapter,
} from '../../chapter/chapterEngine';
import { migrateChapter } from '../../chapter/migrateChapter';
import type { ChapterDocument } from '../../chapter/types';
import type { Pot } from '../../schema/pot';
import type { PotService } from '../data/services/PotService';
import { applyChapterProjection } from './chapterSync';

function chapterFromPot(pot: Pot): ChapterDocument | null {
  const raw = pot.chapter;
  if (!raw) {
    return null;
  }

  try {
    return migrateChapter(raw);
  } catch {
    return null;
  }
}

function syncMembersFromPot(chapter: ChapterDocument, pot: Pot): ChapterDocument {
  let next = chapter;

  for (const member of pot.members) {
    const exists = next.members.some((m) => m.id === member.id);
    if (exists) {
      continue;
    }

    next = addMember(next, {
      name: member.name,
      memberId: member.id,
    });
  }

  return next;
}

export class ChapterStore {
  constructor(private readonly potService: PotService) {}

  loadChapter(pot: Pot): ChapterDocument | null {
    const existing = chapterFromPot(pot);
    if (!existing) {
      return null;
    }

    return syncMembersFromPot(existing, pot);
  }

  ensureChapter(
    pot: Pot,
    input: {
      organizerMemberId: string;
      organizerName: string;
      organizerUserId?: string;
    },
  ): ChapterDocument {
    const loaded = this.loadChapter(pot);
    if (loaded) {
      const synced = syncMembersFromPot(loaded, pot);
      if (synced.potId !== pot.id) {
        return { ...synced, potId: pot.id };
      }
      return synced;
    }

    let chapter = createAppChapter({
      name: pot.name,
      currency: pot.baseCurrency,
      organizerMemberId: input.organizerMemberId,
      organizerName: input.organizerName,
      potId: pot.id,
      organizerUserId: input.organizerUserId,
    });

    chapter = syncMembersFromPot(chapter, pot);
    const allMemberIds = chapter.members.map((member) => member.id);
    chapter = {
      ...chapter,
      spendCards: (chapter.spendCards ?? []).map((card) => ({
        ...card,
        recentParticipantIds:
          card.recentParticipantIds.length > 1 ? card.recentParticipantIds : allMemberIds,
      })),
    };
    return chapter;
  }

  async saveChapter(potId: string, chapter: ChapterDocument): Promise<Pot> {
    const pot = await this.potService.getPot(potId);
    const normalized: ChapterDocument = {
      ...chapter,
      potId: pot.id,
      schemaVersion: chapter.schemaVersion,
    };
    const updated = applyChapterProjection(pot, normalized);
    await this.potService.updatePot(potId, {
      chapter: updated.chapter,
      expenses: updated.expenses,
      members: updated.members,
      mode: updated.mode,
      confirmationsEnabled: updated.confirmationsEnabled,
    });
    return updated;
  }
}

export function getChapterFromPot(pot: Pot): ChapterDocument | null {
  const raw = pot.chapter;
  if (!raw) {
    return null;
  }

  try {
    return migrateChapter(raw);
  } catch {
    return null;
  }
}
