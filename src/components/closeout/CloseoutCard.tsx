import { CheckCircle2, Clock, AlertCircle, Download, Share2 } from 'lucide-react';
import type { SettlementLeg } from '../../types/app';

interface CloseoutCardProps {
  potName: string;
  legs: SettlementLeg[];
  members: Array<{ id: string; name: string }>;
  baseCurrency: string;
  closedAt?: string;
  note?: string;
  onShare?: () => void;
  onDownload?: () => void;
}

type LegSummary = {
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  status: 'confirmed' | 'paid' | 'pending';
};

function statusIcon(status: LegSummary['status']) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />;
    case 'paid':
      return <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    case 'pending':
      return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  }
}

function statusLabel(status: LegSummary['status']) {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'paid':
      return 'Paid, waiting for confirmation';
    case 'pending':
      return 'Still open';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CloseoutCard({
  potName,
  legs,
  members,
  baseCurrency,
  closedAt,
  note,
  onShare,
  onDownload,
}: CloseoutCardProps) {
  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? id;

  const summaries: LegSummary[] = legs.map((leg) => ({
    fromName: getMemberName(leg.fromMemberId),
    toName: getMemberName(leg.toMemberId),
    amount: leg.amount,
    currency: leg.currency || baseCurrency,
    status: leg.status,
  }));

  const allConfirmed = summaries.every((s) => s.status === 'confirmed');
  const confirmedCount = summaries.filter((s) => s.status === 'confirmed').length;
  const openCount = summaries.length - confirmedCount;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 space-y-4"
      data-testid="closeout-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-body font-semibold">{potName}</p>
          <p className="text-caption text-secondary mt-0.5">
            {allConfirmed ? 'Everyone settled' : `${openCount} still open`}
          </p>
          {closedAt && (
            <p className="text-caption text-secondary mt-0.5">
              Saved {formatDate(closedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {allConfirmed ? (
            <span className="rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-caption font-medium">
              Closed
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-caption font-medium">
              Closed with open items
            </span>
          )}
        </div>
      </div>

      {note && (
        <div className="rounded-xl bg-background px-3 py-2">
          <p className="text-caption text-secondary">Note</p>
          <p className="text-caption font-medium mt-0.5">{note}</p>
        </div>
      )}

      {/* Payment lines */}
      <div className="space-y-2">
        {summaries.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl bg-background px-3 py-2"
            data-testid={`closeout-leg-${i}`}
          >
            {statusIcon(s.status)}
            <div className="flex-1 min-w-0">
              <p className="text-caption font-medium truncate">
                {s.fromName} → {s.toName}
              </p>
              <p className="text-caption text-secondary">
                {s.currency} {s.amount.toFixed(2)} · {statusLabel(s.status)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {onShare && (
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-caption font-medium transition-all active:scale-[0.98]"
            data-testid="closeout-share"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-caption font-medium transition-all active:scale-[0.98]"
            data-testid="closeout-download"
          >
            <Download className="w-3.5 h-3.5" />
            Save receipt
          </button>
        )}
      </div>
    </div>
  );
}
