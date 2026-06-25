// @ts-nocheck
import { useChapterState } from "../../hooks/useChapterState";
import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from '../TopBar';
import { useData } from '../../services/data/DataContext';
import { usePot } from '../../hooks/usePot';
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
import { AddToWalletButton } from '../capture/AddToWalletButton';
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

  
  const chapter: any = { spendCards: [] };
  const status: any = 'idle';
  const confirm: any = async () => {};
  const close: any = async () => {};
  const markPaid: any = async () => {};
  const refresh: any = async () => {};
  const chapterLoading = false;


  const chapter: any = { spendCards: [] };
  const resolvedSpendCardId =
    spendCardId ?? chapter?.spendCards?.[0]?.id ?? `sc_${potId}`;

  const defaultParticipants = useMemo(() => {
    const allMemberIds = pot?.members.map((member) => member.id) ?? [payerMemberId];
    const card = chapter?.spendCards?.find((item: any) => item.id === resolvedSpendCardId);
    if (card?.recentParticipantIds?.length && card.recentParticipantIds.length > 1) {
      return card.recentParticipantIds;
    }
    return allMemberIds;
  }, [chapter?.spendCards, resolvedSpendCardId, pot?.members, payerMemberId]);

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
  const capturedLabel = paymentEvidence?.kind === 'receipt' ? 'Receipt saved' : 'Payment saved';
  const hasCaptureDraft = Boolean(paymentEvidence || receiptItems.length > 0 || amount > 0 || (memo && memo !== 'Spend'));
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
  const spendCardLabel = chapter?.spendCards?.find((card: any) => card.id === resolvedSpendCardId)?.label;
  const groupLabel = pot?.spendGroup?.label ?? spendCardLabel ?? pot?.name ?? 'Group';
  const currentRailLabel = railChoices.find((rail) => rail.id === settlementRail)?.label ?? 'payment app';
  const groupPeopleText =
    participantIds.length === 1
      ? '1 person'
      : `${participantIds.length} people`;
  const friendLine = friendNames
    ? `With ${friendNames}`
    : `${groupPeopleText} included`;

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
      setCheckoutNotice(
        scannedItems.length > 1
          ? 'Receipt read. Check the split before sending links.'
          : 'Receipt read. Check the total before sending links.',
      );
      setCaptureEntryOpen(false);
      onShowToast?.('Receipt read', 'success');
    } catch (error: any) {
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
    onShowToast?.('Filled from receipt', parsed.evidence.status === 'unconfirmed' ? 'info' : 'success');
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
      onShowToast?.('Split ready — send pay links or complete the handoff', 'success');
      await refresh();
      window.setTimeout(() => {
        document
          .querySelector('[data-testid="spend-card-created-summary"]')
          ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }, 50);
    } catch (error: any) {
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

      <div className="p-4 space-y-3 pb-8">
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
              <div className="space-y-2">
                <h1 className="text-section" style={{ fontWeight: 600 }}>{groupLabel}</h1>
              </div>

              <div className="list-row p-4 space-y-3" data-testid="receipt-placeholder">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-label text-secondary">Payment</p>
                    <p className="text-body mt-1" style={{ fontWeight: 600 }}>{friendLine}</p>
                  </div>
                  <p className="text-caption font-medium">{currentRailLabel}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/10 px-3 py-2">
                    <p className="text-micro text-secondary">Split</p>
                    <p className="text-caption font-medium">Equal</p>
                  </div>
                  <div className="rounded-xl bg-muted/10 px-3 py-2">
                    <p className="text-micro text-secondary">Missing</p>
                    <p className="text-caption font-medium">Receipt or total</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => receiptFileInputRef.current?.click()}
                disabled={receiptScanning}
                className="w-full rounded-xl py-3 text-body transition-all duration-200 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                data-testid="spend-card-add-receipt"
              >
                {receiptScanning ? 'Reading receipt…' : 'Scan receipt'}
              </button>
              {receiptScanError && (
                <p className="text-caption" style={{ color: 'var(--danger)' }} data-testid="spend-card-receipt-scan-error">
                  {receiptScanError}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setCaptureEntryOpen(true);
                  setCheckoutError(null);
                }}
                className="w-full py-2 text-caption font-medium text-secondary"
                data-testid="spend-card-paste-link"
              >
                Paste payment link instead
              </button>
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
                {recordClosed ? 'Record saved' : readyToClose ? 'Ready to close' : 'Split ready'}
              </p>
              <h1 className="text-section" style={{ fontWeight: 600 }}>
                {recordClosed || readyToClose ? 'All shares confirmed' : 'Payment links are ready'}
              </h1>
              <p className="text-caption text-secondary">
                {recordClosed
                  ? 'This record is closed.'
                  : readyToClose
                    ? 'Ready to close.'
                    : 'Waiting for friends to pay.'}
              </p>
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
                    ? 'All shares are confirmed.'
                    : readyToClose
                      ? 'Ready to close.'
                      : 'Send pay links'}
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
            <p className="text-caption font-medium">Receipt or payment link</p>
            <p className="text-caption text-secondary mt-1">
              Paste what you have. You can review before sending payment links.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-caption text-secondary">Receipt or payment link</span>
            <textarea
              value={checkoutInput}
              onChange={(event) => setCheckoutInput(event.target.value)}
              rows={3}
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
            Review payment
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

        {!hasCaptureDraft && !showCaptureEntry && (
          <details className="card p-3">
            <summary className="text-caption font-medium cursor-pointer">No receipt? Enter amount manually</summary>
            <div className="mt-3 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-caption text-secondary">Amount ({pot.baseCurrency})</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount || ''}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  className="w-full px-3 py-2 input-field text-body"
                  data-testid="spend-card-amount-fallback"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-caption text-secondary">What was it for?</span>
                <input
                  type="text"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  className="w-full px-3 py-2 input-field text-body"
                  data-testid="spend-card-memo-fallback"
                />
              </label>
            </div>
          </details>
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
            {checkoutNotice && !checkoutError && (
              <p className="text-secondary" data-testid="spend-card-checkout-notice">
                {checkoutNotice}
              </p>
            )}
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
                    settlementRail === rail.id ? 'text-white' : 'bg-white text-secondary border border-border'
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
          className="w-full py-3 rounded-xl text-body transition-all duration-200 active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          data-testid="spend-card-pay-now"
        >
          {settlementRail === 'twint' ? 'Send TWINT links' : 'Send payment links'}
        </button>

        <p className="text-caption text-secondary" data-testid="spend-card-next-step">
          After this, friends get one payment action. The receiver confirms what arrived, then the group can close a readable receipt.
        </p>
          </>
        )}
          </>
        )}

        {hasCreatedSplit && status && status.openLegCount > 0 && chapter && (
          <div className="space-y-2">
            <p className="text-label text-secondary px-1">Share pay links</p>
            {status.legs
              .filter((leg: any) => leg.state === 'open' && legPayTokens[leg.id])
              .map((leg: any) => {
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

        {hasCreatedSplit && chapter && (
          <details className="card p-3">
            <summary className="text-caption font-medium cursor-pointer">Save shortcut</summary>
            <div className="mt-3">
              <AddToWalletButton
                potId={potId}
                chapterId={chapter.id}
                spendCardId={resolvedSpendCardId}
                payerId={effectiveMemberId}
                label={chapter.spendCards?.find((card: any) => card.id === resolvedSpendCardId)?.label ?? pot.name}
                onShowToast={onShowToast}
              />
            </div>
          </details>
        )}
      </div>

      <CaptureChapterPanel
        status={hasCreatedSplit ? status : null}
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
