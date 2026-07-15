import { Banknote, Building2, Smartphone, Wallet } from 'lucide-react';

const METHODS = [
  { id: 'cash', label: 'Cash', Icon: Banknote },
  { id: 'bank', label: 'Bank transfer', Icon: Building2 },
  { id: 'paypal', label: 'PayPal', Icon: Wallet },
  { id: 'twint', label: 'TWINT', Icon: Smartphone },
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
    <div className="space-y-3">
      <p className="px-1 text-label font-semibold">Choose method</p>
      <div className="space-y-3">
        {METHODS.map((m) => {
          const Icon = m.Icon;
          const selected = selectedMethod === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMethod(m.id)}
              className="w-full rounded-[22px] px-4 py-4 text-left transition-all active:scale-[0.98]"
              style={{
                borderRadius: 22,
                background: selected
                  ? 'linear-gradient(135deg, rgba(230,0,122,0.24), rgba(255,255,255,0.075))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045))',
                boxShadow: selected
                  ? '0 16px 42px rgba(230,0,122,0.10), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 14px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selected ? 'bg-[var(--accent)]/22' : 'bg-black/20'}`}>
                    <Icon className="w-4 h-4" style={{ color: selected ? 'var(--accent)' : 'var(--foreground)' }} />
                  </div>
                  <p className="text-body" style={{ fontWeight: selected ? 700 : 600 }}>
                    {m.label}
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${selected ? 'bg-[var(--accent)]' : 'bg-white/14'}`}
                >
                  {selected && <span className="block w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
