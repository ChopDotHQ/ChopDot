import type { Settlement } from './settle-home-types';

interface SettlementSummaryCardProps {
  settlements: Settlement[];
  totalAmount: number;
  isPaying: boolean;
  counterparty: string;
  assetSymbol: string;
  formatAmount: (amount: number) => string;
}

export const SettlementSummaryCard = ({
  settlements,
  totalAmount,
  isPaying,
  counterparty,
  assetSymbol,
  formatAmount,
}: SettlementSummaryCardProps) => {
  const pots = settlements[0]?.pots;
  const showBreakdown = settlements.length > 0 && pots && pots.length > 1;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption text-secondary">{isPaying ? 'Paying' : 'Collecting from'}</p>
          <p className="text-body" style={{ fontWeight: 500 }}>{counterparty}</p>
        </div>
        <div className="text-right">
          <p
            className="tabular-nums"
            style={{
              fontSize: '28px',
              fontWeight: 600,
              lineHeight: 1.2,
              color: isPaying ? 'var(--foreground)' : 'var(--money)',
            }}
          >
            {formatAmount(totalAmount)}
          </p>
        </div>
      </div>
      {showBreakdown && (
        <div className="pt-2 border-t border-border/50 space-y-1">
          {pots.map(pot => (
            <div key={pot.potId} className="flex justify-between text-caption text-secondary">
              <span>{pot.potName}</span>
              <span className="tabular-nums" style={{ fontWeight: 500 }}>
                {assetSymbol === 'USD' ? `$${pot.amount}` : `${pot.amount} ${assetSymbol}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
