import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { Copy, Loader2 } from 'lucide-react';
import { polkadotChainService } from '../services/chain/polkadot';
import Identicon from '@polkadot/react-identicon';
import { formatDOT } from '../utils/platformFee';

interface SettlementConfirmModalProps {
  isOpen: boolean;
  fromAddress: string; // SS58-0
  toAddress: string; // SS58-0
  fromName: string;
  toName: string;
  amountDot: number; // Amount in DOT (number, e.g. 0.017)
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSending?: boolean;
}

export function SettlementConfirmModal({
  isOpen,
  fromAddress,
  toAddress,
  toName,
  amountDot,
  onConfirm,
  onCancel,
  isSending = false,
}: SettlementConfirmModalProps) {
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);

  // Estimate fee when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    setFeeLoading(true);
    setFeeError(false);
    
    polkadotChainService
      .estimateFee({
        from: fromAddress,
        to: toAddress,
        amountDot,
      })
      .then((feePlanck) => {
        // Convert planck to DOT (10 decimals)
        const feeDot = parseFloat(feePlanck) / 1e10;
        setEstimatedFee(feeDot.toFixed(6));
        setFeeLoading(false);
      })
      .catch((error) => {
        console.error('[SettlementConfirmModal] Fee estimation error:', error);
        setFeeError(true);
        setFeeLoading(false);
      });
  }, [isOpen, fromAddress, toAddress, amountDot]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const totalAmount = amountDot + (estimatedFee ? parseFloat(estimatedFee) : 0);

  return (
    <BottomSheet isOpen={isOpen} onClose={onCancel} title="Confirm Settlement">
      <div className="flex flex-col space-y-4">
        {/* Transaction Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">From:</span>
            <div className="flex items-center gap-2">
              <Identicon value={fromAddress} size={16} theme="polkadot" />
              <span className="text-xs font-mono">{`${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}`}</span>
              <button
                onClick={() => handleCopyAddress(fromAddress)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Copy address"
              >
                <Copy className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">To:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{toName}</span>
              <Identicon value={toAddress} size={16} theme="polkadot" />
              <span className="text-xs font-mono">{`${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`}</span>
              <button
                onClick={() => handleCopyAddress(toAddress)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Copy address"
              >
                <Copy className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Amount:</span>
            <span className="text-sm font-semibold tabular-nums">{amountDot.toFixed(6)} DOT</span>
          </div>
          
          {/* Fee Estimate */}
          {feeLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Estimating fee…</span>
            </div>
          )}
          
          {!feeLoading && estimatedFee && !feeError && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Network fee (est.):</span>
              <span className="text-xs tabular-nums text-muted-foreground">{formatDOT(parseFloat(estimatedFee))}</span>
            </div>
          )}
          
          {!feeLoading && feeError && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Network fee (est.):</span>
              <span className="text-xs text-muted-foreground">Fee unavailable</span>
            </div>
          )}
          
          <div className="border-t border-border/50 pt-2 flex justify-between items-center">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-sm font-semibold tabular-nums">
              {feeLoading ? '...' : feeError ? `${amountDot.toFixed(6)} + fee` : `${totalAmount.toFixed(6)} DOT`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={isSending}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
              isSending
                ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                : 'bg-accent text-white hover:opacity-90'
            }`}
          >
            {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSending ? 'Sending...' : 'Send DOT'}</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

