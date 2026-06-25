import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../TopBar';
import { useData } from '../../services/data/DataContext';
import { usePot } from '../../hooks/usePot';
import { useChapterState } from '../../hooks/useChapterState';
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

  const resolvedMember = pot
    ? resolvePotMember(pot, currentUserId)
    : { memberId: currentMemberId, memberName: currentMemberName };

  const { actingMemberId, setActingMemberId } = useCaptureActingMember(resolvedMember.memberId);

  useEffect(() => {
    setActingMemberId(receiverId);
  }, [receiverId, setActingMemberId]);

  const effectiveMemberId = receiverId;

  const { status, isLoading, confirm } = useChapterState({
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
    <div className="flex flex-col h-full bg-background pb-8" data-testid="capture-confirm-screen">
      <TopBar title="Confirm payment" onBack={onBack} />

      <div className="p-4 space-y-4">
        {done ? (
          <div className="card p-4 space-y-2" data-testid="capture-confirm-done">
            <p className="text-body font-medium">Confirmed received</p>
          </div>
        ) : wrongUser ? (
          <div className="card p-4 space-y-2">
            <p className="text-body font-medium">Wrong account</p>
            <p className="text-caption text-secondary" data-testid="capture-confirm-wrong-user">
              Sign in as {receiverName} to confirm.
            </p>
          </div>
        ) : leg ? (
          <>
            <div className="space-y-2" data-testid="capture-confirm-entry-guide">
              <div>
                <h2 className="text-section mt-1" style={{ fontWeight: 600 }}>Confirm money arrived</h2>
              </div>
              <p className="text-caption text-secondary">
                Confirm if you received the money.
              </p>
            </div>

            <div className="card p-4 space-y-1">
              <p className="text-caption text-secondary">Payment</p>
              <p className="text-body font-medium">
                {leg.fromName} → {leg.toName}
              </p>
              <p className="text-caption text-secondary">
                {leg.amount.toFixed(2)} {leg.currency}
              </p>
            </div>

            <button
              type="button"
              disabled={submitting || isLoading || leg.state !== 'claimed'}
              className="w-full py-3 rounded-xl font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              data-testid="capture-confirm-submit"
              onClick={() => void handleConfirm()}
            >
              Confirm received
            </button>

            {leg.state !== 'claimed' && (
              <p className="text-caption text-secondary" data-testid="capture-confirm-waiting-copy">
                Waiting for payer to mark paid.
              </p>
            )}
          </>
        ) : (
          <p className="text-caption text-secondary">Leg not found or already settled.</p>
        )}
      </div>
    </div>
  );
}
