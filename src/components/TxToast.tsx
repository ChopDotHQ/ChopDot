/**
 * TxToast - Transaction status toast component
 * 
 * Displays blockchain transaction progress with 5 states:
 * - signing: User signing transaction
 * - broadcast: Transaction broadcasting to network
 * - inBlock: Transaction included in block
 * - finalized: Transaction finalized (auto-dismiss 1.5s)
 * - error: Transaction failed
 * 
 * Features:
 * - Inline details expansion (tx hash + copy)
 * - ESC to dismiss (finalized/error only)
 * - role="status" for accessibility
 * - No focus steal
 */

import { useEffect, useState } from 'react';
import { Loader2, Upload, CheckCircle, BadgeCheck, AlertTriangle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useTxToasts } from '../hooks/useTxToasts';
import { triggerHaptic } from '../utils/haptics';

export function TxToast() {
  const { current, clear } = useTxToasts();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!current) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      // Only allow ESC dismiss for finalized or error states
      if (e.key === 'Escape' && (current.state === 'finalized' || current.state === 'error')) {
        triggerHaptic('light');
        clear();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [current, clear]);

  // Reset expanded state when toast changes
  useEffect(() => {
    setExpanded(false);
    setCopied(false);
  }, [current?.id]);

  if (!current) return null;

  const { state, meta } = current;

  // State-specific config
  const stateConfig = {
    signing: {
      icon: <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />,
      label: 'Signing…',
      showDetails: false,
    },
    broadcast: {
      icon: <Upload className="w-5 h-5" style={{ color: 'var(--accent)' }} />,
      label: 'Broadcasting…',
      showDetails: true,
    },
    inBlock: {
      icon: <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />,
      label: 'In block…',
      showDetails: true,
    },
    finalized: {
      icon: <BadgeCheck className="w-5 h-5" style={{ color: 'var(--success)' }} />,
      label: 'Finalized ✓',
      showDetails: true,
    },
    error: {
      icon: <AlertTriangle className="w-5 h-5" style={{ color: 'var(--danger)' }} />,
      label: 'Transaction failed',
      showDetails: true,
    },
  };

  const config = stateConfig[state];

  const handleCopyHash = () => {
    if (meta?.txHash) {
      navigator.clipboard.writeText(meta.txHash);
      setCopied(true);
      triggerHaptic('light');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-4 right-4 z-50 animate-slideUp"
      style={{ bottom: '84px' }}
    >
      <div
        className="p-4"
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--sh-l2)',
        }}
      >
        {/* Main toast content */}
        <div className="flex items-center justify-between gap-3">
          {/* Icon + Label */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {config.icon}
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium">{config.label}</p>
              {state === 'error' && meta?.errorMessage && (
                <p className="text-caption text-muted mt-0.5 truncate">
                  {meta.errorMessage}
                </p>
              )}
            </div>
          </div>

          {/* Details chevron (only for broadcast/inBlock/finalized/error) */}
          {config.showDetails && meta?.txHash && (
            <button
              onClick={() => {
                setExpanded(!expanded);
                triggerHaptic('light');
              }}
              className="p-1.5 hover:bg-muted/10 rounded-lg transition-colors"
              aria-label={expanded ? 'Hide details' : 'Show details'}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted" />
              )}
            </button>
          )}
        </div>

        {/* Expanded details */}
        {expanded && meta?.txHash && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            {/* Transaction hash */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-muted">Tx:</span>
              <div className="flex items-center gap-2">
                <span 
                  className="text-caption font-mono tabular-nums text-foreground"
                  title={meta.txHash}
                >
                  {truncateHash(meta.txHash)}
                </span>
                <button
                  onClick={handleCopyHash}
                  className="p-1 hover:bg-muted/10 rounded transition-colors"
                  aria-label="Copy transaction hash"
                >
                  <Copy className="w-3.5 h-3.5 text-muted" />
                </button>
              </div>
            </div>

            {/* Block number (if available) */}
            {meta.blockNumber && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-muted">Block:</span>
                <span className="text-caption font-mono tabular-nums text-foreground">
                  #{meta.blockNumber.toLocaleString()}
                </span>
              </div>
            )}

            {/* Fee (if available) */}
            {meta.fee && meta.feeCurrency && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-muted">Fee:</span>
                <span className="text-caption tabular-nums text-foreground">
                  ~{meta.fee.toFixed(4)} {meta.feeCurrency}
                </span>
              </div>
            )}

            {/* Copy confirmation */}
            {copied && (
              <p className="text-caption text-success">Copied to clipboard</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
