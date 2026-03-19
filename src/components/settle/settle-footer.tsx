import { PrimaryButton } from '../PrimaryButton';
import type { PaymentMethod, ShowToast } from './settle-home-types';
import { PAYMENT_METHOD_LABELS } from './settle-home-types';

interface SettleFooterProps {
  selectedMethod: PaymentMethod;
  isSimulationMode: boolean;
  walletConnected: boolean;
  recipientAddress?: string;
  showConnectWalletNotice: boolean;
  isValid: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  connectExtension: (selectedAddress?: string) => Promise<void>;
  onShowToast?: ShowToast;
}

export const SettleFooter = ({
  selectedMethod,
  isSimulationMode,
  walletConnected,
  recipientAddress,
  showConnectWalletNotice,
  isValid,
  isLoading,
  onConfirm,
  connectExtension,
  onShowToast,
}: SettleFooterProps) => {
  const isDotFlow = selectedMethod === 'dot';

  const buttonLabel = (() => {
    if (isDotFlow && !isSimulationMode && !walletConnected) return 'Connect Wallet in Header';
    if (isDotFlow && !recipientAddress) return 'Add Wallet Address Required';
    return `Confirm ${PAYMENT_METHOD_LABELS[selectedMethod]} Settlement`;
  })();

  return (
    <div className="p-4 bg-background border-t border-border">
      {isDotFlow && showConnectWalletNotice && (
        <div className="mb-3 p-3 rounded-lg border bg-muted/10 space-y-2" style={{ borderColor: 'var(--border)' }}>
          <p className="text-label" style={{ fontWeight: 500 }}>You&apos;ll need DOT on Polkadot to settle.</p>
          <PrimaryButton
            fullWidth
            onClick={() => {
              void connectExtension().catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Failed to connect wallet';
                onShowToast?.(message, 'error');
              });
            }}
          >
            Connect wallet
          </PrimaryButton>
        </div>
      )}
      <div title={isDotFlow && !recipientAddress ? 'No wallet address on file for this member' : undefined}>
        <PrimaryButton
          fullWidth
          onClick={onConfirm}
          disabled={!isValid || isLoading}
          loading={isLoading}
        >
          {buttonLabel}
        </PrimaryButton>
      </div>
    </div>
  );
};
