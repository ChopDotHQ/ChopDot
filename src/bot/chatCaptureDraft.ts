import {
  addExpense,
  addMember,
  buildPotStatus,
  formatStatusText,
  resolveMemberByTelegram,
} from '../chapter/chapterEngine';
import type { ChapterDocument, ParsedExpenseDraft } from '../chapter/types';

export type PendingChatCaptureDraft = {
  draft: ParsedExpenseDraft;
  telegramUserId: string;
  memberName: string;
  messageId: string;
  currency: string;
  createdAt: string;
};

export function stageChatCaptureDraft(input: {
  chapter: ChapterDocument;
  draft: ParsedExpenseDraft;
  telegramUserId: string;
  memberName: string;
  messageId: string;
  now?: () => string;
}): PendingChatCaptureDraft {
  const existingMember = resolveMemberByTelegram(input.chapter, input.telegramUserId);
  return {
    draft: input.draft,
    telegramUserId: input.telegramUserId,
    memberName: existingMember?.name ?? input.memberName,
    messageId: input.messageId,
    currency: input.chapter.currency,
    createdAt: input.now?.() ?? new Date().toISOString(),
  };
}

export function commitChatCaptureDraft(
  chapter: ChapterDocument,
  pending: PendingChatCaptureDraft,
): { chapter: ChapterDocument; memberName: string } {
  let nextChapter = chapter;
  let member = resolveMemberByTelegram(nextChapter, pending.telegramUserId);
  if (!member) {
    nextChapter = addMember(nextChapter, {
      name: pending.memberName,
      telegramUserId: pending.telegramUserId,
    });
    member = resolveMemberByTelegram(nextChapter, pending.telegramUserId);
  }

  if (!member) {
    throw new Error('Run /join <name> first.');
  }

  nextChapter = addExpense(nextChapter, {
    paidByMemberId: member.id,
    draft: pending.draft,
    source: 'chat_nl',
    sourceRef: pending.messageId,
  });

  return { chapter: nextChapter, memberName: member.name };
}

export function formatDraftReviewMessage(pending: PendingChatCaptureDraft): string {
  const splitText = pending.draft.splitCount
    ? `split ${pending.draft.splitCount} ways`
    : 'split with current members';
  return [
    'Draft found. Nothing has been added yet.',
    `${pending.draft.memo} · ${pending.draft.amount.toFixed(2)} ${pending.currency} · paid by ${pending.memberName} · ${splitText}`,
    'Send /addlast to add it, or /clearlast to ignore it.',
  ].join('\n');
}

export function formatDraftAddedMessage(chapter: ChapterDocument, pending: PendingChatCaptureDraft): string {
  return [
    `Added ${pending.draft.memo} · ${pending.draft.amount.toFixed(2)} ${chapter.currency}.`,
    formatStatusText(buildPotStatus(chapter)),
  ].join('\n');
}
