import { Receipt, TrendingUp, TrendingDown, CheckCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useState } from 'react';
import type { ActivityEvent } from '../../hooks/useActivityFeed';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { formatCurrencyAmount } from '../../utils/currencyFormat';

interface ActivityHistoryProps {
  sortedActivity: ActivityEvent[];
  normalizedBaseCurrency: string;
}

export function ActivityHistory({
  sortedActivity,
  normalizedBaseCurrency,
}: ActivityHistoryProps) {
  const [showActivity, setShowActivity] = useState(false);

  return (
    <div className="mx-3">
      <button
        onClick={() => setShowActivity(!showActivity)}
        className="w-full flex items-center justify-between p-3 rounded-xl transition-all active:scale-[0.98]"
        style={{
          background: 'var(--card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-label" style={{ fontWeight: 500 }}>Recent Activity</span>
          <span className="text-caption px-1.5 py-0.5 rounded-full" style={{
            background: 'var(--muted)',
            color: 'var(--card)',
          }}>
            {sortedActivity.length}
          </span>
        </div>
        {showActivity ? (
          <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        )}
      </button>

      {showActivity && (
        <div className="mt-2 p-3 rounded-xl space-y-2" style={{
          background: 'var(--card)',
          boxShadow: 'var(--shadow-card)',
        }}>
          {sortedActivity.length === 0 ? (
            <p className="text-micro text-center py-4" style={{ color: 'var(--text-secondary)' }}>
              No activity yet
            </p>
          ) : (
            <div className="space-y-2">
              {sortedActivity.map((event) => (
                <ActivityRow
                  key={event.id}
                  event={event}
                  normalizedBaseCurrency={normalizedBaseCurrency}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  event,
  normalizedBaseCurrency,
}: {
  event: ActivityEvent;
  normalizedBaseCurrency: string;
}) {
  const bgColour = event.type === 'attestation' ? 'rgba(25, 195, 125, 0.1)'
    : event.type === 'contribution' ? 'rgba(86, 243, 154, 0.1)'
    : event.type === 'withdrawal' ? 'rgba(255, 149, 0, 0.1)'
    : 'rgba(230, 0, 122, 0.1)';

  return (
    <div className="flex items-start gap-2 pb-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: bgColour }}
      >
        {event.type === 'attestation' && <CheckCircle className="w-3 h-3" style={{ color: 'var(--success)' }} />}
        {event.type === 'expense_added' && <Receipt className="w-3 h-3" style={{ color: 'var(--accent-pink)' }} />}
        {event.type === 'contribution' && <TrendingUp className="w-3 h-3" style={{ color: 'var(--success)' }} />}
        {event.type === 'withdrawal' && <TrendingDown className="w-3 h-3" style={{ color: 'var(--ink)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-caption leading-snug">{event.description}</p>
        <p className="text-micro mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {formatRelativeTime(event.timestamp)}
        </p>
      </div>
      {event.metadata?.amount && (
        <span className="text-caption tabular-nums flex-shrink-0" style={{
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}>
          {formatCurrencyAmount(event.metadata.amount, event.metadata.currency || normalizedBaseCurrency)}
        </span>
      )}
    </div>
  );
}
