import { Loader2, CheckCircle2 } from 'lucide-react';
import { ReactNode } from 'react';

interface BalanceDisplayProps {
  amount: number;
  symbol?: string;
  networkLabel?: string;
  isRefreshing?: boolean;
  showSuccess?: boolean;
  onRefresh?: () => void | Promise<void>;
  onGetMore?: () => void;
  footer?: ReactNode;
}

export function BalanceDisplay({
  amount,
  symbol = 'DOT',
  networkLabel,
  isRefreshing,
  showSuccess,
  onRefresh,
  onGetMore,
  footer,
}: BalanceDisplayProps) {
  const formattedAmount = amount.toFixed(amount >= 1 ? 4 : 6);
  const pillBase =
    'px-3 py-1.5 min-w-[110px] text-center rounded-[var(--r-lg)] text-xs font-semibold tracking-wide uppercase transition-all disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div
      className={`p-4 rounded-[var(--r-xl)] border bg-card shadow-[var(--shadow-card)] transition-all duration-200 ${
        showSuccess ? 'ring-2 ring-success/50' : ''
      }`}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-secondary">Balance</p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-semibold tabular-nums ${showSuccess ? 'scale-[1.02]' : ''}`}>
              {formattedAmount} <span className="text-base">{symbol}</span>
            </p>
            {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-secondary" />}
            {showSuccess && !isRefreshing && <CheckCircle2 className="w-4 h-4 text-success" />}
          </div>
          {networkLabel && (
            <p className="text-xs font-medium text-secondary">
              {networkLabel}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-sm font-semibold">
          {onGetMore && (
            <button
              type="button"
              onClick={onGetMore}
              className={`${pillBase} hover:opacity-90`}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: '1px solid transparent',
              }}
            >
              Get DOT
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={pillBase}
              style={{
                background: 'var(--accent-pink-soft)',
                color: 'var(--accent)',
                border: '1px solid rgba(230,0,122,0.35)',
              }}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
