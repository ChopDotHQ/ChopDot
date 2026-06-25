import type { Pot } from '../../schema/pot';
import { chapterToPot } from '../../chapter/chapterEngine';
import type { ChapterDocument } from '../../chapter/types';

function buildSpendGroup(chapter: ChapterDocument, existing: Pot): Pot['spendGroup'] {
  const current = existing.spendGroup;
  const memberIds = chapter.members.map((member) => member.id);
  const preferredPaymentApp = chapter.spendCards?.[0]?.settlementPreference;
  const supportedPaymentApp =
    preferredPaymentApp === 'twint' ||
    preferredPaymentApp === 'bank' ||
    preferredPaymentApp === 'wise' ||
    preferredPaymentApp === 'revolut' ||
    preferredPaymentApp === 'venmo' ||
    preferredPaymentApp === 'cashapp' ||
    preferredPaymentApp === 'outside'
      ? preferredPaymentApp
      : undefined;

  return {
    id: current?.id ?? `sg_${existing.id}`,
    label: current?.label ?? chapter.name,
    memberIds,
    defaultSplitRule: 'equal',
    preferredPaymentApp: supportedPaymentApp ?? current?.preferredPaymentApp ?? 'twint',
    activePotId: chapter.chapterState === 'open' ? existing.id : undefined,
    closedPotIds: chapter.chapterState === 'closed'
      ? Array.from(new Set([...(current?.closedPotIds ?? []), existing.id]))
      : current?.closedPotIds ?? [],
  };
}

export function syncChapterToPot(chapter: ChapterDocument, existing: Pot): Pot {
  const projected = chapterToPot(chapter);

  return {
    ...existing,
    name: chapter.name,
    baseCurrency: chapter.currency,
    members: projected.members,
    expenses: projected.expenses,
    mode: 'auditable',
    confirmationsEnabled: true,
    spendGroup: buildSpendGroup(chapter, existing),
    chapter,
  };
}

export function applyChapterProjection(pot: Pot, chapter: ChapterDocument): Pot {
  return syncChapterToPot(chapter, pot);
}
