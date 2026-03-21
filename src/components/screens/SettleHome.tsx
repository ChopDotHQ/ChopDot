import { useCallback, useEffect, useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import { Info, ShieldCheck } from 'lucide-react';
import { TopBar } from '../TopBar';
import { WalletBanner } from '../WalletBanner';
import { HyperbridgeBridgeSheet } from '../HyperbridgeBridgeSheet';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { clearTxToast, isTxActive } from '../../hooks/useTxToasts';
import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';
import { useAccount } from '../../contexts/AccountContext';
import { useDotPrice } from '../../hooks/useDotPrice';
import { useFeeEstimate } from '../../hooks/useFeeEstimate';
import { useSettlementTx } from '../../hooks/useSettlementTx';
import { settlementAmountInDot } from '../../utils/fiatToDot';
import { normalizeToPolkadot } from '../../services/chain/address';
import { BankForm } from '../settlement/BankForm';
import { PayPalForm } from '../settlement/PayPalForm';
import { TWINTForm } from '../settlement/TWINTForm';
import { DotSettlementPanel } from '../settlement/DotSettlementPanel';
import type { PaymentMethod, SettleHomeProps, SettlementMode } from '../settle/settle-home-types';
import { SettlementSummaryCard } from '../settle/settlement-summary-card';
import { PaymentMethodSelector } from '../settle/payment-method-selector';
import { CashConfirmationScreen } from '../settle/cash-confirmation-screen';
import { SettleFooter } from '../settle/settle-footer';
import {
  getUserFacingCloseoutStatusLabel,
  getUserFacingLegStatusLabel,
  getTrackedLegUiState,
  isPvmCloseoutContractConfigured,
} from '../../services/closeout/pvmCloseout';

const TECHNICAL_PROOF_LABELS: Record<'anchored' | 'recorded' | 'completed', string> = {
  anchored: 'Settlement package started',
  recorded: 'Payment recorded',
  completed: 'Payment confirmed',
};

type SettlementProgressStep =
  | 'wallet-approval'
  | 'sending-payment'
  | 'recording-confirmation';

export function SettleHome({
  settlements,
  onBack,
  onConfirm,
  onHistory,
  onOpenTrackedConfirmation,
  scope = 'global',
  scopeLabel,
  preferredMethod,
  recipientAddress,
  baseCurrency = 'USD',
  onShowToast,
  closeoutId,
  closeoutLegIndex,
  closeoutProofStatus,
  onStartSmartSettlement,
  trackedCloseout,
  currentUserId,
  pot,
}: SettleHomeProps) {
  const isDotPot = baseCurrency === 'DOT';
  const isUsdcPot = baseCurrency === 'USDC';
  const assetSymbol: 'DOT' | 'USDC' = isUsdcPot ? 'USDC' : 'DOT';
  const defaultCryptoMethod: PaymentMethod = isUsdcPot ? 'usdc' : 'dot';
  const isSimulationMode = import.meta.env.VITE_SIMULATE_CHAIN === '1';
  const { POLKADOT_APP_ENABLED } = useFeatureFlags();
  const account = useAccount();
  const walletConnected = account.status === 'connected';

  const sumByDirection = (dir: 'owe' | 'owed'): Decimal =>
    settlements
      .filter((settlement) => settlement.direction === dir)
      .reduce((sum, settlement) => sum.plus(new Decimal(settlement.totalAmount)), new Decimal(0));
  const amountYouOwe = sumByDirection('owe');
  const amountOwedToYou = sumByDirection('owed');
  const totalAmount = (amountYouOwe.greaterThan(0) ? amountYouOwe : amountOwedToYou.neg()).toNumber();
  const isPaying = totalAmount > 0;
  const counterparty = settlements.length > 0 ? settlements[0]!.name : 'Unknown';
  const potMemberCount = Array.isArray((pot as { members?: unknown[] } | undefined)?.members)
    ? ((pot as { members?: unknown[] }).members?.length || 0)
    : 0;

  const getPreselectedMethod = (): PaymentMethod => {
    if (!isPaying) return 'bank';
    const pref = preferredMethod?.toLowerCase();
    if (pref === 'bank') return 'bank';
    if (pref === 'paypal') return 'paypal';
    if (pref === 'twint') return 'twint';
    if (pref === 'usdc' && POLKADOT_APP_ENABLED && !!recipientAddress) return 'usdc';
    if (pref === 'dot' && POLKADOT_APP_ENABLED && !!recipientAddress) return 'dot';
    return 'bank';
  };

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(getPreselectedMethod());
  const [settlementMode, setSettlementMode] = useState<SettlementMode>(trackedCloseout ? 'smart' : 'normal');
  const [bankReference, setBankReference] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [twintPhone, setTwintPhone] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showBridgeSheet, setShowBridgeSheet] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [startingSmartSettlement, setStartingSmartSettlement] = useState(false);
  const [finalityConfirmed, setFinalityConfirmed] = useState(false);
  const [localTrackedCloseout, setLocalTrackedCloseout] = useState(trackedCloseout ?? null);
  const [settlementProgressStep, setSettlementProgressStep] = useState<SettlementProgressStep | null>(null);

  useEffect(() => {
    setLocalTrackedCloseout(trackedCloseout ?? null);
    if (trackedCloseout) {
      setSettlementMode('smart');
    }
  }, [trackedCloseout]);

  useEffect(() => {
    if (settlementMode === 'smart') {
      setSelectedMethod(defaultCryptoMethod);
      return;
    }

    setSelectedMethod((current) => {
      if (current === 'dot' || current === 'usdc') {
        return getPreselectedMethod();
      }
      return current;
    });
  }, [defaultCryptoMethod, settlementMode]);

  const activeMethod = settlementMode === 'smart' ? defaultCryptoMethod : selectedMethod;
  const isCryptoFlowActive = activeMethod === 'dot' || activeMethod === 'usdc';
  const activeAsset = activeMethod === 'usdc' ? 'USDC' : 'DOT';

  const matchingCloseoutLeg = useMemo(() => {
    if (!localTrackedCloseout) return undefined;
    if (typeof closeoutLegIndex === 'number') {
      return localTrackedCloseout.legs.find((leg) => leg.index === closeoutLegIndex);
    }
    return localTrackedCloseout.legs.find((leg) => {
      if (isPaying) {
        return leg.fromMemberId === currentUserId;
      }
      return leg.toMemberId === currentUserId;
    });
  }, [closeoutLegIndex, currentUserId, isPaying, localTrackedCloseout]);

  const smartSettlementStarted = Boolean(
    localTrackedCloseout &&
    localTrackedCloseout.status !== 'draft' &&
    localTrackedCloseout.status !== 'cancelled'
  );
  const currentMemberAddress = useMemo(() => {
    const members = Array.isArray((pot as { members?: Array<{ id: string; address?: string }> } | undefined)?.members)
      ? ((pot as { members?: Array<{ id: string; address?: string }> }).members || [])
      : [];
    const rawAddress = members.find((member) => member.id === currentUserId)?.address;
    if (!rawAddress) return null;
    try {
      return normalizeToPolkadot(rawAddress);
    } catch {
      return rawAddress;
    }
  }, [currentUserId, pot?.members]);
  const connectedSenderAddress = useMemo(() => {
    if (!account.address0) return null;
    try {
      return normalizeToPolkadot(account.address0);
    } catch {
      return account.address0;
    }
  }, [account.address0]);
  const effectiveRecipientAddress = useMemo(() => {
    if (!recipientAddress) return undefined;
    try {
      return normalizeToPolkadot(recipientAddress);
    } catch {
      return recipientAddress;
    }
  }, [recipientAddress]);
  const smartSettlementConfigured = isPvmCloseoutContractConfigured() || isSimulationMode;
  const trackedLegUiState = getTrackedLegUiState(matchingCloseoutLeg);
  const smartLegRecorded =
    trackedLegUiState === 'payment_sent' || trackedLegUiState === 'proof_recorded';
  const smartLegComplete = trackedLegUiState === 'completed';
  const waitingForOtherPayer = settlementMode === 'smart' && !isPaying;
  const hasPayerWalletMismatch = Boolean(
    settlementMode === 'smart' &&
    isPaying &&
    walletConnected &&
    currentMemberAddress &&
    connectedSenderAddress &&
    currentMemberAddress !== connectedSenderAddress
  );
  const hasRecipientWalletConflict = Boolean(
    settlementMode === 'smart' &&
    isPaying &&
    walletConnected &&
    connectedSenderAddress &&
    effectiveRecipientAddress &&
    connectedSenderAddress === effectiveRecipientAddress
  );
  const showWalletSwitchBlocker = hasPayerWalletMismatch || hasRecipientWalletConflict;

  const formatAmount = (amount: number): string => {
    const abs = Math.abs(amount);
    if (isDotPot) return `${abs.toFixed(6)} DOT`;
    if (isUsdcPot) return `${abs.toFixed(6)} USDC`;
    if (activeMethod === 'usdc') return `${abs.toFixed(6)} USDC`;
    return `$${abs.toFixed(2)}`;
  };

  const { dotPrice: dotPriceUsd } = useDotPrice({ enabled: isDotPot || activeMethod === 'dot' });
  const { feeEstimate, feeLoading, feeError } = useFeeEstimate({
    fromAddress: connectedSenderAddress,
    toAddress: effectiveRecipientAddress ?? null,
    totalAmount,
    asset: activeAsset,
    baseCurrency,
    dotPriceUsd,
    enabled: isCryptoFlowActive,
    isSimulationMode,
  });
  const { sendSettlementTx } = useSettlementTx({ account, onShowToast });

  const cryptoAmount = activeMethod === 'dot'
    ? settlementAmountInDot(totalAmount, isDotPot, dotPriceUsd)
    : Math.abs(totalAmount);
  const showConnectWalletNotice = isCryptoFlowActive && !isSimulationMode && !walletConnected;
  const isCryptoValid = isCryptoFlowActive && (isSimulationMode || walletConnected) && !!effectiveRecipientAddress;
  const isValid = settlementMode === 'smart'
    ? isCryptoValid && !hasPayerWalletMismatch && !hasRecipientWalletConflict
    : !isCryptoFlowActive || isCryptoValid;
  const isLoading = isSettling || isTxActive() || startingSmartSettlement;

  const smartFlowTitle = (() => {
    if (!smartSettlementStarted) return 'Step 1: Start smart settlement';
    if (smartLegComplete) return 'Payment confirmed';
    if (smartLegRecorded) return 'Payment sent';
    if (waitingForOtherPayer) return `Waiting for ${counterparty} to pay`;
    return `Step 2: Pay ${counterparty}`;
  })();

  const smartFlowDescription = (() => {
    if (!smartSettlementStarted) {
      return 'Finalize the tab first. Then ChopDot will guide the payment and record the tracked confirmation automatically.';
    }
    if (smartLegComplete) {
      return 'This payment has been confirmed for the current smart settlement.';
    }
    if (smartLegRecorded) {
      return 'This payment was already sent. ChopDot will keep the tracked state here while proof confirmation catches up.';
    }
    if (waitingForOtherPayer) {
      return 'Tracked settlement has started for this tab. The payer still needs to complete this payment.';
    }
    return 'Approve the wallet payment below. ChopDot will attach the tracked confirmation for this tab automatically.';
  })();

  const normalFlowTitle = isPaying
    ? `You need to pay ${counterparty}`
    : `Choose how you want to collect from ${counterparty}`;
  const normalFlowDescription = isPaying
    ? 'Choose the normal payment method you want to use for this payment.'
    : 'Pick the simple offchain path, or switch to tracked payment if you want onchain confirmation.';

  const normalModeDescription = isPaying
    ? 'Offchain: cash, bank, PayPal, TWINT'
    : 'Offchain: collect manually and mark it done';
  const smartModeDescription = isPaying
    ? 'Onchain: DOT or USDC with payment proof'
    : 'Onchain: start tracked settlement and wait for payment confirmation';
  const normalModeLabel = isPaying ? 'Pay normally' : 'Collect normally';
  const smartModeLabel = isPaying ? 'Smart settle' : 'Track payment';

  const handleConfirm = useCallback(async () => {
    if (settlementMode === 'smart' && !smartSettlementStarted) {
      return;
    }

    if (isCryptoFlowActive && !isSimulationMode && !walletConnected) return;

    if (!isCryptoFlowActive) {
      setIsSettling(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSettling(false);
    }

    if (activeMethod === 'cash') {
      setShowConfirmation(true);
      return;
    }

    if (isCryptoFlowActive && (isSimulationMode || (walletConnected && connectedSenderAddress)) && effectiveRecipientAddress) {
      try {
        setIsSettling(true);
        setSettlementProgressStep('wallet-approval');
        const { txHash } = await sendSettlementTx({
          fromAddress: connectedSenderAddress || '',
          toAddress: effectiveRecipientAddress,
          totalAmount,
          asset: activeMethod === 'usdc' ? 'USDC' : 'DOT',
          baseCurrency,
          dotPriceUsd,
          feeEstimate,
          isSimulationMode,
        });
        setSettlementProgressStep('recording-confirmation');
        await onConfirm(activeMethod, txHash);
        setIsSettling(false);
        setSettlementProgressStep(null);
        return;
      } catch (err: unknown) {
        clearTxToast();
        setIsSettling(false);
        setSettlementProgressStep(null);
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message === 'USER_REJECTED') {
          onShowToast?.('Transaction cancelled', 'info');
        } else if (message !== 'INSUFFICIENT_BALANCE' && message !== 'DOT_PRICE_UNAVAILABLE') {
          onShowToast?.(`Settlement failed: ${message}`, 'error');
        }
        return;
      }
    }

    let reference: string | undefined;
    if (activeMethod === 'bank') reference = bankReference;
    if (activeMethod === 'paypal') reference = paypalEmail;
    if (activeMethod === 'twint') reference = twintPhone;
    onConfirm(activeMethod, reference);
  }, [
    activeMethod,
    bankReference,
    baseCurrency,
    connectedSenderAddress,
    dotPriceUsd,
    effectiveRecipientAddress,
    feeEstimate,
    isCryptoFlowActive,
    isSimulationMode,
    onConfirm,
    onShowToast,
    paypalEmail,
    sendSettlementTx,
    settlementMode,
    smartSettlementStarted,
    totalAmount,
    twintPhone,
    walletConnected,
  ]);

  const handleStartSmartSettlement = useCallback(async () => {
    if (!onStartSmartSettlement) return;
    if (!finalityConfirmed) {
      onShowToast?.('Confirm that the tab is ready before starting smart settlement.', 'info');
      return;
    }

    try {
      setStartingSmartSettlement(true);
      const closeout = await onStartSmartSettlement();
      if (closeout) {
        setLocalTrackedCloseout(closeout);
        onShowToast?.(`Smart settlement started. Next: pay ${counterparty} below.`, 'success');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start smart settlement';
      onShowToast?.(message, 'error');
    } finally {
      setStartingSmartSettlement(false);
    }
  }, [finalityConfirmed, onShowToast, onStartSmartSettlement]);

  const technicalStatusLabel = closeoutProofStatus
    ? TECHNICAL_PROOF_LABELS[closeoutProofStatus]
    : matchingCloseoutLeg?.status
      ? getUserFacingLegStatusLabel(matchingCloseoutLeg, currentUserId || 'owner')
      : undefined;

  const showFinalityReview = settlementMode === 'smart' && !smartSettlementStarted;
  const showNormalPaymentOptions = settlementMode === 'normal';
  const showSmartPaymentPanel =
    settlementMode === 'smart' &&
    smartSettlementStarted &&
    isPaying &&
    matchingCloseoutLeg?.status === 'pending';
  const showRecordedPaymentState =
    settlementMode === 'smart' &&
    smartSettlementStarted &&
    isPaying &&
    smartLegRecorded &&
    !smartLegComplete;
  const showFooter = (showNormalPaymentOptions || showSmartPaymentPanel) && !waitingForOtherPayer;
  const showModeChooser = !smartSettlementStarted;
  const canUseManualFallback = smartSettlementStarted && !isPaying;
  const settlementProgressCopy = (() => {
    if (!settlementProgressStep) return null;
    if (settlementProgressStep === 'wallet-approval') {
      return {
        title: 'Waiting for wallet approval',
        body: 'Approve the request in your connected wallet. After that, ChopDot will send the transfer and move to tracked confirmation.',
      };
    }
    if (settlementProgressStep === 'sending-payment') {
      return {
        title: 'Sending payment',
        body: 'The payment is being broadcast to the network now.',
      };
    }
    return {
      title: 'Recording tracked confirmation',
      body: 'The payment was sent. ChopDot is now attaching the confirmation to the smart settlement package.',
    };
  })();
  const smartProgressSteps = settlementMode === 'smart'
    ? [
      {
        id: 'start',
        label: 'Start smart settlement',
        state: !smartSettlementStarted ? 'current' as const : 'done' as const,
      },
      {
        id: 'approval',
        label: 'Wait for wallet approval',
        state: startingSmartSettlement || settlementProgressStep === 'wallet-approval'
          ? 'current' as const
          : smartSettlementStarted && (smartLegRecorded || smartLegComplete || settlementProgressStep === 'recording-confirmation')
            ? 'done' as const
            : 'upcoming' as const,
      },
      {
        id: 'payment',
        label: 'Payment sent',
        state: smartLegRecorded || smartLegComplete
          ? 'done' as const
          : settlementProgressStep === 'sending-payment'
            ? 'current' as const
            : 'upcoming' as const,
      },
      {
        id: 'proof',
        label: 'Record proof',
        state: smartLegComplete
          ? 'done' as const
          : settlementProgressStep === 'recording-confirmation'
            ? 'current' as const
            : 'upcoming' as const,
      },
      {
        id: 'confirmed',
        label: 'Payment confirmed',
        state: smartLegComplete ? 'done' as const : 'upcoming' as const,
      },
    ]
    : [];

  useEffect(() => {
    if (settlementMode !== 'smart' || !smartSettlementStarted || !isPaying) {
      return;
    }
    if (!smartLegRecorded && !smartLegComplete) {
      return;
    }
    clearTxToast();
    setIsSettling(false);
    setSettlementProgressStep(null);
  }, [isPaying, settlementMode, smartLegComplete, smartLegRecorded, smartSettlementStarted]);

  if (showConfirmation) {
    return (
      <CashConfirmationScreen
        isPaying={isPaying}
        formattedAmount={formatAmount(totalAmount)}
        onConfirm={() => onConfirm('cash')}
        onCancel={() => setShowConfirmation(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full pb-[68px]">
      <TopBar
        title="Settle Up"
        onBack={onBack}
        rightAction={onHistory ? (
          <button onClick={onHistory} className="text-label text-foreground hover:opacity-80 transition-opacity">
            History
          </button>
        ) : undefined}
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {scopeLabel && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 rounded-lg">
            <span className="text-caption text-secondary">
              {scope === 'pot' ? 'Settling:' : 'Across:'}
            </span>
            <span className="text-caption" style={{ fontWeight: 500 }}>{scopeLabel}</span>
          </div>
        )}

        <SettlementSummaryCard
          settlements={settlements}
          totalAmount={totalAmount}
          isPaying={isPaying}
          counterparty={counterparty}
          assetSymbol={isDotPot ? 'DOT' : isUsdcPot ? 'USDC' : 'USD'}
          formatAmount={formatAmount}
        />

        <div className="card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-muted/15 p-2">
              {settlementMode === 'smart' ? (
                <ShieldCheck className="w-4 h-4 text-foreground" />
              ) : (
                <Info className="w-4 h-4 text-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-body font-medium">{settlementMode === 'smart' ? smartFlowTitle : normalFlowTitle}</p>
              <p className="text-caption text-secondary">
                {settlementMode === 'smart'
                  ? smartFlowDescription
                  : normalFlowDescription}
              </p>
              {canUseManualFallback && settlementMode === 'smart' && (
                <button
                  type="button"
                  onClick={() => setSettlementMode('normal')}
                  className="pt-1 text-caption text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  Collect manually instead
                </button>
              )}
              {canUseManualFallback && settlementMode === 'normal' && (
                <button
                  type="button"
                  onClick={() => setSettlementMode('smart')}
                  className="pt-1 text-caption text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  Back to tracked status
                </button>
              )}
            </div>
          </div>
        </div>

        {showModeChooser && (
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
              Choose how to settle
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['normal', 'smart'] as SettlementMode[]).map((mode) => {
                const active = settlementMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSettlementMode(mode)}
                    className={`card p-4 rounded-2xl text-left transition-all duration-200 ${
                      active ? 'border border-foreground/40 shadow-[var(--shadow-card)]' : 'border border-border/60 hover:border-foreground/20'
                    }`}
                  >
                    <p className="text-body font-medium">{mode === 'normal' ? normalModeLabel : smartModeLabel}</p>
                    <p className="mt-1 text-caption text-secondary">
                      {mode === 'normal' ? normalModeDescription : smartModeDescription}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {settlementMode === 'smart' && localTrackedCloseout && (
          <div className="card p-4 space-y-2">
            <p className="text-body font-medium">{getUserFacingCloseoutStatusLabel(localTrackedCloseout)}</p>
            {smartSettlementStarted && isPaying && !smartLegComplete && (
              <p className="text-caption text-secondary">
                {smartLegRecorded
                  ? 'Payment detected. ChopDot is keeping the tracked state aligned for this leg.'
                  : 'Step 1 complete. Pay the highlighted leg below to finish this tab.'}
              </p>
            )}
            <p className="text-caption text-secondary">
              {localTrackedCloseout.settledLegCount} of {localTrackedCloseout.totalLegCount} payment
              {localTrackedCloseout.totalLegCount === 1 ? '' : 's'} confirmed so far.
            </p>
          </div>
        )}

        {settlementMode === 'smart' && isPaying && (
          <div className="card p-4 space-y-3">
            <p className="text-body font-medium">Tracked payment progress</p>
            <div className="space-y-2">
              {smartProgressSteps.map((step) => (
                <div key={step.id} className="flex items-center justify-between gap-3">
                  <span className="text-caption text-secondary">{step.label}</span>
                  <span
                    className={`text-caption ${
                      step.state === 'done'
                        ? 'text-foreground'
                        : step.state === 'current'
                          ? 'text-foreground'
                          : 'text-secondary'
                    }`}
                    style={{ fontWeight: step.state === 'upcoming' ? 400 : 600 }}
                  >
                    {step.state === 'done' ? 'Done' : step.state === 'current' ? 'In progress' : 'Up next'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {settlementMode === 'smart' && settlementProgressCopy && (
          <div className="card p-4 space-y-2 border border-foreground/10 bg-muted/10">
            <p className="text-body font-medium">{settlementProgressCopy.title}</p>
            <p className="text-caption text-secondary">{settlementProgressCopy.body}</p>
          </div>
        )}

        {settlementMode === 'smart' && showFinalityReview && (
          <div className="card p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-body font-medium">Smart settlement</p>
              <p className="text-caption text-secondary">
                Start the tracked version of settlement for this tab. Once it starts, ChopDot will guide the payment and record the confirmation.
              </p>
            </div>

            <div className="rounded-2xl bg-muted/10 p-4 space-y-2">
              {!smartSettlementConfigured && (
                <p className="text-caption text-secondary">
                  Smart settlement is not configured yet for this app build. Add the deployed closeout contract address before continuing.
                </p>
              )}
              <p className="text-caption text-secondary">
                {potMemberCount > 2
                  ? 'This tab has multiple participants. Make sure everyone is done adding expenses before you continue.'
                  : 'Make sure the balances are final before you continue.'}
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={finalityConfirmed}
                  onChange={(event) => setFinalityConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border bg-background"
                />
                <span className="text-caption text-secondary">
                  {potMemberCount > 2
                    ? 'I confirm this tab is ready to settle. If something changes later, the tab will need to be reopened and rebalanced.'
                    : 'I confirm the balances are final and ready for smart settlement.'}
                </span>
              </label>
            </div>

            <PrimaryButton
              fullWidth
              onClick={() => void handleStartSmartSettlement()}
              disabled={!finalityConfirmed || startingSmartSettlement || !smartSettlementConfigured}
              loading={startingSmartSettlement}
            >
              Start smart settlement
            </PrimaryButton>
            {startingSmartSettlement && (
              <p className="text-caption text-secondary">
                Step 1 of 2: waiting for wallet approval and creating the settlement package. This can take a few seconds after you approve in your connected wallet.
              </p>
            )}
          </div>
        )}

        {settlementMode === 'smart' && walletConnected && showSmartPaymentPanel && <WalletBanner />}

        {showNormalPaymentOptions && (
          <>
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onSelectMethod={setSelectedMethod}
              polkadotEnabled={false}
              showCryptoMethod={false}
              isCryptoMethodEnabled={false}
              walletConnected={walletConnected}
              cryptoLabel={assetSymbol}
              onShowToast={onShowToast}
            />

            {selectedMethod === 'cash' && (
              <div className="card p-4">
                <p className="text-caption text-secondary">
                  {isPaying
                    ? 'Mark this payment as cash. No additional details needed.'
                    : 'Mark this payment as collected in cash. No additional details needed.'}
                </p>
              </div>
            )}

            {selectedMethod === 'bank' && onShowToast && (
              <BankForm
                bankReference={bankReference}
                onBankReferenceChange={setBankReference}
                totalAmount={totalAmount}
                counterparty={counterparty}
                onShowToast={onShowToast}
              />
            )}

            {selectedMethod === 'paypal' && onShowToast && (
              <PayPalForm
                paypalEmail={paypalEmail}
                onPaypalEmailChange={setPaypalEmail}
                totalAmount={totalAmount}
                counterparty={counterparty}
                onShowToast={onShowToast}
              />
            )}

            {selectedMethod === 'twint' && onShowToast && (
              <TWINTForm
                twintPhone={twintPhone}
                onTwintPhoneChange={setTwintPhone}
                totalAmount={totalAmount}
                counterparty={counterparty}
                onShowToast={onShowToast}
              />
            )}
          </>
        )}

        {POLKADOT_APP_ENABLED && showSmartPaymentPanel && onShowToast && (
          <>
            {showWalletSwitchBlocker && (
              <div className="card p-4 space-y-2 border border-yellow-500/30 bg-yellow-500/10">
                <p className="text-body font-medium">Switch to your paying wallet</p>
                <p className="text-caption text-secondary">
                  {hasRecipientWalletConflict
                    ? 'The connected wallet matches the recipient for this payment. Switch Talisman to the wallet that owes the payment before continuing.'
                    : `You are signed in as the payer for this leg, but the connected wallet does not match your saved payout wallet. Switch Talisman to ${currentMemberAddress?.slice(0, 6)}...${currentMemberAddress?.slice(-6)} before continuing.`}
                </p>
                <div className="pt-2 space-y-1 text-caption text-secondary">
                  {currentMemberAddress && (
                    <div className="flex items-center justify-between gap-3">
                      <span>Expected payer</span>
                      <span className="font-mono text-right">
                        {currentMemberAddress.slice(0, 6)}...{currentMemberAddress.slice(-6)}
                      </span>
                    </div>
                  )}
                  {connectedSenderAddress && (
                    <div className="flex items-center justify-between gap-3">
                      <span>Connected wallet</span>
                      <span className="font-mono text-right">
                        {connectedSenderAddress.slice(0, 6)}...{connectedSenderAddress.slice(-6)}
                      </span>
                    </div>
                  )}
                  {effectiveRecipientAddress && (
                    <div className="flex items-center justify-between gap-3">
                      <span>Recipient</span>
                      <span className="font-mono text-right">
                        {effectiveRecipientAddress.slice(0, 6)}...{effectiveRecipientAddress.slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!showWalletSwitchBlocker && (
              <DotSettlementPanel
                isSimulationMode={isSimulationMode}
                walletConnected={walletConnected}
                recipientAddress={effectiveRecipientAddress}
                senderAddress={connectedSenderAddress}
                isCryptoFlowActive={true}
                assetSymbol={assetSymbol}
                assetName={assetSymbol}
                baseCurrency={baseCurrency}
                totalAmount={totalAmount}
                cryptoAmount={cryptoAmount}
                formatAmount={formatAmount}
                dotPriceUsd={dotPriceUsd}
                feeEstimate={feeEstimate}
                feeLoading={feeLoading}
                feeError={feeError}
                counterparty={counterparty}
                isDotPot={isDotPot}
                connectExtension={account.connectExtension}
                onShowToast={onShowToast}
              />
            )}
          </>
        )}

        {showRecordedPaymentState && (
          <div className="card p-4 space-y-2 border border-foreground/10 bg-muted/10">
            <p className="text-body font-medium">Payment already recorded</p>
            <p className="text-caption text-secondary">
              ChopDot detected the payment for this smart-settlement leg. Retrying proof from here will not resend funds.
            </p>
            {matchingCloseoutLeg?.settlementTxHash && (
              <div className="flex items-center justify-between gap-3 pt-1 text-caption text-secondary">
                <span>Recorded payment</span>
                <span className="font-mono text-right">
                  {matchingCloseoutLeg.settlementTxHash.slice(0, 10)}...{matchingCloseoutLeg.settlementTxHash.slice(-8)}
                </span>
              </div>
            )}
            <div className="pt-2 flex flex-col gap-3">
              {onOpenTrackedConfirmation && (
                <PrimaryButton
                  fullWidth
                  onClick={onOpenTrackedConfirmation}
                >
                  Open confirmation
                </PrimaryButton>
              )}
              <SecondaryButton
                fullWidth
                onClick={() => void handleConfirm()}
                disabled={isLoading}
                loading={isLoading}
              >
                Retry proof recording
              </SecondaryButton>
              {onHistory && (
                <button
                  type="button"
                  onClick={onHistory}
                  className="text-caption text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  View recorded payment
                </button>
              )}
            </div>
          </div>
        )}

        {settlementMode === 'smart' && (
          <details className="card p-4 group">
            <summary className="cursor-pointer list-none flex items-center justify-between">
              <span className="text-body font-medium">Technical details</span>
              <span className="text-caption text-secondary group-open:hidden">Show</span>
              <span className="text-caption text-secondary hidden group-open:inline">Hide</span>
            </summary>
            <div className="mt-4 space-y-2 text-caption text-secondary">
              <div className="flex items-center justify-between gap-3">
                <span>Network</span>
                <span className="text-right">Polkadot Asset Hub / Polkadot Hub</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Wallet</span>
                <span className="text-right">{account.walletSource || 'Browser wallet'}</span>
              </div>
              {(closeoutId || localTrackedCloseout?.closeoutId) && (
                <div className="flex items-center justify-between gap-3">
                  <span>Settlement package</span>
                  <span className="font-mono text-right">{closeoutId || localTrackedCloseout?.closeoutId}</span>
                </div>
              )}
              {typeof closeoutLegIndex === 'number' && (
                <div className="flex items-center justify-between gap-3">
                  <span>Leg</span>
                  <span className="text-right">{closeoutLegIndex + 1}</span>
                </div>
              )}
              {technicalStatusLabel && (
                <div className="flex items-center justify-between gap-3">
                  <span>Tracked confirmation</span>
                  <span className="text-right">{technicalStatusLabel}</span>
                </div>
              )}
              {matchingCloseoutLeg?.settlementTxHash && (
                <div className="flex items-center justify-between gap-3">
                  <span>Payment tx</span>
                  <span className="font-mono text-right">
                    {matchingCloseoutLeg.settlementTxHash.slice(0, 10)}...{matchingCloseoutLeg.settlementTxHash.slice(-8)}
                  </span>
                </div>
              )}
              {matchingCloseoutLeg?.proofTxHash && (
                <div className="flex items-center justify-between gap-3">
                  <span>Proof tx</span>
                  <span className="font-mono text-right">
                    {matchingCloseoutLeg.proofTxHash.slice(0, 10)}...{matchingCloseoutLeg.proofTxHash.slice(-8)}
                  </span>
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      {showFooter && (
        <SettleFooter
          selectedMethod={activeMethod}
          isSimulationMode={isSimulationMode}
          walletConnected={walletConnected}
          recipientAddress={effectiveRecipientAddress}
          showConnectWalletNotice={showConnectWalletNotice}
          isValid={isValid}
          isLoading={isLoading}
          onConfirm={handleConfirm}
          connectExtension={account.connectExtension}
          onShowToast={onShowToast}
          buttonLabelOverride={
            settlementMode === 'smart'
                ? (!walletConnected && !isSimulationMode
                  ? 'Connect wallet to continue'
                : (hasPayerWalletMismatch || hasRecipientWalletConflict)
                  ? 'Switch to your wallet to continue'
                  : !effectiveRecipientAddress
                    ? `${assetSymbol} wallet required`
                  : `Pay with ${assetSymbol}`)
              : !isPaying
                ? selectedMethod === 'cash'
                  ? 'Mark cash collected'
                  : selectedMethod === 'bank'
                    ? 'Mark bank transfer collected'
                    : selectedMethod === 'paypal'
                      ? 'Mark PayPal collected'
                      : selectedMethod === 'twint'
                        ? 'Mark TWINT collected'
                        : 'Mark collected'
                : undefined
          }
          connectPromptTitle={
            settlementMode === 'smart'
              ? `You’ll need a Polkadot wallet to pay with ${assetSymbol}.`
              : undefined
          }
          connectPromptBody={
            settlementMode === 'smart'
              ? 'Connect your wallet, approve the payment, and ChopDot will attach tracked confirmation for this tab.'
              : undefined
          }
        />
      )}

      <HyperbridgeBridgeSheet
        isOpen={showBridgeSheet}
        onClose={() => setShowBridgeSheet(false)}
        dest="Polkadot"
        asset={assetSymbol}
      />
    </div>
  );
}
