/**
 * @vitest-environment node
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  addExpense,
  addMember,
  buildPotStatus,
  closeChapter,
  confirmLeg,
  createChapter,
  markLegPaid,
} from '../../chapter/chapterEngine';
import { FileChapterStore } from './fileChapterStore';
import { ChapterStoreAdapter } from './chapterStoreAdapter';

describe('ChapterStoreAdapter', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'chopdot-bot-'));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('writes linked pot chapter file when chapter has potId', async () => {
    const fileStore = new FileChapterStore(dataDir);
    const adapter = new ChapterStoreAdapter(fileStore, dataDir);
    await adapter.init();

    const chapter = createChapter({
      name: 'Friday Crew',
      currency: 'CHF',
      telegramChatId: 'chat-1',
      organizer: { name: 'Organizer', telegramUserId: 'tg-1' },
    });

    const linked = { ...chapter, potId: 'capture-test-pot' };
    await adapter.save(linked);

    const roundTrip = await adapter.readLinkedPotChapter('capture-test-pot');
    expect(roundTrip?.potId).toBe('capture-test-pot');
    expect(roundTrip?.name).toBe('Friday Crew');
  });

  it('links potId to chat chapter', async () => {
    const fileStore = new FileChapterStore(dataDir);
    const adapter = new ChapterStoreAdapter(fileStore, dataDir);
    await adapter.init();

    const chapter = createChapter({
      name: 'Trip',
      currency: 'EUR',
      telegramChatId: 'chat-2',
      organizer: { name: 'Leo', telegramUserId: 'tg-2' },
    });
    await adapter.save(chapter);

    const linked = await adapter.linkPotToChat('chat-2', 'pot-trip');
    expect(linked?.potId).toBe('pot-trip');
  });

  it('keeps Telegram-style capture converged with the linked app chapter without skipping confirmation', async () => {
    const fileStore = new FileChapterStore(dataDir);
    const adapter = new ChapterStoreAdapter(fileStore, dataDir);
    await adapter.init();

    let chapter = createChapter({
      name: 'Friday Crew',
      currency: 'CHF',
      telegramChatId: 'chat-3',
      organizer: { name: 'Mina', telegramUserId: 'tg-mina' },
    });
    chapter = addMember(chapter, { name: 'Leo', telegramUserId: 'tg-leo' });
    chapter = addMember(chapter, { name: 'Nina', telegramUserId: 'tg-nina' });
    await adapter.save(chapter);

    const linked = await adapter.linkPotToChat('chat-3', 'capture-pot-friday');
    expect(linked?.potId).toBe('capture-pot-friday');

    const leo = linked?.members.find((member) => member.name === 'Leo');
    expect(leo).toBeDefined();

    const captured = addExpense(linked!, {
      paidByMemberId: leo!.id,
      draft: { amount: 90, memo: 'Dinner', splitCount: 3 },
      source: 'chat_nl',
      sourceRef: 'telegram-message-41',
    });
    await adapter.save(captured);

    const appChapterAfterCapture = await adapter.readLinkedPotChapter('capture-pot-friday');
    expect(appChapterAfterCapture?.expenses).toHaveLength(1);
    expect(appChapterAfterCapture?.expenses[0]?.source).toBe('chat_nl');
    expect(buildPotStatus(appChapterAfterCapture!).openLegCount).toBeGreaterThan(0);

    const openLeoLeg = appChapterAfterCapture!.legs.find((leg) => leg.fromMemberId !== leo!.id);
    expect(openLeoLeg).toBeDefined();
    const claimed = markLegPaid(appChapterAfterCapture!, { payerMemberId: openLeoLeg!.fromMemberId, legId: openLeoLeg!.id });
    await adapter.save(claimed);

    const afterClaim = await adapter.getByChatId('chat-3');
    expect(afterClaim?.legs.find((leg) => leg.id === openLeoLeg!.id)?.state).toBe('claimed');
    expect(() => closeChapter(afterClaim!)).toThrow(/open leg/);

    expect(() =>
      confirmLeg(afterClaim!, { creditorMemberId: openLeoLeg!.fromMemberId, legId: openLeoLeg!.id }),
    ).toThrow('Only the receiver can confirm');

    const confirmed = confirmLeg(afterClaim!, { creditorMemberId: openLeoLeg!.toMemberId, legId: openLeoLeg!.id });
    await adapter.save(confirmed);

    const appChapterAfterConfirm = await adapter.readLinkedPotChapter('capture-pot-friday');
    expect(appChapterAfterConfirm?.legs.find((leg) => leg.id === openLeoLeg!.id)?.state).toBe('confirmed');
  });
});
