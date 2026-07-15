import { Shield, ArrowRight } from 'lucide-react';

interface EmergencyPotEntryProps {
  potId: string;
  potName: string;
  targetAmount?: number;
  currentAmount?: number;
  baseCurrency: string;
  contributionStatus?: 'contributed' | 'pending' | 'none';
  onEnter: () => void;
}

export function EmergencyPotEntry({
  potName,
  targetAmount,
  currentAmount,
  baseCurrency,
  contributionStatus,
  onEnter,
}: EmergencyPotEntryProps) {
  const progress =
    targetAmount && currentAmount ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;
  const statusLabel =
    contributionStatus === 'contributed'
      ? 'You contributed'
      : contributionStatus === 'pending'
        ? 'Waiting for you'
        : 'Not started';

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 space-y-3"
      data-testid="emergency-pot-entry"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <Shield className="w-4 h-4" style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p className="text-body font-semibold">{potName}</p>
            <p className="text-caption text-secondary">Emergency help</p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-caption font-medium"
          style={{
            backgroundColor:
              contributionStatus === 'contributed'
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(245, 158, 11, 0.1)',
            color:
              contributionStatus === 'contributed' ? '#16a34a' : '#d97706',
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      {targetAmount != null && targetAmount > 0 && (
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-background overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? '#16a34a' : '#ef4444',
              }}
            />
          </div>
          <div className="flex justify-between text-micro text-secondary">
            <span>{currentAmount?.toFixed(2) ?? '0.00'} {baseCurrency}</span>
            <span>{targetAmount.toFixed(2)} {baseCurrency} target</span>
          </div>
        </div>
      )}

      <button
        onClick={onEnter}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-caption font-semibold text-white transition-all active:scale-[0.98]"
        style={{ backgroundColor: '#ef4444' }}
        data-testid="emergency-pot-contribute"
      >
        Contribute privately
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
