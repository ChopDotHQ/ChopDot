import { applyChapterProjection } from './chapterSync';
import { applyFirmaWebhookClaim, type FirmaWebhookPayload } from './firmaWebhookClaim';
import { migrateChapter } from '../../chapter/migrateChapter';
import type { Pot } from '../../schema/pot';

const STORAGE_KEY = 'chopdot_pots';

function readGuestPots(): Pot[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as Pot[];
  return Array.isArray(parsed) ? parsed : [];
}

function writeGuestPots(pots: Pot[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pots));
}

export function simulateFirmaWebhookClaim(input: {
  potId: string;
  payload: FirmaWebhookPayload;
  deliveryId: string;
}): { ok: boolean; reason?: string; legId?: string } {
  const pots = readGuestPots();
  const index = pots.findIndex((pot) => pot.id === input.potId);
  if (index === -1) {
    return { ok: false, reason: 'Pot not found' };
  }

  const pot = pots[index];
  if (!pot?.chapter) {
    return { ok: false, reason: 'Chapter missing' };
  }

  let chapter;
  try {
    chapter = migrateChapter(pot.chapter);
  } catch {
    return { ok: false, reason: 'Invalid chapter' };
  }

  const result = applyFirmaWebhookClaim(chapter, {
    payload: input.payload,
    deliveryId: input.deliveryId,
  });

  if (result.status !== 'claimed') {
    return { ok: false, reason: result.status === 'ignored' ? result.reason : result.reason };
  }

  const updatedPot = applyChapterProjection(pot, result.chapter);
  const nextPots = [...pots];
  nextPots[index] = updatedPot;
  writeGuestPots(nextPots);
  window.dispatchEvent(new CustomEvent('pot-refresh', { detail: { potId: input.potId } }));

  return { ok: true, legId: result.legId };
}

declare global {
  interface Window {
    __chopdotCaptureTest?: {
      simulateFirmaWebhookClaim: typeof simulateFirmaWebhookClaim;
    };
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__chopdotCaptureTest = {
    simulateFirmaWebhookClaim,
  };
}
