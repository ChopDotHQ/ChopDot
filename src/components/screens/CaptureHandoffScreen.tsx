import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../TopBar';
import { useData } from '../../services/data/DataContext';
import { usePot } from '../../hooks/usePot';
import { useChapterState } from '../../hooks/useChapterState';
import { useCaptureActingMember } from '../../hooks/useCaptureActingMember';
import { CaptureShareActions } from '../capture/CaptureShareActions';
import { SettlementHandoffPanel } from '../capture/SettlementHandoffPanel';
import { captureLinkService } from '../../services/capture/CaptureLinkService';
import {
  getSettlementAdapter,
  resolveHandoffRail,
} from '../../services/capture/SettlementAdapterRegistry';
import { buildConfirmShareText, buildPayShareText } from '../../services/capture/QRPayloadCodec';
import { legToHandoffLeg } from '../../services/capture/types/settlementAdapter';
import { resolvePotMember } from '../../utils/resolvePotMember';

type CaptureHandoffScreenProps = {
  potId: string;
  legId: string;
  captureToken?: string;
  actingMemberIdOverride?: string;
  currentMemberId: string;
  currentMemberName: string;
  currentUserId?: string;
  onBack: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onPotRefresh?: (potId: string) => void;
};

export function CaptureHandoffScreen({
  potId,
  legId,
  captureToken,
  actingMemberIdOverride,
  currentMemberId,
  currentMemberName,
  currentUserId,
  onBack,
  onShowToast,
  onPotRefresh,
}: CaptureHandoffScreenProps) {
  const { pots: potService } = useData();
  const { pot } = usePot(potId);
  const [twintPhone, setTwintPhone] = useState('');
  const [payShareToken, setPayShareToken] = useState<string | null>(captureToken ?? null);
  const [confirmShareToken, setConfirmShareToken] = useState<string | null>(null);

  const resolvedMember = pot
    ? resolvePotMember(pot, currentUserId)
    : { memberId: currentMemberId, memberName: currentMemberName };

  const { actingMemberId, setActingMemberId } = useCaptureActingMember(resolvedMember.memberId);

  useEffect(() => {
    if (actingMemberIdOverride) {
      setActingMemberId(actingMemberIdOverride);
    }
  }, [actingMemberIdOverride, setActingMemberId]);

  const effectiveMemberId = actingMemberIdOverride ?? actingMemberId;

  const { chapter, status, isLoading, markPaid } = useChapterState({
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

  const spendCard = chapter?.spendCards?.find(
    (card) => card.id === chapter.spendCards?.[0]?.id,
  );
  const railId = resolveHandoffRail(spendCard?.settlementPreference, 'twint');
  const adapter = getSettlementAdapter(railId);

  const handoff = useMemo(() => {
    if (!leg || !chapter) {
      return null;
    }

    return adapter.handoff({
      leg: legToHandoffLeg(leg),
      sessionRef: leg.id,
      counterpartyPhone: twintPhone,
      potId,
      chapterId: chapter.id,
    });
  }, [adapter, chapter, leg, potId, twintPhone]);

  useEffect(() => {
    if (payShareToken || captureToken || !leg || !chapter) {
      return;
    }

    const token = captureLinkService.mintPayToken({
      potId,
      chapterId: chapter.id,
      legId: leg.id,
      fromMemberId: leg.fromMemberId,
      toMemberId: leg.toMemberId,
      toMemberName: leg.toName,
      amount: leg.amount,
      currency: leg.currency,
    });
    setPayShareToken(token);
  }, [captureToken, chapter, leg, payShareToken, potId]);

  const activePayToken = payShareToken ?? captureToken ?? null;

  const mintConfirmShare = async () => {
    if (!leg || !chapter) {
      return null;
    }

    const token = await captureLinkService.mintConfirmTokenRemote({
      potId,
      chapterId: chapter.id,
      legId: leg.id,
      receiverId: leg.toMemberId,
      receiverName: leg.toName,
    });
    setConfirmShareToken(token);
    return token;
  };

  const handleMarkPaid = async () => {
    if (!leg) {
      return;
    }

    try {
      await markPaid({ legId: leg.id, payerMemberId: leg.fromMemberId });
      if (captureToken) {
        captureLinkService.consumePayToken(captureToken);
      }
      await mintConfirmShare();
      onShowToast?.(`Marked paid — ${leg.toName} can confirm next`, 'success');
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Failed to mark paid', 'error');
    }
  };

  const topBarTitle = 'Mark payment';

  return (
    <div className="flex flex-col h-full bg-background pb-8" data-testid="capture-handoff-screen">
      <TopBar title={topBarTitle} onBack={onBack} />

      <div className="p-4 space-y-4">
        {leg ? (
          <>
            <div className="space-y-2" data-testid="capture-pay-entry-guide">
              <div>
                <h2 className="text-section mt-1" style={{ fontWeight: 600 }}>Pay your share</h2>
              </div>
              <p className="text-caption text-secondary">
                Use your payment app, then mark paid.
              </p>
            </div>

            <div className="card p-4 space-y-2">
              <p className="text-caption text-secondary">You owe</p>
              <p className="text-body font-medium" data-testid="capture-handoff-leg-id">
                {leg.amount.toFixed(2)} {leg.currency} to {leg.toName}
              </p>
            </div>

            {handoff && (
              <SettlementHandoffPanel
                handoff={handoff}
                twintPhone={twintPhone}
                onTwintPhoneChange={setTwintPhone}
                onShowToast={onShowToast}
              />
            )}

            {railId !== 'firma' &&
              leg.state === 'open' &&
              leg.fromMemberId === effectiveMemberId && (
                <button
                  type="button"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  data-testid="capture-handoff-mark-paid"
                  onClick={() => void handleMarkPaid()}
                >
                  Mark paid
                </button>
              )}

            {!captureToken && activePayToken && leg.state === 'open' && (
              <CaptureShareActions
                path="pay"
                token={activePayToken}
                shareText={buildPayShareText({
                  amount: leg.amount,
                  currency: leg.currency,
                  counterpartyName: leg.toName,
                  url: `${window.location.origin}/pay?t=${activePayToken}`,
                })}
                onShowToast={onShowToast}
              />
            )}

            {!captureToken && confirmShareToken && leg.state === 'claimed' && (
              <CaptureShareActions
                path="confirm"
                token={confirmShareToken}
                shareText={buildConfirmShareText({
                  payerName: leg.fromName,
                  amount: leg.amount,
                  currency: leg.currency,
                  url: `${window.location.origin}/confirm?t=${confirmShareToken}`,
                })}
                onShowToast={onShowToast}
              />
            )}

            {railId === 'firma' && leg.state === 'open' && (
              <div
                className="rounded-xl border border-border bg-white p-3 space-y-1"
                data-testid="capture-firma-auto-claim-hint"
              >
                <p className="text-caption font-medium">Payment app can only mark this paid</p>
                <p className="text-caption text-secondary">
                  When the payment details match this share, ChopDot can mark it paid. {leg.toName} still confirms receipt separately.
                </p>
              </div>
            )}

            {leg.state === 'claimed' && (
              <div className="rounded-xl border border-border bg-white p-3 space-y-1" data-testid="capture-handoff-waiting-confirmation">
                <p className="text-caption font-medium">Waiting for confirmation</p>
                <p className="text-caption text-secondary">
                  Paid. Waiting for {leg.toName} to confirm.
                </p>
              </div>
            )}

            {leg.state === 'confirmed' && (
              <div className="rounded-xl border border-border bg-white p-3 space-y-1" data-testid="capture-handoff-done">
                <p className="text-caption font-medium">You are done</p>
                <p className="text-caption text-secondary">
                  Confirmed.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-caption text-secondary">Leg not found or already settled.</p>
        )}
      </div>
    </div>
  );
}
