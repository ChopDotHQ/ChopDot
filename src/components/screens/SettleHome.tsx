import { useCallback, useState } from 'react';
import Decimal from 'decimal.js';
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
  onHistory: _onHistory,
  scope: _scope = 'global',
  scopeLabel: _scopeLabel,
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
    if (baseCurrency === 'USD') return `$${abs.toFixed(2)}`;
    if (baseCurrency === 'DOT') return `${abs.toFixed(6)} DOT`;
    return `${baseCurrency} ${abs.toFixed(2)}`;
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
    <div className="flex flex-col h-full">
      <TopBar
        title={isPaying ? `Pay ${counterparty}` : `Collect from ${counterparty}`}
        onBack={onBack}
      />

      <div className="flex-1 overflow-auto px-4 pb-8 pt-6 space-y-6">
        <SettlementSummaryCard
          settlements={settlements}
          totalAmount={totalAmount}
          isPaying={isPaying}
          counterparty={counterparty}
          assetSymbol={baseCurrency || 'USD'}
          formatAmount={formatAmount}
        />

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
          <div className="px-1">
            <p className="text-caption text-secondary">
              {isPaying
                ? 'Record this as paid in cash.'
                : 'Record this as received in cash.'}
            </p>
          </div>
        )}

        {selectedMethod === 'bank' && (
          <div className="space-y-2">
            <p className="text-label font-semibold px-1">Bank reference</p>
            <input
              type="text"
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="Bank note or transfer id"
              className="w-full px-4 py-4 rounded-2xl bg-white/[0.10] text-body text-foreground placeholder:text-secondary focus:outline-none focus-ring-pink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            />
          </div>
        )}

        {selectedMethod === 'paypal' && (
          <div className="space-y-2">
            <p className="text-label font-semibold px-1">PayPal email optional</p>
            <input
              type="email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="paypal@example.com"
              className="w-full px-4 py-4 rounded-2xl bg-white/[0.10] text-body text-foreground placeholder:text-secondary focus:outline-none focus-ring-pink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            />
          </div>
        )}

        {selectedMethod === 'twint' && (
          <div className="space-y-2">
            <p className="text-label font-semibold px-1">TWINT phone</p>
            <input
              type="tel"
              value={twintPhone}
              onChange={(e) => setTwintPhone(e.target.value)}
              placeholder="+41 79 000 00 00"
              className="w-full px-4 py-4 rounded-2xl bg-white/[0.10] text-body text-foreground placeholder:text-secondary focus:outline-none focus-ring-pink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            />
          </div>
        )}

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
          buttonLabelOverride={isPaying ? 'Mark paid' : 'Mark received'}
        />
      </div>
    </div>
  );
}
