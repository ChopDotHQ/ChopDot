/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { buildPotStatus, createChapter } from '../chapter/chapterEngine';
import { commitChatCaptureDraft, formatDraftReviewMessage, stageChatCaptureDraft } from '../bot/chatCaptureDraft';

describe('chat capture drafts', () => {
  it('stages a chat message without changing chapter truth', () => {
    const chapter = createChapter({
      name: 'Friday dinner',
      currency: 'CHF',
      telegramChatId: 'chat-1',
      organizer: { name: 'Mina', telegramUserId: 'tg-mina' },
    });

    const pending = stageChatCaptureDraft({
      chapter,
      draft: { amount: 120, memo: 'dinner', splitCount: 3 },
      telegramUserId: 'tg-mina',
      memberName: 'Mina',
      messageId: '41',
      now: () => '2026-06-28T20:00:00.000Z',
    });

    expect(chapter.expenses).toHaveLength(0);
    expect(formatDraftReviewMessage(pending)).toContain('Nothing has been added yet');
    expect(formatDraftReviewMessage(pending)).toContain('/addlast');
  });

  it('commits the staged draft only when the chat explicitly adds it', () => {
    const chapter = createChapter({
      name: 'Friday dinner',
      currency: 'CHF',
      telegramChatId: 'chat-1',
      organizer: { name: 'Mina', telegramUserId: 'tg-mina' },
    });
    const pending = stageChatCaptureDraft({
      chapter,
      draft: { amount: 120, memo: 'dinner', splitCount: 3 },
      telegramUserId: 'tg-mina',
      memberName: 'Mina',
      messageId: '41',
    });

    const committed = commitChatCaptureDraft(chapter, pending).chapter;

    expect(committed.expenses).toHaveLength(1);
    expect(committed.expenses[0]).toMatchObject({
      amount: 120,
      memo: 'dinner',
      source: 'chat_nl',
      sourceRef: '41',
    });
    expect(buildPotStatus(committed).openLegCount).toBeGreaterThanOrEqual(0);
  });
});
