import { Loader2 } from 'lucide-react';

interface SettleFooterProps {
  selectedMethod: string;
  isSimulationMode?: boolean;
  walletConnected?: boolean;
  recipientAddress?: string;
  showConnectWalletNotice?: boolean;
  isValid?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  connectExtension?: (() => void) | undefined;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  buttonLabelOverride?: string;
}

export function SettleFooter({
  isValid = true,
  isLoading = false,
  onConfirm,
  buttonLabelOverride,
  selectedMethod,
}: SettleFooterProps) {
  const defaultLabel =
    selectedMethod === 'cash' ? 'Mark as cash' :
    selectedMethod === 'bank' ? 'Mark as bank transfer' :
    selectedMethod === 'paypal' ? 'Mark as PayPal' :
    selectedMethod === 'twint' ? 'Mark as TWINT' :
    'Confirm settlement';

  const label = buttonLabelOverride ?? defaultLabel;

  return (
    <div className="p-4 border-t border-border">
      <button
        onClick={onConfirm}
        disabled={!isValid || isLoading}
        className={`w-full py-3 rounded-xl text-body font-semibold transition-all flex items-center justify-center gap-2 ${
          isValid && !isLoading
            ? 'bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.98]'
            : 'bg-muted/30 text-secondary cursor-not-allowed'
        }`}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
}
