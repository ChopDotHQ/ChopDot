const METHODS = [
  { id: 'cash', label: 'Cash', emoji: '💵' },
  { id: 'bank', label: 'Bank transfer', emoji: '🏦' },
  { id: 'paypal', label: 'PayPal', emoji: '🅿️' },
  { id: 'twint', label: 'TWINT', emoji: '📱' },
] as const;

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  polkadotEnabled?: boolean;
  showCryptoMethod?: boolean;
  isCryptoMethodEnabled?: boolean;
  walletConnected?: boolean;
  cryptoLabel?: string;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
}: PaymentMethodSelectorProps) {
  return (
    <div className="card p-4 space-y-2">
      <p className="text-body font-medium mb-3">Payment method</p>
      <div className="grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMethod(m.id)}
            className={`p-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
              selectedMethod === m.id
                ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                : 'border-border bg-card hover:border-[var(--accent)]/40'
            }`}
          >
            <span className="text-lg">{m.emoji}</span>
            <p className="text-caption mt-1" style={{ fontWeight: selectedMethod === m.id ? 600 : 400 }}>
              {m.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
