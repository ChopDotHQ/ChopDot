import { memo } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { copyWithToast } from '../../utils/clipboard';
import { triggerHaptic } from '../../utils/haptics';
import {
  computeDisplayPlatformFee,
  shouldShowPlatformFee,
  canCollectPlatformFee,
  formatDOT,
  formatFiat,
  formatFeeWithEquivalent,
  type DisplayCurrency,
} from '../../utils/platformFee';

interface DotSettlementPanelProps {
  isSimulationMode: boolean;
  walletConnected: boolean;
  recipientAddress: string | undefined;
  senderAddress: string | null;
  isDotFlowActive: boolean;
  baseCurrency: string;
  totalAmount: number;
  amountDot: number | null;
  formatAmount: (amount: number) => string;
  dotPriceUsd: number | null;
  feeEstimate: number | null;
  feeLoading: boolean;
  feeError: boolean;
  counterparty: string;
  isDotPot: boolean;
  connectExtension: () => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DotSettlementPanel = memo(function DotSettlementPanel({
  isSimulationMode,
  walletConnected,
  recipientAddress,
  senderAddress,
  isDotFlowActive,
  baseCurrency,
  totalAmount,
  amountDot,
  formatAmount,
  dotPriceUsd,
  feeEstimate,
  feeLoading,
  feeError,
  counterparty,
  isDotPot: _isDotPot,
  connectExtension,
  onShowToast,
}: DotSettlementPanelProps) {
  const fromDisplay = (isSimulationMode && !senderAddress)
    ? '15mock00000000000000000000000000000A'
    : (senderAddress || '');

  const handleCopyAddress = (address: string, label: string) => {
    copyWithToast(address, `Copied ${label} address`, (msg) => onShowToast(msg, 'info'));
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
        <p className="text-body font-medium">Polkadot Settlement</p>
      </div>
      <p className="text-caption text-secondary">
        {isSimulationMode || walletConnected
          ? `Send ${formatAmount(totalAmount)} on Polkadot. This will create an on-chain transaction${isSimulationMode ? ' (simulated)' : ''}.`
          : `Connect your Polkadot wallet to settle on-chain in ${baseCurrency}.`}
      </p>

      {(isSimulationMode || walletConnected) && recipientAddress && (
        <div className="pt-3 grid gap-2 text-caption">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">From</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-label truncate max-w-[180px]">
                {fromDisplay.slice(0, 6)}...{fromDisplay.slice(-6)}
              </span>
              <button
                className="text-micro underline opacity-70 hover:opacity-100"
                onClick={() => handleCopyAddress(fromDisplay, 'sender')}
              >
                Copy
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">To</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-label truncate max-w-[180px]">
                {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-6)}
              </span>
              <button
                className="text-micro underline opacity-70 hover:opacity-100"
                onClick={() => handleCopyAddress(recipientAddress, 'recipient')}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {walletConnected && (
        <div className="pt-3 space-y-3">
          {feeLoading && (
            <div className="flex items-center gap-2 text-caption text-muted">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Estimating…</span>
            </div>
          )}

          <div className="flex justify-between text-caption">
            <span className="text-muted">Network fee (est.):</span>
            {feeLoading ? (
              <span className="tabular-nums text-muted">Calculating...</span>
            ) : feeEstimate !== null && !feeError ? (
              <span className="tabular-nums text-muted">{formatDOT(feeEstimate)}</span>
            ) : (
              <span className="tabular-nums text-muted">~{formatDOT(0.002)}</span>
            )}
          </div>

          {shouldShowPlatformFee() && !feeLoading && (() => {
            const displayCurrency = baseCurrency as DisplayCurrency;
            const { pctStr, fee, currency } = computeDisplayPlatformFee(totalAmount, displayCurrency);
            const suffix = canCollectPlatformFee() ? '' : ' • not charged';

            if (currency === 'DOT' && dotPriceUsd && dotPriceUsd > 0) {
              const fiatEquivalent = fee * dotPriceUsd;
              return (
                <div className="flex justify-between text-caption">
                  <span className="text-muted">App fee ({pctStr}%){suffix}</span>
                  <span className="tabular-nums text-muted">
                    {formatFeeWithEquivalent(fee, fiatEquivalent, 'USD')}
                  </span>
                </div>
              );
            }

            return (
              <div className="flex justify-between text-caption">
                <span className="text-muted">App fee ({pctStr}%){suffix}</span>
                <span className="tabular-nums text-muted">{formatFiat(fee, currency)}</span>
              </div>
            );
          })()}

          {!feeLoading && <div className="border-t border-border/50" />}

          {!feeLoading && (
            <div className="flex justify-between items-start">
              <span className="text-body font-medium">Total you'll send:</span>
              <div className="text-right">
                {isDotFlowActive && !_isDotPot && dotPriceUsd && dotPriceUsd > 0 && amountDot ? (
                  <>
                    <p className="text-body font-medium tabular-nums">{formatAmount(totalAmount)}</p>
                    <p className="text-caption text-muted tabular-nums">
                      ≈ {formatDOT(amountDot)} DOT
                    </p>
                  </>
                ) : (
                  <p className="text-body font-medium tabular-nums">{formatAmount(totalAmount)}</p>
                )}
                <p className="text-caption text-muted tabular-nums">
                  + {feeEstimate !== null && !feeError
                    ? formatDOT(feeEstimate)
                    : formatDOT(0.002)} (network fee)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {isDotFlowActive && !isSimulationMode && !walletConnected && (
        <div className="pt-3 border-t border-border/50">
          <div className="card p-4 space-y-3 bg-[var(--accent)]/5 border border-[var(--accent)]/20">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <div className="flex-1 space-y-2">
                <p className="text-body" style={{ fontWeight: 500 }}>
                  Connect your wallet to pay with DOT
                </p>
                <p className="text-caption text-secondary">
                  Pay directly on the Polkadot blockchain — instant, secure, and transparent. Connect your wallet to get started.
                </p>
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    connectExtension().catch((error: unknown) => {
                      console.error('[DotSettlementPanel] Failed to connect wallet:', error);
                    });
                  }}
                  className="mt-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-body font-medium hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {walletConnected && !recipientAddress && isDotFlowActive && (
        <div className="pt-3 border-t border-border/50">
          <div className="p-2 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <p className="text-micro text-yellow-700 dark:text-yellow-300">
              ⚠️ No wallet address on file for {counterparty}. Please add their wallet address in the Members tab to settle via DOT.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
