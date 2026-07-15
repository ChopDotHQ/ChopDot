import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../TopBar';
import { useData } from '../../services/data/DataContext';
import { usePot } from '../../hooks/usePot';
import { useCaptureChapterState } from '../../hooks/useCaptureChapterState';
import { useCaptureActingMember } from '../../hooks/useCaptureActingMember';
import { captureLinkService } from '../../services/capture/CaptureLinkService';
import { resolvePotMember } from '../../utils/resolvePotMember';

type CaptureConfirmScreenProps = {
  potId: string;
  legId: string;
  captureToken: string;
  receiverId: string;
  currentMemberId: string;
  currentMemberName: string;
  currentUserId?: string;
  onBack: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onPotRefresh?: (potId: string) => void;
  onComplete?: () => void;
};

export function CaptureConfirmScreen({
  potId,
  legId,
  captureToken,
  receiverId,
  currentMemberId,
  currentMemberName,
  currentUserId,
  onBack,
  onShowToast,
  onPotRefresh,
  onComplete,
}: CaptureConfirmScreenProps) {
  const { pots: potService } = useData();
  const { pot } = usePot(potId);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmedSummary, setConfirmedSummary] = useState<{
    amount: number;
    currency: string;
    fromName: string;
  } | null>(null);

  const resolvedMember = pot
    ? resolvePotMember(pot, currentUserId)
    : { memberId: currentMemberId, memberName: currentMemberName };

  const { actingMemberId, setActingMemberId } = useCaptureActingMember(resolvedMember.memberId);

  useEffect(() => {
    setActingMemberId(receiverId);
  }, [receiverId, setActingMemberId]);

  const effectiveMemberId = receiverId;

  const { status, isLoading, confirm } = useCaptureChapterState({
    potId,
    potService,
    currentMemberId: effectiveMemberId,
    currentMemberName: resolvedMember.memberName,
    currentUserId,
    onPotRefresh,
  });

  const leg = useMemo(
    () => status?.legs.find((item) => item.id === legId),
    [status?.legs, legId],
  );

  const wrongUser = effectiveMemberId !== receiverId && actingMemberId !== receiverId;
  const receiverName =
    pot?.members.find((member) => member.id === receiverId)?.name ??
    leg?.toName ??
    'the receiver';

  const handleConfirm = async () => {
    if (wrongUser) {
      onShowToast?.(`This link is for ${receiverName}`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (leg) {
        setConfirmedSummary({
          amount: leg.amount,
          currency: leg.currency,
          fromName: leg.fromName,
        });
      }
      await captureLinkService.consumeConfirmTokenRemote(captureToken);
      await confirm({ legId, creditorMemberId: receiverId });
      setDone(true);
      onShowToast?.('Payment confirmed — thank you', 'success');
      onPotRefresh?.(potId);
      onComplete?.();
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Could not confirm', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" data-testid="capture-confirm-screen">
      <TopBar title={leg ? `Confirm ${leg.fromName}` : 'Confirm'} onBack={onBack} />

      <div className="flex min-h-[calc(100dvh-64px)] flex-col p-4">
        {done ? (
          <div className="card space-y-2" style={{ padding: 20 }} data-testid="capture-confirm-done">
            <p className="text-[24px] leading-tight font-semibold tracking-normal">Confirmed received</p>
            {confirmedSummary && (
              <p className="text-body text-secondary">
                {confirmedSummary.amount.toFixed(2)} {confirmedSummary.currency} from {confirmedSummary.fromName}
              </p>
            )}
          </div>
        ) : wrongUser ? (
          <div className="card p-4 space-y-2">
            <p className="text-body font-medium">Wrong account</p>
            <p className="text-caption text-secondary" data-testid="capture-confirm-wrong-user">
              Sign in as {receiverName} to confirm.
            </p>
          </div>
        ) : leg ? (
          <div className="pb-36">
            <div className="card space-y-2" style={{ padding: 20 }} data-testid="capture-confirm-entry-guide">
              <p className="text-caption text-secondary">From {leg.fromName}</p>
              <p className="text-[34px] leading-none font-semibold tracking-normal">
                {leg.amount.toFixed(2)} {leg.currency}
              </p>
              <p className="text-body text-secondary">to {leg.toName}</p>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] space-y-3 border-t border-border bg-background/95 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] backdrop-blur">
              <button
                type="button"
                disabled={submitting || isLoading || leg.state !== 'claimed'}
                className="w-full py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                data-testid="capture-confirm-submit"
                onClick={() => void handleConfirm()}
              >
                Confirm received
              </button>

              <button
                type="button"
                className="w-full rounded-xl border border-border py-3 text-body font-semibold"
                onClick={onBack}
              >
                Go back
              </button>
            </div>

            {leg.state !== 'claimed' && (
              <p className="text-caption text-secondary" data-testid="capture-confirm-waiting-copy">
                Waiting for payer to mark paid.
              </p>
            )}
          </div>
        ) : (
          <p className="text-caption text-secondary">Leg not found or already settled.</p>
        )}
      </div>
    </div>
  );
}
