import { Banknote, Building2, Wallet, CreditCard, Smartphone } from 'lucide-react';
import type { PaymentMethod, ShowToast } from './settle-home-types';
import { triggerHaptic } from '../../utils/haptics';

interface PaymentMethodButtonProps {
  method: PaymentMethod;
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  badge?: React.ReactNode;
}

const PaymentMethodButton = ({
  method: _method,
  selected,
  onClick,
  icon: Icon,
  label,
  disabled,
  badge,
}: PaymentMethodButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-caption transition-all duration-200 ${
      selected
        ? 'bg-background border-2 border-foreground shadow-sm'
        : disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-muted/20 border-2 border-transparent'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
    {badge}
  </button>
);

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  polkadotEnabled: boolean;
  showCryptoMethod: boolean;
  isCryptoMethodEnabled: boolean;
  walletConnected: boolean;
  cryptoLabel: 'DOT' | 'USDC';
  onShowToast?: ShowToast;
}

export const PaymentMethodSelector = ({
  selectedMethod,
  onSelectMethod,
  polkadotEnabled,
  showCryptoMethod,
  isCryptoMethodEnabled,
  walletConnected,
  cryptoLabel,
  onShowToast,
}: PaymentMethodSelectorProps) => (
  <div className="space-y-3">
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
      Payment Method
    </label>
    <div
      className={`grid gap-2 p-1.5 bg-muted/5 rounded-3xl border border-border/50 ${
        polkadotEnabled && showCryptoMethod ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'
      }`}
    >
      <PaymentMethodButton method="cash" selected={selectedMethod === 'cash'} onClick={() => onSelectMethod('cash')} icon={Banknote} label="Cash" />
      <PaymentMethodButton method="bank" selected={selectedMethod === 'bank'} onClick={() => onSelectMethod('bank')} icon={Building2} label="Bank" />
      <PaymentMethodButton method="paypal" selected={selectedMethod === 'paypal'} onClick={() => onSelectMethod('paypal')} icon={CreditCard} label="PayPal" />
      <PaymentMethodButton method="twint" selected={selectedMethod === 'twint'} onClick={() => onSelectMethod('twint')} icon={Smartphone} label="TWINT" />
      {polkadotEnabled && showCryptoMethod && (
        <PaymentMethodButton
          method={cryptoLabel === 'USDC' ? 'usdc' : 'dot'}
          selected={selectedMethod === (cryptoLabel === 'USDC' ? 'usdc' : 'dot')}
          onClick={() => {
            if (isCryptoMethodEnabled) {
              onSelectMethod(cryptoLabel === 'USDC' ? 'usdc' : 'dot');
            } else {
              triggerHaptic('light');
              onShowToast?.(`Add a ${cryptoLabel} wallet address for this member first`, 'info');
            }
          }}
          disabled={!isCryptoMethodEnabled}
          icon={Wallet}
          label={cryptoLabel}
          badge={!walletConnected ? (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
          ) : undefined}
        />
      )}
    </div>

    {showCryptoMethod && !walletConnected && (
      <div className="mt-2 p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/10 flex gap-3 items-center">
        <div className="p-2 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
          <Wallet className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-[var(--accent)]">
          Connect wallet to pay with {cryptoLabel} on-chain
        </p>
      </div>
    )}
    {showCryptoMethod && walletConnected && !isCryptoMethodEnabled && (
      <p className="text-caption text-secondary mt-2 text-center">
        Add a wallet address for this person in Members to complete {cryptoLabel} settlement.
      </p>
    )}
  </div>
);
