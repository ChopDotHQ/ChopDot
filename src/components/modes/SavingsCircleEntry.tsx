import { Users, ArrowRight, Clock } from 'lucide-react';

interface SavingsCircleEntryProps {
  potId: string;
  potName: string;
  memberCount: number;
  currentRound?: number;
  totalRounds?: number;
  paidCount?: number;
  nextRecipient?: string;
  onEnter: () => void;
}

export function SavingsCircleEntry({
  potName,
  memberCount,
  currentRound,
  totalRounds,
  paidCount,
  nextRecipient,
  onEnter,
}: SavingsCircleEntryProps) {
  const roundLabel = currentRound && totalRounds
    ? `Round ${currentRound} of ${totalRounds}`
    : 'Starting soon';
  const progressLabel = paidCount != null && memberCount > 0
    ? `${paidCount} of ${memberCount} paid`
    : `${memberCount} people`;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 space-y-3"
      data-testid="savings-circle-entry"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(var(--accent-rgb, 99,102,241), 0.1)' }}
          >
            <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-body font-semibold">{potName}</p>
            <p className="text-caption text-secondary">Savings circle</p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-caption font-medium">
          {roundLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background px-3 py-2">
          <p className="text-micro text-secondary">Progress</p>
          <p className="text-caption font-medium">{progressLabel}</p>
        </div>
        {nextRecipient && (
          <div className="rounded-xl bg-background px-3 py-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-secondary" />
              <p className="text-micro text-secondary">Receives next</p>
            </div>
            <p className="text-caption font-medium">{nextRecipient}</p>
          </div>
        )}
      </div>

      <button
        onClick={onEnter}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-caption font-semibold text-white transition-all active:scale-[0.98]"
        style={{ backgroundColor: 'var(--accent)' }}
        data-testid="savings-circle-review"
      >
        Review this round
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
