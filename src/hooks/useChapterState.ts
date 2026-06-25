import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildPotStatus,
  closeChapter,
  confirmLeg,
  markLegPaid,
} from '../chapter/chapterEngine';
import type { ChapterDocument, PotStatus } from '../chapter/types';
import type { PotService } from '../services/data/services/PotService';
import { ChapterStore } from '../services/capture/ChapterStore';
import { resolvePotMember } from '../utils/resolvePotMember';

type UseChapterStateParams = {
  potId: string;
  potService: PotService;
  currentMemberId: string;
  currentMemberName: string;
  currentUserId?: string;
  onPotRefresh?: (potId: string) => void;
};

type UseChapterStateResult = {
  chapter: ChapterDocument | null;
  status: PotStatus | null;
  isLoading: boolean;
  error: string | null;
  markPaid: (input?: { legId?: string; payerMemberId?: string }) => Promise<void>;
  confirm: (input?: { legId?: string; creditorMemberId?: string }) => Promise<void>;
  close: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useChapterState({
  potId,
  potService,
  currentMemberId,
  currentMemberName,
  currentUserId,
  onPotRefresh,
}: UseChapterStateParams): UseChapterStateResult {
  const store = useMemo(() => new ChapterStore(potService), [potService]);
  const [chapter, setChapter] = useState<ChapterDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pot = await potService.getPot(potId);
      const resolved = resolvePotMember(pot, currentUserId);
      const ensured = store.ensureChapter(pot, {
        organizerMemberId: resolved.memberId,
        organizerName: resolved.memberName,
        organizerUserId: currentUserId,
      });
      const loaded = store.loadChapter(pot) ?? ensured;

      if (!pot.chapter) {
        await store.saveChapter(potId, loaded);
      }

      setChapter(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapter');
      setChapter(null);
    } finally {
      setIsLoading(false);
    }
  }, [potId, potService, store, currentMemberId, currentMemberName, currentUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const notifyRefresh = useCallback(
    (id: string) => {
      onPotRefresh?.(id);
      window.dispatchEvent(new CustomEvent('pot-refresh', { detail: { potId: id } }));
    },
    [onPotRefresh],
  );

  const persist = useCallback(
    async (next: ChapterDocument) => {
      const saved = await store.saveChapter(potId, next);
      setChapter(saved.chapter as ChapterDocument);
      notifyRefresh(potId);
    },
    [potId, store, notifyRefresh],
  );

  const markPaid = useCallback(
    async (input?: { legId?: string; payerMemberId?: string }) => {
      if (!chapter) {
        throw new Error('Chapter not loaded');
      }

      const payerMemberId = input?.payerMemberId ?? currentMemberId;
      const next = markLegPaid(chapter, {
        payerMemberId,
        legId: input?.legId,
      });
      await persist(next);
    },
    [chapter, currentMemberId, persist],
  );

  const confirm = useCallback(
    async (input?: { legId?: string; creditorMemberId?: string }) => {
      if (!chapter) {
        throw new Error('Chapter not loaded');
      }

      const creditorMemberId = input?.creditorMemberId ?? currentMemberId;
      const next = confirmLeg(chapter, {
        creditorMemberId,
        legId: input?.legId,
      });
      await persist(next);
    },
    [chapter, currentMemberId, persist],
  );

  const close = useCallback(async () => {
    if (!chapter) {
      throw new Error('Chapter not loaded');
    }

    const next = closeChapter(chapter);
    await persist(next);
  }, [chapter, persist]);

  const status = useMemo(() => (chapter ? buildPotStatus(chapter) : null), [chapter]);

  return {
    chapter,
    status,
    isLoading,
    error,
    markPaid,
    confirm,
    close,
    refresh,
  };
}
