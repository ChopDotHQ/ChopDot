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
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 28,
        padding: 24,
        background: 'radial-gradient(circle at 86% 18%, rgba(230,0,122,0.30), transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.13), rgba(255,255,255,0.055))',
        boxShadow: '0 24px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <div>
        <p className="text-caption text-secondary">
          {isPaying ? `Pay ${counterparty}` : `Collect from ${counterparty}`}
        </p>
        <p className="mt-3 text-[48px] leading-none tabular-nums font-semibold tracking-normal" style={{ color: 'var(--accent)' }}>
          {formatAmount(Math.abs(totalAmount))}
        </p>
      </div>
    </div>
  );
}
