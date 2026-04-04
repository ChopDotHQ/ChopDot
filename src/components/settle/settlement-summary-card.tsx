interface Settlement {
  direction: 'owe' | 'owed';
  totalAmount: number;
  name: string;
}

interface SettlementSummaryCardProps {
  settlements: Settlement[];
  totalAmount: number;
  isPaying: boolean;
  counterparty: string;
  assetSymbol: string;
  formatAmount: (amount: number) => string;
}

export function SettlementSummaryCard({
  totalAmount,
  isPaying,
  counterparty,
  formatAmount,
}: SettlementSummaryCardProps) {
  return (
    <div className="card p-4 space-y-2">
      <p className="text-micro text-secondary uppercase tracking-wide">
        {isPaying ? 'You owe' : 'Owed to you'}
      </p>
      <p className="text-[32px] tabular-nums font-bold" style={{ color: isPaying ? 'var(--destructive)' : 'var(--success)' }}>
        {formatAmount(Math.abs(totalAmount))}
      </p>
      <p className="text-caption text-secondary">
        {isPaying ? `Pay ${counterparty}` : `Collect from ${counterparty}`}
      </p>
    </div>
  );
}
