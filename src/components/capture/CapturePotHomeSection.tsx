import { useMemo } from 'react';
import { migrateChapter } from '../../chapter/migrateChapter';
import { useCaptureActingMember } from '../../hooks/useCaptureActingMember';
import { useCaptureChapterState } from '../../hooks/useCaptureChapterState';
import { useData } from '../../services/data/DataContext';
import { usePot } from '../../hooks/usePot';
import { CaptureChapterPanel } from './CaptureChapterPanel';
import { AddToWalletButton } from './AddToWalletButton';

type CapturePotHomeSectionProps = {
  potId: string;
  currentMemberId: string;
  currentMemberName: string;
  currentUserId?: string;
  hasChapter: boolean;
  onOpenSpendCard?: (spendCardId?: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
};

export function CapturePotHomeSection({
  potId,
  currentMemberId,
  currentMemberName,
  currentUserId,
  hasChapter,
  onOpenSpendCard,
  onShowToast,
}: CapturePotHomeSectionProps) {
  const { pots: potService } = useData();
  const { pot } = usePot(potId);
  const { actingMemberId } = useCaptureActingMember(currentMemberId);

  const spendCards = useMemo(() => {
    if (!pot?.chapter) {
      return [];
    }

    try {
      return migrateChapter(pot.chapter).spendCards ?? [];
    } catch {
      return [];
    }
  }, [pot?.chapter]);

  const chapterId = useMemo(() => {
    if (!pot?.chapter) {
      return null;
    }
    try {
      return migrateChapter(pot.chapter).id;
    } catch {
      return null;
    }
  }, [pot?.chapter]);

  const { status, isLoading, markPaid, confirm, close } = useCaptureChapterState({
    potId,
    potService,
    currentMemberId: actingMemberId,
    currentMemberName,
    currentUserId,
  });

  if (!hasChapter && !status?.openLegCount && spendCards.length === 0) {
    return null;
  }

  return (
    <>
      {spendCards.length > 0 && onOpenSpendCard && (
        <div className="px-4 pt-3 space-y-2" data-testid="capture-spend-card-list">
          <p className="text-caption text-secondary">Saved spend cards</p>
          {spendCards.map((card) => (
            <div key={card.id} className="space-y-2">
              <button
                type="button"
                className="w-full text-left card p-3 hover:bg-muted/20 transition-colors"
                data-testid={`capture-spend-card-${card.id}`}
                onClick={() => onOpenSpendCard(card.id)}
              >
                <p className="text-body font-medium">{card.label}</p>
                <p className="text-caption text-secondary">
                  {card.recentParticipantIds.length} participant
                  {card.recentParticipantIds.length === 1 ? '' : 's'} · {card.settlementPreference}
                </p>
              </button>
              {chapterId && (
                <AddToWalletButton
                  potId={potId}
                  chapterId={chapterId}
                  spendCardId={card.id}
                  payerId={actingMemberId}
                  label={card.label}
                  onShowToast={onShowToast}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <CaptureChapterPanel
        status={status}
        currentMemberId={actingMemberId}
        isLoading={isLoading}
        onMarkPaid={(legId, payerMemberId) => {
          void markPaid({ legId, payerMemberId })
            .then(() => onShowToast?.('Marked paid', 'success'))
            .catch((error) =>
              onShowToast?.(error instanceof Error ? error.message : 'Failed to mark paid', 'error'),
            );
        }}
        onConfirm={(legId, creditorMemberId) => {
          void confirm({ legId, creditorMemberId })
            .then(() => onShowToast?.('Confirmed', 'success'))
            .catch((error) =>
              onShowToast?.(error instanceof Error ? error.message : 'Failed to confirm', 'error'),
            );
        }}
        onClose={() => {
          void close()
            .then(() => onShowToast?.('Record closed', 'success'))
            .catch((error) =>
              onShowToast?.(error instanceof Error ? error.message : 'Failed to close record', 'error'),
            );
        }}
      />
    </>
  );
}
