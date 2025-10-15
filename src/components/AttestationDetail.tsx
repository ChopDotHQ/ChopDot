/**
 * AttestationDetail Overlay
 * 
 * Shows expense attestation status with two states:
 * - Anchored: Expense hash anchored to Polkadot blockchain
 * - Off-chain only: Confirmed off-chain, with option to anchor
 * 
 * Educational component explaining privacy model:
 * "Only a hash is on-chain; expense details stay private."
 */

import { useState } from "react";
import { X, CheckCircle, Clock, Copy } from "lucide-react";
import { SecondaryButton } from "./SecondaryButton";
import { triggerHaptic } from "../utils/haptics";

interface AttestationDetailProps {
  anchored: boolean;
  txHash?: string;
  timestamp?: string;
  onClose: () => void;
  onAnchorNow?: () => void;
  walletConnected?: boolean;
  onConnectWallet?: () => void;
}

export function AttestationDetail({
  anchored,
  txHash,
  timestamp,
  onClose,
  onAnchorNow,
  walletConnected = false,
  onConnectWallet,
}: AttestationDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      triggerHaptic("light");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end animate-fadeIn"
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full bg-card p-4 animate-slideUp"
        style={{
          borderTopLeftRadius: "var(--r-xl)",
          borderTopRightRadius: "var(--r-xl)",
          boxShadow: "var(--sh-l2)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-medium">Attestation details</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anchored State */}
        {anchored && (
          <div className="space-y-4">
            {/* Badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg">
              <CheckCircle className="w-4 h-4" style={{ color: "var(--success)" }} />
              <span className="text-caption font-medium" style={{ color: "var(--success)" }}>
                On-chain anchored
              </span>
            </div>

            {/* Transaction hash */}
            {txHash && (
              <div className="space-y-2">
                <label className="text-caption text-muted">Transaction hash</label>
                <div className="flex items-center justify-between gap-2 p-3 bg-muted/5 rounded-lg">
                  <span
                    className="text-caption font-mono tabular-nums text-foreground flex-1 truncate"
                    title={txHash}
                  >
                    {truncateHash(txHash)}
                  </span>
                  <button
                    onClick={handleCopyHash}
                    className="p-1.5 hover:bg-muted/10 rounded transition-colors flex-shrink-0"
                    aria-label="Copy transaction hash"
                  >
                    <Copy className="w-4 h-4 text-muted" />
                  </button>
                </div>
                {copied && (
                  <p className="text-caption text-success">Copied to clipboard</p>
                )}
              </div>
            )}

            {/* Timestamp */}
            {timestamp && (
              <div className="space-y-2">
                <label className="text-caption text-muted">Anchored on</label>
                <div className="p-3 bg-muted/5 rounded-lg">
                  <span className="text-caption text-foreground">
                    {formatTimestamp(timestamp)}
                  </span>
                </div>
              </div>
            )}

            {/* Privacy note */}
            <div className="p-3 bg-muted/5 rounded-lg">
              <p className="text-caption text-muted">
                Only a hash is on-chain; expense details stay private.
              </p>
            </div>
          </div>
        )}

        {/* Off-chain Only State */}
        {!anchored && (
          <div className="space-y-4">
            {/* Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--accent-orange-soft)" }}>
              <Clock className="w-4 h-4" style={{ color: "var(--accent-orange)" }} />
              <span className="text-caption font-medium" style={{ color: "var(--accent-orange)" }}>
                Anchoring pending
              </span>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-muted/5 rounded-lg">
              <p className="text-caption text-muted">
                This expense is confirmed off-chain. You can optionally anchor a hash on Polkadot for tamper-evidence.
              </p>
            </div>

            {/* Wallet connection required */}
            {!walletConnected && onConnectWallet && (
              <div className="p-3 bg-muted/5 rounded-lg space-y-3">
                <p className="text-caption text-muted">
                  Connect your Polkadot wallet to anchor attestations on-chain.
                </p>
                <SecondaryButton fullWidth onClick={onConnectWallet}>
                  Connect Wallet
                </SecondaryButton>
              </div>
            )}

            {/* Anchor now CTA (only if wallet connected) */}
            {walletConnected && onAnchorNow && (
              <SecondaryButton fullWidth onClick={onAnchorNow}>
                Anchor now
              </SecondaryButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
