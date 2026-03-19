import { useState, useEffect, useCallback } from 'react';
import Decimal from 'decimal.js';
import { TopBar } from '../TopBar';
import { WalletBanner } from '../WalletBanner';
import { HyperbridgeBridgeSheet } from '../HyperbridgeBridgeSheet';
import { isTxActive } from '../../hooks/useTxToasts';
import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';
import { useAccount } from '../../contexts/AccountContext';
import { useDotPrice } from '../../hooks/useDotPrice';
import { useFeeEstimate } from '../../hooks/useFeeEstimate';
import { useSettlementTx } from '../../hooks/useSettlementTx';
import { settlementAmountInDot } from '../../utils/fiatToDot';
import { BankForm } from '../settlement/BankForm';
import { PayPalForm } from '../settlement/PayPalForm';
import { TWINTForm } from '../settlement/TWINTForm';
import { DotSettlementPanel } from '../settlement/DotSettlementPanel';
import type { PaymentMethod, SettleHomeProps } from '../settle/settle-home-types';
import { SettlementSummaryCard } from '../settle/settlement-summary-card';
import { PaymentMethodSelector } from '../settle/payment-method-selector';
import { CashConfirmationScreen } from '../settle/cash-confirmation-screen';
import { SettleFooter } from '../settle/settle-footer';

export function SettleHome({
  settlements,
  onBack,
  onConfirm,
  onHistory,
  scope = 'global',
  scopeLabel,
  preferredMethod,
  recipientAddress,
  baseCurrency = 'USD',
  onShowToast,
}: SettleHomeProps) {
  const isDotPot = baseCurrency === 'DOT';
  const isSimulationMode = import.meta.env.VITE_SIMULATE_CHAIN === '1';
  const { POLKADOT_APP_ENABLED } = useFeatureFlags();
  const account = useAccount();
  const walletConnected = account.status === 'connected';

  const getPreselectedMethod = (): PaymentMethod => {
    const pref = preferredMethod?.toLowerCase();
    if (pref === 'bank') return 'bank';
    if (pref === 'paypal') return 'paypal';
    if (pref === 'twint') return 'twint';
    if (pref === 'dot' && POLKADOT_APP_ENABLED && !!recipientAddress) return 'dot';
    return 'bank';
  };

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(getPreselectedMethod());
  const [bankReference, setBankReference] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [twintPhone, setTwintPhone] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showBridgeSheet, setShowBridgeSheet] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    setSelectedMethod((current) => current ?? getPreselectedMethod());
  }, [preferredMethod]);

  const sumByDirection = (dir: 'owe' | 'owed'): Decimal =>
    settlements.filter(s => s.direction === dir).reduce((sum, s) => sum.plus(new Decimal(s.totalAmount)), new Decimal(0));
  const amountYouOwe = sumByDirection('owe');
  const amountOwedToYou = sumByDirection('owed');
  const totalAmount = (amountYouOwe.greaterThan(0) ? amountYouOwe : amountOwedToYou.neg()).toNumber();
  const isPaying = totalAmount > 0;
  const counterparty = settlements.length > 0 ? settlements[0]!.name : 'Unknown';

  const formatAmount = (amount: number): string => {
    const abs = Math.abs(amount);
    return isDotPot ? `${abs.toFixed(4)} DOT` : `$${abs.toFixed(2)}`;
  };

  const { dotPrice: dotPriceUsd } = useDotPrice({ enabled: isDotPot || selectedMethod === 'dot' });
  const { feeEstimate, feeLoading, feeError } = useFeeEstimate({
    fromAddress: account.address0,
    toAddress: recipientAddress ?? null,
    totalAmount,
    isDotPot,
    dotPriceUsd,
    enabled: selectedMethod === 'dot',
    isSimulationMode,
  });
  const { sendDotSettlement } = useSettlementTx({ account, onShowToast });

  const showDotMethod = POLKADOT_APP_ENABLED;
  const isDotMethodEnabled = !!recipientAddress;
  const isDotFlowActive = selectedMethod === 'dot';
  const amountDot = settlementAmountInDot(totalAmount, isDotPot, dotPriceUsd);
  const showConnectWalletNotice = isDotFlowActive && !isSimulationMode && !walletConnected;
  const isDotValid = selectedMethod === 'dot' && (isSimulationMode || walletConnected) && !!recipientAddress;
  const isValid = selectedMethod !== 'dot' || isDotValid;
  const isLoading = isSettling || isTxActive();

  const handleConfirm = useCallback(async () => {
    if (selectedMethod === 'dot' && !isSimulationMode && !walletConnected) return;

    if (selectedMethod !== 'dot') {
      setIsSettling(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSettling(false);
    }

    if (selectedMethod === 'cash') {
      setShowConfirmation(true);
      return;
    }

    if (selectedMethod === 'dot' && (isSimulationMode || (walletConnected && account.address0)) && recipientAddress) {
      try {
        setIsSettling(true);
        const { txHash } = await sendDotSettlement({
          fromAddress: account.address0 || '',
          toAddress: recipientAddress,
          totalAmount,
          isDotPot,
          dotPriceUsd,
          feeEstimate,
          isSimulationMode,
        });
        setTimeout(() => {
          setIsSettling(false);
          onConfirm(selectedMethod, txHash);
        }, 2000);
        return;
      } catch (err: unknown) {
        setIsSettling(false);
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message === 'USER_REJECTED') {
          onShowToast?.('Transaction cancelled', 'info');
        } else if (message !== 'INSUFFICIENT_BALANCE' && message !== 'DOT_PRICE_UNAVAILABLE') {
          // INSUFFICIENT_BALANCE / DOT_PRICE_UNAVAILABLE toasts fired by useSettlementTx
          onShowToast?.(`Settlement failed: ${message}`, 'error');
        }
        return;
      }
    }

    let reference: string | undefined;
    if (selectedMethod === 'bank') reference = bankReference;
    if (selectedMethod === 'paypal') reference = paypalEmail;
    if (selectedMethod === 'twint') reference = twintPhone;
    onConfirm(selectedMethod, reference);
  }, [
    selectedMethod, isSimulationMode, walletConnected, account.address0, recipientAddress,
    sendDotSettlement, totalAmount, isDotPot, dotPriceUsd, feeEstimate,
    bankReference, paypalEmail, twintPhone, onConfirm, onShowToast,
  ]);

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
              {scope === 'pot' ? '📍 Settling:' : '🌐 Across:'}
            </span>
            <span className="text-caption" style={{ fontWeight: 500 }}>{scopeLabel}</span>
          </div>
        )}

        <SettlementSummaryCard
          settlements={settlements}
          totalAmount={totalAmount}
          isPaying={isPaying}
          counterparty={counterparty}
          isDotPot={isDotPot}
          formatAmount={formatAmount}
        />

        {selectedMethod === 'dot' && walletConnected && <WalletBanner />}

        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onSelectMethod={setSelectedMethod}
          polkadotEnabled={POLKADOT_APP_ENABLED}
          showDotMethod={showDotMethod}
          isDotMethodEnabled={isDotMethodEnabled}
          walletConnected={walletConnected}
          onShowToast={onShowToast}
        />

        {selectedMethod === 'cash' && (
          <div className="card p-4">
            <p className="text-caption text-secondary">
              Mark this payment as cash. No additional details needed.
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

        {POLKADOT_APP_ENABLED && selectedMethod === 'dot' && onShowToast && (
          <DotSettlementPanel
            isSimulationMode={isSimulationMode}
            walletConnected={walletConnected}
            recipientAddress={recipientAddress}
            senderAddress={account.address0}
            isDotFlowActive={isDotFlowActive}
            baseCurrency={baseCurrency}
            totalAmount={totalAmount}
            amountDot={amountDot}
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
      </div>

      <SettleFooter
        selectedMethod={selectedMethod}
        isSimulationMode={isSimulationMode}
        walletConnected={walletConnected}
        recipientAddress={recipientAddress}
        showConnectWalletNotice={showConnectWalletNotice}
        isValid={isValid}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        connectExtension={account.connectExtension}
        onShowToast={onShowToast}
      />

      <HyperbridgeBridgeSheet
        isOpen={showBridgeSheet}
        onClose={() => setShowBridgeSheet(false)}
        onBridgeComplete={async () => {
          try {
            await account.refreshBalance();
            onShowToast?.('Bridge completed! Balance refreshed.', 'success');
          } catch {
            onShowToast?.('Bridge completed! Please refresh balance manually.', 'info');
          }
        }}
        dest="Polkadot"
        asset="DOT"
      />
    </div>
  );
}
