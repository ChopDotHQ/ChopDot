import { useCallback, useState } from 'react';
import Decimal from 'decimal.js';
import { Info } from 'lucide-react';
import { TopBar } from '../TopBar';
import { SettlementSummaryCard } from '../settle/settlement-summary-card';
import { PaymentMethodSelector } from '../settle/payment-method-selector';
import { CashConfirmationScreen } from '../settle/cash-confirmation-screen';
import { SettleFooter } from '../settle/settle-footer';

type PaymentMethod = 'cash' | 'bank' | 'paypal' | 'twint';

export function SettleHome({
  settlements = [],
  onBack,
  onConfirm,
  onHistory,
  scope = 'global',
  scopeLabel,
  preferredMethod,
  baseCurrency = 'USD',
  onShowToast,
}: {
  settlements?: Array<{ direction: 'owe' | 'owed'; totalAmount: number; name: string }>;
  onBack: () => void;
  onConfirm: (method: string, reference?: string) => void;
  onHistory?: () => void;
  scope?: string;
  scopeLabel?: string;
  preferredMethod?: string;
  baseCurrency?: string;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  [key: string]: unknown;
}) {
  const sumByDirection = (dir: 'owe' | 'owed'): Decimal =>
    settlements
      .filter((s) => s.direction === dir)
      .reduce((sum, s) => sum.plus(new Decimal(s.totalAmount)), new Decimal(0));
  const amountYouOwe = sumByDirection('owe');
  const amountOwedToYou = sumByDirection('owed');
  const totalAmount = (amountYouOwe.greaterThan(0) ? amountYouOwe : amountOwedToYou.neg()).toNumber();
  const isPaying = totalAmount > 0;
  const counterparty = settlements.length > 0 ? settlements[0]!.name : 'Unknown';

  const getPreselectedMethod = (): PaymentMethod => {
    if (!isPaying) return 'bank';
    const pref = preferredMethod?.toLowerCase();
    if (pref === 'bank') return 'bank';
    if (pref === 'paypal') return 'paypal';
    if (pref === 'twint') return 'twint';
    return 'bank';
  };

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(getPreselectedMethod());
  const [bankReference, setBankReference] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [twintPhone, setTwintPhone] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const formatAmount = (amount: number): string => {
    const abs = Math.abs(amount);
    return `$${abs.toFixed(2)}`;
  };

  const handleConfirm = useCallback(async () => {
    if (selectedMethod === 'cash') {
      setShowConfirmation(true);
      return;
    }

    setIsSettling(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSettling(false);

    let reference: string | undefined;
    if (selectedMethod === 'bank') reference = bankReference;
    if (selectedMethod === 'paypal') reference = paypalEmail;
    if (selectedMethod === 'twint') reference = twintPhone;
    onConfirm(selectedMethod, reference);
  }, [selectedMethod, bankReference, paypalEmail, twintPhone, onConfirm]);

  const normalFlowTitle = isPaying
    ? `You need to pay ${counterparty}`
    : `Choose how you want to collect from ${counterparty}`;
  const normalFlowDescription = isPaying
    ? 'Choose the payment method you want to use for this payment.'
    : 'Pick the method to collect payment.';

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
          assetSymbol={baseCurrency || 'USD'}
          formatAmount={formatAmount}
        />

        <div className="card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-muted/15 p-2">
              <Info className="w-4 h-4 text-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-body font-medium">{normalFlowTitle}</p>
              <p className="text-caption text-secondary">{normalFlowDescription}</p>
            </div>
          </div>
        </div>

        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onSelectMethod={(m: string) => setSelectedMethod(m as PaymentMethod)}
          polkadotEnabled={false}
          showCryptoMethod={false}
          isCryptoMethodEnabled={false}
          walletConnected={false}
          cryptoLabel="DOT"
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

        {selectedMethod === 'bank' && (
          <div className="card p-4 space-y-3">
            <p className="text-body font-medium">Bank transfer reference</p>
            <input
              type="text"
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="Enter payment reference (optional)"
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body"
            />
          </div>
        )}

        {selectedMethod === 'paypal' && (
          <div className="card p-4 space-y-3">
            <p className="text-body font-medium">PayPal email</p>
            <input
              type="email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="paypal@example.com"
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body"
            />
          </div>
        )}

        {selectedMethod === 'twint' && (
          <div className="card p-4 space-y-3">
            <p className="text-body font-medium">TWINT phone number</p>
            <input
              type="tel"
              value={twintPhone}
              onChange={(e) => setTwintPhone(e.target.value)}
              placeholder="+41 79 000 00 00"
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body"
            />
          </div>
        )}
      </div>

      <SettleFooter
        selectedMethod={selectedMethod}
        isSimulationMode={false}
        walletConnected={false}
        recipientAddress={undefined}
        showConnectWalletNotice={false}
        isValid={true}
        isLoading={isSettling}
        onConfirm={handleConfirm}
        connectExtension={undefined}
        onShowToast={onShowToast}
        buttonLabelOverride={
          !isPaying
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
      />
    </div>
  );
}
