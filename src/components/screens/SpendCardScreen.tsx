import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from '../TopBar';
import { useData } from '../../services/data/DataContext';
import { usePot } from '../../hooks/usePot';
import { useCaptureChapterState } from '../../hooks/useCaptureChapterState';
import { useSpendSession } from '../../hooks/useSpendSession';
import { ChapterStore } from '../../services/capture/ChapterStore';
import { commitSpendSession } from '../../services/capture/KernelBridge';
import { parsePaymentEvidence } from '../../services/capture/PaymentEvidenceAdapter';
import {
  receiptScannerService,
  receiptScanToItems,
  receiptScanToPaymentRef,
} from '../../services/capture/ReceiptScannerService';
import { useCaptureActingMember } from '../../hooks/useCaptureActingMember';
import { CaptureChapterPanel } from '../capture/CaptureChapterPanel';
import { CaptureShareActions } from '../capture/CaptureShareActions';
import { captureLinkService } from '../../services/capture/CaptureLinkService';
import { buildPayShareText, encodeCaptureUrl } from '../../services/capture/QRPayloadCodec';
import { resolvePotMember } from '../../utils/resolvePotMember';
import type { ReceiptCaptureItem } from '../../chapter/types';
import type { SpendSession } from '../../services/capture/types';

type SpendCardScreenProps = {
  potId: string;
  spendCardId?: string;
  actingMemberIdOverride?: string;
  currentMemberId: string;
  currentMemberName: string;
  currentUserId?: string;
  onBack: () => void;
  onOpenHandoff: (legId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onPotRefresh?: (potId: string) => void;
};

export function SpendCardScreen({
  potId,
  spendCardId,
  actingMemberIdOverride,
  currentMemberId,
  currentMemberName,
  currentUserId,
  onBack,
  onOpenHandoff,
  onShowToast,
  onPotRefresh,
}: SpendCardScreenProps) {
  const { pots: potService } = useData();
  const { pot, loading: potLoading } = usePot(potId);
  const store = useMemo(() => new ChapterStore(potService), [potService]);

  const resolvedMember = pot ? resolvePotMember(pot, currentUserId) : {
    memberId: currentMemberId,
    memberName: currentMemberName,
  };
  const payerMemberId = resolvedMember.memberId;

  const { actingMemberId, setActingMemberId } = useCaptureActingMember(payerMemberId);

  useEffect(() => {
    if (actingMemberIdOverride) {
      setActingMemberId(actingMemberIdOverride);
    }
  }, [actingMemberIdOverride, setActingMemberId]);

  const effectiveMemberId = actingMemberIdOverride ?? actingMemberId;

  const {
    chapter,
    status,
    isLoading: chapterLoading,
    markPaid,
    confirm,
    close,
    refresh,
  } = useCaptureChapterState({
    potId,
    potService,
    currentMemberId: effectiveMemberId,
    currentMemberName: resolvedMember.memberName,
    currentUserId,
    onPotRefresh,
  });

  const resolvedSpendCardId =
    spendCardId ?? chapter?.spendCards?.[0]?.id ?? `sc_${potId}`;

  const defaultParticipants = useMemo(() => {
    // If there's a spendGroup configured, it overrides the pot default
    const groupMembers = pot?.spendGroup?.memberIds;
    if (groupMembers?.length) {
      return groupMembers;
    }

    const allMemberIds = pot?.members.map((member) => member.id) ?? [payerMemberId];
    const card = chapter?.spendCards?.find((item) => item.id === resolvedSpendCardId);
    if (card?.recentParticipantIds?.length && card.recentParticipantIds.length > 1) {
      return card.recentParticipantIds;
    }
    return allMemberIds;
  }, [chapter?.spendCards, resolvedSpendCardId, pot?.members, pot?.spendGroup, payerMemberId]);

  const defaultRail = useMemo(() => {
    const pref = pot?.spendGroup?.preferredPaymentApp;
    if (pref === 'twint' || pref === 'bank' || pref === 'wise' || pref === 'revolut' || pref === 'venmo' || pref === 'cashapp' || pref === 'outside') {
      return pref as SpendSession['settlementRail'];
    }
    return undefined;
  }, [pot?.spendGroup]);

  const {
    session,
    amount,
    memo,
    paymentEvidence,
    receiptItems,
    settlementRail,
    participantIds,
    setAmount,
    setMemo,
    setPaymentEvidence,
    setReceiptItems,
    setSettlementRail,
    markHandoffStarted,
    toggleParticipant,
    markCommitted,
  } = useSpendSession({
    spendCardId: resolvedSpendCardId,
    potId,
    payerMemberId,
    defaultParticipantIds: defaultParticipants,
    defaultRail,
    currency: pot?.baseCurrency ?? 'CHF',
  });

  const [committing, setCommitting] = useState(false);
  const [legPayTokens, setLegPayTokens] = useState<Record<string, string>>({});
  const [checkoutInput, setCheckoutInput] = useState('');
  const [captureEntryOpen, setCaptureEntryOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [receiptItemLabel, setReceiptItemLabel] = useState('');
  const [receiptItemAmount, setReceiptItemAmount] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [receiptScanError, setReceiptScanError] = useState<string | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!chapter || !status) {
      return;
    }

    setLegPayTokens((previous) => {
      const next = { ...previous };
      for (const leg of status.legs.filter((item) => item.state === 'open')) {
        if (!next[leg.id]) {
          next[leg.id] = captureLinkService.mintPayToken({
            potId,
            chapterId: chapter.id,
            legId: leg.id,
            fromMemberId: leg.fromMemberId,
            toMemberId: leg.toMemberId,
            toMemberName: leg.toName,
            amount: leg.amount,
            currency: leg.currency,
          });
        }
      }
      return next;
    });
  }, [chapter, potId, status]);

  const perPerson = participantIds.length > 0 ? amount / participantIds.length : 0;
  const receiptTotal = receiptItems.reduce((sum, item) => sum + item.amount, 0);
  const hasCreatedSplit = Boolean((chapter?.expenses.length ?? 0) > 0 || status?.legs.length);
  const recordClosed = status?.chapterState === 'closed';
  const readyToClose = hasCreatedSplit && status?.openLegCount === 0 && !recordClosed;

  const railChoices: Array<{ id: NonNullable<SpendSession['settlementRail']>; label: string }> = [
    { id: 'twint', label: 'TWINT' },
    { id: 'bank', label: 'Bank' },
    { id: 'wise', label: 'Wise' },
    { id: 'revolut', label: 'Revolut' },
    { id: 'venmo', label: 'Venmo' },
    { id: 'cashapp', label: 'Cash App' },
    { id: 'outside', label: 'Other' },
  ];
  const receiptStatusLabel = paymentEvidence
    ? ({
        observed: 'Saved',
        submitted: 'Started',
        settled: 'Arrived',
        unconfirmed: 'Check',
        failed: 'Needs review',
      }[paymentEvidence.status] ?? 'Saved')
    : '';
  const capturedLabel = paymentEvidence?.kind === 'receipt' ? 'Receipt' : 'Payment link';
  const hasCaptureDraft = Boolean(paymentEvidence || receiptItems.length > 0);
  const showCaptureEntry = !hasCreatedSplit && (captureEntryOpen || Boolean(checkoutError));
  const friendNames = pot?.members
    .filter((member) => member.id !== payerMemberId)
    .map((member) => member.name)
    .slice(0, 3)
    .join(', ');
  const participantNames = pot?.members
    .filter((member) => participantIds.includes(member.id))
    .map((member) => member.name)
    .join(', ');
  const spendCardLabel = chapter?.spendCards?.find((card) => card.id === resolvedSpendCardId)?.label;
  const groupLabel = pot?.spendGroup?.label ?? spendCardLabel ?? pot?.name ?? 'Group';
  const currentRailLabel = railChoices.find((rail) => rail.id === settlementRail)?.label ?? 'payment app';
  const groupPeopleText =
    participantIds.length === 1
      ? '1 person'
      : `${participantIds.length} people`;
  const friendLine = friendNames
    ? `With ${friendNames}`
    : `${groupPeopleText} included`;
  const canSplitPayment = amount > 0 && participantIds.length > 0;
  const hasOwnCaptureAction = Boolean(status?.legs.some((leg) => (
    (leg.state === 'open' && leg.fromMemberId === effectiveMemberId) ||
    (leg.state === 'claimed' && leg.toMemberId === effectiveMemberId)
  )));
  const hasPendingConfirmation = Boolean(status?.legs.some((leg) => leg.state === 'claimed'));
  const showStatusPanel = Boolean(
    hasCreatedSplit &&
    status &&
    (hasOwnCaptureAction || hasPendingConfirmation || status.openLegCount === 0),
  );

  const handleReceiptFile = async (file: File) => {
    setReceiptScanning(true);
    setReceiptScanError(null);
    setCheckoutError(null);
    setReceiptFileName(file.name);

    try {
      const currency = pot?.baseCurrency ?? 'CHF';
      const scan = await receiptScannerService.scanFile(file);
      const evidence = receiptScanToPaymentRef(scan, currency);
      const assignedMemberIds = participantIds.length ? [...participantIds] : [payerMemberId];
      const scannedItems = receiptScanToItems(scan, assignedMemberIds);

      setPaymentEvidence(evidence);
      setReceiptItems(scannedItems);
      if (scan.total) {
        setAmount(scan.total);
      }
      setMemo(scan.date ? `${scan.merchantName} · ${scan.date}` : scan.merchantName);
      setCheckoutNotice('Ready to review');
      setCaptureEntryOpen(false);
      setManualEntryOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read the receipt';
      setReceiptScanError(message);
      onShowToast?.(message, 'error');
    } finally {
      setReceiptScanning(false);
    }
  };

  const addReceiptItem = () => {
    const parsedAmount = Number(receiptItemAmount);
    if (!receiptItemLabel.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onShowToast?.('Add an item name and amount', 'error');
      return;
    }

    const nextItems: ReceiptCaptureItem[] = [
      ...receiptItems,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: receiptItemLabel.trim(),
        amount: Math.round(parsedAmount * 100) / 100,
        assignedMemberIds: participantIds.length ? [...participantIds] : [payerMemberId],
      },
    ];
    setReceiptItems(nextItems);
    setAmount(Math.round(nextItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100);
    if (!memo || memo === 'Spend') {
      setMemo('Receipt split');
    }
    setReceiptItemLabel('');
    setReceiptItemAmount('');
    onShowToast?.('Receipt item added', 'success');
  };

  const toggleReceiptAssignment = (itemId: string, memberId: string) => {
    const nextItems = receiptItems.map((item) => {
      if (item.id !== itemId) return item;
      const selected = new Set(item.assignedMemberIds);
      if (selected.has(memberId)) {
        if (selected.size <= 1) return item;
        selected.delete(memberId);
      } else {
        selected.add(memberId);
      }
      return { ...item, assignedMemberIds: Array.from(selected) };
    });
    setReceiptItems(nextItems);
  };

  const handleCheckoutCapture = () => {
    const parsed = parsePaymentEvidence(checkoutInput);
    if (!parsed.ok) {
      setCheckoutError(parsed.reason);
      setCheckoutNotice(null);
      onShowToast?.(parsed.reason, 'error');
      return;
    }

    if (
      parsed.suggestedCurrency &&
      pot?.baseCurrency &&
      parsed.suggestedCurrency.toUpperCase() !== pot.baseCurrency.toUpperCase()
    ) {
      const message = `This checkout is in ${parsed.suggestedCurrency}, but this pot uses ${pot.baseCurrency}`;
      setCheckoutError(message);
      setCheckoutNotice(null);
      onShowToast?.(message, 'error');
      return;
    }

    setCheckoutError(null);
    setCheckoutNotice(parsed.notice);
    setPaymentEvidence(parsed.evidence);
    setCaptureEntryOpen(false);
    setManualEntryOpen(false);
    if (parsed.suggestedAmount) {
      setAmount(parsed.suggestedAmount);
      if (!receiptItems.length) {
        setReceiptItems([
          {
            id: `item_${Date.now()}_total`,
            label: parsed.suggestedMemo ?? 'Receipt total',
            amount: Math.round(parsed.suggestedAmount * 100) / 100,
            assignedMemberIds: participantIds.length ? [...participantIds] : [payerMemberId],
          },
        ]);
      }
    }
    if (parsed.suggestedMemo) {
      setMemo(parsed.suggestedMemo);
    }
  };

  const handlePayNow = async () => {
    if (!session || !chapter || !pot) {
      onShowToast?.('Still loading pot data', 'info');
      return;
    }

    if (amount <= 0) {
      onShowToast?.('Enter an amount first', 'error');
      return;
    }

    setCommitting(true);
    try {
      const result = commitSpendSession(chapter, session);
      await store.saveChapter(potId, result.chapter);
      markHandoffStarted();
      markCommitted(result.expenseId);
      onPotRefresh?.(potId);
      await refresh();
      await refresh();
      window.setTimeout(() => {
        document
          .querySelector('[data-testid="spend-card-created-summary"]')
          ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }, 50);
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Failed to commit spend', 'error');
    } finally {
      setCommitting(false);
    }
  };

  if (potLoading || chapterLoading || !pot) {
    return (
      <div className="flex flex-col h-full bg-background" data-testid="spend-card-screen">
        <TopBar title="Group checkout" onBack={onBack} />
        <div className="p-4 text-caption text-secondary">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto" data-testid="spend-card-screen">
      <TopBar title={groupLabel} onBack={onBack} />

      <div className="p-4 space-y-3 pb-8 w-full mx-auto" style={{ maxWidth: 560 }}>
        <input
          ref={receiptFileInputRef}
          type="file"
          accept="image/*,application/pdf,text/plain"
          capture="environment"
          className="hidden"
          data-testid="spend-card-receipt-file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleReceiptFile(file);
            event.currentTarget.value = '';
          }}
        />

        <section className="space-y-3" data-testid="spend-entry-guide">
          {!hasCreatedSplit && !hasCaptureDraft && (
            <>
              <div className="space-y-1">
                <p className="text-label text-secondary">{groupLabel}</p>
                <h1 className="text-[28px] leading-tight font-semibold tracking-normal">Add receipt</h1>
              </div>

              <div className="space-y-2" data-testid="receipt-placeholder">
                <button
                  type="button"
                  onClick={() => receiptFileInputRef.current?.click()}
                  disabled={receiptScanning}
                  className="w-full rounded-2xl px-5 py-4 text-left transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff', padding: '16px 20px' }}
                  data-testid="spend-card-add-receipt"
                >
                  <span className="block text-body font-semibold">
                    {receiptScanning ? 'Reading…' : 'Add receipt'}
                  </span>
                  <span className="mt-1 block text-caption" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    {friendLine} · {currentRailLabel}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCaptureEntryOpen(true);
                    setManualEntryOpen(false);
                    setCheckoutError(null);
                  }}
                  className="w-full rounded-2xl px-5 py-3 text-left text-body font-semibold transition-all duration-200 active:scale-[0.99]"
                  style={{
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045))',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                  data-testid="spend-card-paste-link"
                >
                  Paste payment link
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManualEntryOpen((value) => !value);
                    setCaptureEntryOpen(false);
                    setCheckoutError(null);
                  }}
                  className="w-full rounded-2xl px-5 py-3 text-left text-body font-semibold transition-all duration-200 active:scale-[0.99]"
                  style={{
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045))',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                  data-testid="spend-card-enter-total"
                >
                  Enter total instead
                </button>
              </div>

              {manualEntryOpen && (
              <div
                className="space-y-4 rounded-[24px]"
                style={{
                  padding: 20,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045))',
                  boxShadow: '0 18px 44px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
                data-testid="spend-card-manual-total"
              >
                <div className="space-y-2">
                  <label className="block space-y-1.5">
                    <span className="text-caption text-secondary">Total</span>
                    <div className="flex items-end gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={amount || ''}
                        onChange={(event) => setAmount(Number(event.target.value))}
                        placeholder="0.00"
                        className="min-w-0 flex-1 bg-transparent text-[38px] leading-none font-semibold tabular-nums outline-none"
                        data-testid="spend-card-quick-amount"
                      />
                      <span className="pb-1 text-body text-secondary">{pot.baseCurrency}</span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="sr-only">What was it for?</span>
                    <input
                      type="text"
                      value={memo === 'Spend' ? '' : memo}
                      onChange={(event) => setMemo(event.target.value)}
                      placeholder="Dinner, taxi, tickets..."
                      className="w-full bg-transparent text-body text-secondary outline-none"
                      data-testid="spend-card-quick-memo"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-4 pt-3">
                  <div>
                    <p className="text-caption font-medium">{friendLine}</p>
                    <p className="text-caption text-secondary">Equal split · {currentRailLabel}</p>
                  </div>
                  {participantIds.length > 0 && amount > 0 && (
                    <p className="text-caption font-semibold tabular-nums">
                      {perPerson.toFixed(2)} each
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!canSplitPayment || committing}
                  onClick={() => void handlePayNow()}
                  className="w-full rounded-xl py-3 text-body font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  data-testid="spend-card-pay-now"
                >
                  Split this payment
                </button>
              </div>
              )}
              {receiptScanError && (
                <p className="text-caption" style={{ color: 'var(--danger)' }} data-testid="spend-card-receipt-scan-error">
                  {receiptScanError}
                </p>
              )}
            </>
          )}

          {!hasCreatedSplit && hasCaptureDraft && (
            <div className="space-y-2">
              <p className="text-label text-secondary">Ready to split</p>
              <h1 className="text-section" style={{ fontWeight: 600 }}>
                {amount > 0 ? `${amount.toFixed(2)} ${pot.baseCurrency}` : groupLabel}
              </h1>
              <p className="text-caption text-secondary">
                {friendLine}
              </p>
            </div>
          )}

          {hasCreatedSplit && (
            <div className="space-y-2">
              <p className="text-label text-secondary">
                {recordClosed ? 'Record saved' : readyToClose ? 'Ready to close' : 'Payment links'}
              </p>
              <h1 className="text-section" style={{ fontWeight: 600 }}>
                {recordClosed || readyToClose ? 'All shares confirmed' : 'Send to Leo and Nina'}
              </h1>
            </div>
          )}
        </section>

        {hasCreatedSplit && (
          <div
            className="card p-4 space-y-2"
            data-testid="spend-card-created-summary"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-body" style={{ fontWeight: 500 }}>
                  {recordClosed
                    ? 'Saved'
                    : readyToClose
                      ? 'Ready to close'
                      : 'Pay links'}
                </p>
              </div>
              {status && status.openLegCount > 0 && (
                <p className="text-caption text-secondary">
                  {status.openLegCount} open
                </p>
              )}
            </div>
          </div>
        )}

        {!hasCreatedSplit && (
          <>
        {showCaptureEntry && (
        <div className="space-y-3 card p-4" data-testid="spend-card-checkout-capture">
          <div>
            <p className="text-body font-semibold">Paste payment link</p>
          </div>
          <label className="block space-y-1.5">
            <span className="sr-only">Payment link</span>
            <textarea
              value={checkoutInput}
              onChange={(event) => setCheckoutInput(event.target.value)}
              rows={3}
              placeholder="Paste link"
              className="w-full px-3 py-2 input-field text-body resize-none"
              data-testid="spend-card-checkout-evidence"
            />
          </label>
          <button
            type="button"
            onClick={handleCheckoutCapture}
            className="btn-primary w-full px-4 py-3 text-body"
            data-testid="spend-card-use-checkout-evidence"
          >
            Review split
          </button>
          {checkoutError && (
            <p className="text-caption" style={{ color: 'var(--danger)' }} data-testid="spend-card-checkout-error">
              {checkoutError}
            </p>
          )}
          {checkoutNotice && !checkoutError && (
            <p className="text-caption text-secondary" data-testid="spend-card-checkout-notice">
              {checkoutNotice}
            </p>
          )}
        </div>
        )}

        {hasCaptureDraft && (
          <>
        {paymentEvidence && (
          <div className="card p-4 space-y-3" data-testid="spend-card-evidence-summary">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label text-secondary">{capturedLabel}</p>
                <p className="text-body mt-1" style={{ fontWeight: 500 }}>
                  {paymentEvidence.merchantName ?? memo}
                </p>
                {receiptFileName && <p className="text-caption text-secondary mt-1">{receiptFileName}</p>}
              </div>
              <p className="text-caption text-secondary pt-1">{receiptStatusLabel}</p>
            </div>
          </div>
        )}

        <div className="card p-4 space-y-3" data-testid="spend-card-receipt-items">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-secondary">Total</p>
              <p className="text-[24px] leading-tight tabular-nums" style={{ fontWeight: 600 }}>
                {amount > 0 ? amount.toFixed(2) : 'Add total'} {pot.baseCurrency}
              </p>
            </div>
            <p className="text-caption text-secondary">
              {participantIds.length} people
            </p>
          </div>

          {participantIds.length > 0 && amount > 0 && (
            <div className="list-row p-3">
              <p className="text-label text-secondary">Each person pays</p>
              <p className="text-body tabular-nums" style={{ fontWeight: 600 }}>
                {perPerson.toFixed(2)} {pot.baseCurrency}
              </p>
              {participantNames && <p className="text-caption text-secondary mt-1">{participantNames}</p>}
            </div>
          )}

          {receiptItems.length > 0 && (
            <div className="space-y-1.5">
              {receiptItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0" data-testid="receipt-item-row">
                  <p className="text-body" style={{ fontWeight: 500 }}>{item.label}</p>
                  <p className="text-caption text-secondary tabular-nums">
                    {item.amount.toFixed(2)} {pot.baseCurrency}
                  </p>
                </div>
              ))}
              <p className="text-caption text-secondary" data-testid="receipt-item-total">
                Receipt total {receiptTotal.toFixed(2)} {pot.baseCurrency}
              </p>
            </div>
          )}
        </div>

        <details className="card p-3" data-testid="spend-card-rail-choice">
          <summary className="text-caption font-medium cursor-pointer">
            Change payment app · {currentRailLabel}
          </summary>
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {railChoices.map((rail) => (
                <button
                  key={rail.id}
                  type="button"
                  onClick={() => setSettlementRail(rail.id)}
                  className={`px-3 py-1.5 rounded-lg text-caption flex-shrink-0 transition-colors ${
                    settlementRail === rail.id ? 'text-white' : 'bg-card text-secondary border border-border'
                  }`}
                  style={settlementRail === rail.id ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
                  data-testid={`spend-card-rail-${rail.id}`}
                >
                  {rail.label}
                </button>
              ))}
            </div>
            <p className="text-caption text-secondary" data-testid="spend-card-rail-status">
              Using {currentRailLabel}
            </p>
          </div>
        </details>

        <details className="card p-3">
          <summary className="text-caption font-medium cursor-pointer">Change split</summary>
          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <p className="text-caption font-medium">Edit items</p>
              {receiptItems.length > 0 && (
                <div className="space-y-2">
                  {receiptItems.map((item) => (
                    <div key={`edit-${item.id}`} className="rounded-2xl bg-muted/20 px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-caption font-medium">{item.label}</p>
                        <p className="text-caption text-secondary">
                          {item.amount.toFixed(2)} {pot.baseCurrency}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pot.members.map((member) => {
                          const selected = item.assignedMemberIds.includes(member.id);
                          return (
                            <button
                              key={`${item.id}-${member.id}`}
                              type="button"
                              onClick={() => toggleReceiptAssignment(item.id, member.id)}
                              className={`px-2.5 py-1 rounded-full text-micro border ${
                                selected ? 'bg-accent text-white border-accent' : 'border-border text-secondary'
                              }`}
                              style={selected ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
                              data-testid={`receipt-item-${item.id}-member-${member.id}`}
                            >
                              {member.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-[1fr_7rem] gap-2">
                <input
                  type="text"
                  value={receiptItemLabel}
                  onChange={(event) => setReceiptItemLabel(event.target.value)}
                  placeholder="Item"
                  className="px-3 py-2 input-field text-body"
                  data-testid="receipt-item-label"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={receiptItemAmount}
                  onChange={(event) => setReceiptItemAmount(event.target.value)}
                  placeholder="0.00"
                  className="px-3 py-2 input-field text-body"
                  data-testid="receipt-item-amount"
                />
              </div>
              <button
                type="button"
                onClick={addReceiptItem}
                className="btn-primary px-4 py-2 text-caption"
                data-testid="receipt-item-add"
              >
                Add item
              </button>
            </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-caption text-secondary">Amount ({pot.baseCurrency})</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount || ''}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full px-3 py-2 input-field text-body"
                data-testid="spend-card-amount"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-caption text-secondary">Memo</span>
              <input
                type="text"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                className="w-full px-3 py-2 input-field text-body"
                data-testid="spend-card-memo"
              />
            </label>

            <div className="space-y-2">
              <span className="text-caption text-secondary">Split with</span>
              <div className="flex flex-wrap gap-2">
                {pot.members.map((member) => {
                  const selected = participantIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleParticipant(member.id)}
                      className={`px-3 py-1.5 rounded-full text-caption border ${
                        selected ? 'bg-accent text-white border-accent' : 'border-border'
                      }`}
                      style={selected ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
                      data-testid={`spend-card-member-${member.id}`}
                    >
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </details>

        <button
          type="button"
          disabled={committing || amount <= 0 || participantIds.length === 0}
          onClick={() => void handlePayNow()}
          className="w-full py-3 rounded-xl text-body font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          data-testid="spend-card-pay-now"
        >
          Split this payment
        </button>

          </>
        )}
          </>
        )}

        {hasCreatedSplit && status && status.openLegCount > 0 && chapter && (
          <div className="space-y-2">
            <p className="text-label text-secondary px-1">Send links</p>
            {status.legs
              .filter((leg) => leg.state === 'open' && legPayTokens[leg.id])
              .map((leg) => {
                const token = legPayTokens[leg.id]!;
                const url = encodeCaptureUrl('pay', token);
                return (
                  <div key={leg.id} className="card p-3 space-y-2">
                    <p className="text-body" style={{ fontWeight: 500 }}>
                      {leg.fromName} → {leg.toName} · {leg.amount.toFixed(2)} {leg.currency}
                    </p>
                    <CaptureShareActions
                      path="pay"
                      token={token}
                      variant="compact"
                      shareText={buildPayShareText({
                        amount: leg.amount,
                        currency: leg.currency,
                        counterpartyName: leg.toName,
                        url,
                      })}
                      onShowToast={onShowToast}
                    />
                  </div>
                );
              })}
          </div>
        )}

      </div>

      <CaptureChapterPanel
        status={showStatusPanel ? status : null}
        currentMemberId={effectiveMemberId}
        isLoading={committing}
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
      onOpenHandoff={onOpenHandoff}
      />
    </div>
  );
}
