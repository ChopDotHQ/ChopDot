/**
 * ChapterPanel
 *
 * Displays the open chapter for a pot — the commitment loop.
 *
 * Shows:
 * - Chapter status (active / partially settled / completed)
 * - Each settlement leg with its status badge
 * - "Mark paid" action for the payer
 * - "Confirm receipt" action for the receiver
 * - Visible closure when all legs are confirmed
 *
 * This component does NOT load data itself. It receives legs from
 * useChapterState and calls back to the parent for actions.
 */

import { useState } from 'react';
import { CheckCircle, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { SettlementLeg, PotStatus } from '../../types/app';
import { formatCurrencyAmount } from '../../utils/currencyFormat';

interface Member {
  id: string;
  name: string;
}

interface ChapterPanelProps {
  legs: SettlementLeg[];
  chapterStatus: PotStatus;
  members: Member[];
  currentUserId: string;
  baseCurrency: string;
  onMarkPaid: (legId: string, method: SettlementLeg['method'], reference?: string) => Promise<void>;
  onConfirmReceipt: (legId: string) => Promise<void>;
}

const STATUS_LABELS: Record<PotStatus, string> = {
  draft: 'Draft',
  active: 'In progress',
  partially_settled: 'Partially settled',
  completed: 'Closed',
  cancelled: 'Cancelled',
};

const LEG_STATUS_LABELS: Record<SettlementLeg['status'], string> = {
  pending: 'Pending',
  paid: 'Paid — awaiting confirmation',
  confirmed: 'Confirmed',
};

function getMemberName(members: Member[], id: string, currentUserId: string): string {
  if (id === currentUserId) return 'You';
  return members.find(m => m.id === id)?.name ?? 'Member';
}

function PayMethodPicker({
  onSelect,
}: {
  onSelect: (method: SettlementLeg['method'], reference?: string) => void;
}) {
  const [method, setMethod] = useState<SettlementLeg['method']>('cash');
  const [reference, setReference] = useState('');

  return (
    <div className="space-y-2 mt-2 p-3 rounded-xl bg-muted/10 border border-border">
      <p className="text-caption text-secondary">How did you pay?</p>
      <div className="flex flex-wrap gap-1.5">
        {(['cash', 'bank', 'paypal', 'twint'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className="px-2.5 py-1 rounded-lg text-caption transition-colors"
            style={{
              background: method === m ? 'var(--ink)' : 'var(--card)',
              color: method === m ? 'var(--bg)' : 'var(--ink)',
            }}
          >
            {m === 'bank' ? 'Bank' : m === 'paypal' ? 'PayPal' : m === 'twint' ? 'TWINT' : 'Cash'}
          </button>
        ))}
      </div>
      {method !== 'cash' && (
        <input
          type="text"
          placeholder={method === 'bank' ? 'Reference number (optional)' : 'Account / ID (optional)'}
          value={reference}
          onChange={e => setReference(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border text-caption bg-background"
        />
      )}
      <button
        onClick={() => onSelect(method, reference || undefined)}
        className="w-full py-2 rounded-lg text-caption font-medium"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        Mark as paid
      </button>
    </div>
  );
}

function LegRow({
  leg,
  members,
  currentUserId,
  baseCurrency,
  onMarkPaid,
  onConfirmReceipt,
}: {
  leg: SettlementLeg;
  members: Member[];
  currentUserId: string;
  baseCurrency: string;
  onMarkPaid: (legId: string, method: SettlementLeg['method'], reference?: string) => Promise<void>;
  onConfirmReceipt: (legId: string) => Promise<void>;
}) {
  const [showPayPicker, setShowPayPicker] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const fromName = getMemberName(members, leg.fromMemberId, currentUserId);
  const toName   = getMemberName(members, leg.toMemberId, currentUserId);
  const amountStr = formatCurrencyAmount(leg.amount, baseCurrency);

  const isPayer    = leg.fromMemberId === currentUserId;
  const isReceiver = leg.toMemberId === currentUserId;

  const canMarkPaid      = isPayer && leg.status === 'pending';
  const canConfirmReceipt = isReceiver && leg.status === 'paid';

  const statusColor: Record<SettlementLeg['status'], string> = {
    pending: 'var(--text-secondary)',
    paid: 'var(--accent)',
    confirmed: 'var(--success)',
  };

  return (
    <div className="p-3 card rounded-xl space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-label font-medium truncate">{fromName}</span>
          <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-label font-medium truncate">{toName}</span>
        </div>
        <span className="text-label tabular-nums font-semibold flex-shrink-0 ml-2">{amountStr}</span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        {leg.status === 'confirmed' ? (
          <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
        ) : (
          <Clock className="w-3.5 h-3.5" style={{ color: statusColor[leg.status] }} />
        )}
        <span className="text-caption" style={{ color: statusColor[leg.status] }}>
          {LEG_STATUS_LABELS[leg.status]}
        </span>
        {leg.method && (
          <span className="text-caption text-secondary">
            &bull; {leg.method === 'bank' ? 'Bank' : leg.method === 'paypal' ? 'PayPal' : leg.method === 'twint' ? 'TWINT' : 'Cash'}
            {leg.reference ? ` (${leg.reference})` : ''}
          </span>
        )}
      </div>

      {/* Payer action: mark paid */}
      {canMarkPaid && (
        <>
          <button
            onClick={() => setShowPayPicker(v => !v)}
            className="flex items-center gap-1 text-caption"
            style={{ color: 'var(--accent)' }}
          >
            <span>Mark as paid</span>
            {showPayPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showPayPicker && (
            <PayMethodPicker
              onSelect={async (method, reference) => {
                setIsActing(true);
                try {
                  await onMarkPaid(leg.id, method, reference);
                } finally {
                  setIsActing(false);
                  setShowPayPicker(false);
                }
              }}
            />
          )}
        </>
      )}

      {/* Receiver action: confirm receipt */}
      {canConfirmReceipt && (
        <button
          disabled={isActing}
          onClick={async () => {
            setIsActing(true);
            try {
              await onConfirmReceipt(leg.id);
            } finally {
              setIsActing(false);
            }
          }}
          className="w-full py-2 rounded-lg text-caption font-medium transition-all active:scale-[0.98]"
          style={{ background: 'var(--success)', color: '#fff', opacity: isActing ? 0.6 : 1 }}
        >
          {isActing ? 'Confirming…' : 'Confirm receipt'}
        </button>
      )}
    </div>
  );
}

export function ChapterPanel({
  legs,
  chapterStatus,
  members,
  currentUserId,
  baseCurrency,
  onMarkPaid,
  onConfirmReceipt,
}: ChapterPanelProps) {
  if (legs.length === 0) return null;

  const isCompleted = chapterStatus === 'completed';

  return (
    <div className="mx-3 mt-3">
      <div
        className="rounded-2xl border p-4 space-y-3"
        style={{
          borderColor: isCompleted ? 'var(--success)' : 'var(--border)',
          background: isCompleted ? 'rgba(var(--success-rgb, 34,197,94), 0.04)' : 'var(--card)',
        }}
      >
        {/* Chapter header */}
        <div className="flex items-center justify-between">
          <p className="text-label font-semibold">Settlement chapter</p>
          <span
            className="text-caption px-2 py-0.5 rounded-full"
            style={{
              background: isCompleted ? 'var(--success)' : 'var(--muted)',
              color: isCompleted ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {STATUS_LABELS[chapterStatus]}
          </span>
        </div>

        {/* Closed state */}
        {isCompleted && (
          <div className="flex items-center gap-2 py-1">
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />
            <p className="text-body" style={{ color: 'var(--success)' }}>
              All payments confirmed — chapter closed
            </p>
          </div>
        )}

        {/* Active legs */}
        {!isCompleted && (
          <div className="space-y-2">
            {legs.map(leg => (
              <LegRow
                key={leg.id}
                leg={leg}
                members={members}
                currentUserId={currentUserId}
                baseCurrency={baseCurrency}
                onMarkPaid={onMarkPaid}
                onConfirmReceipt={onConfirmReceipt}
              />
            ))}
          </div>
        )}

        {/* Next-action hint */}
        {!isCompleted && (
          <p className="text-micro text-secondary">
            {chapterStatus === 'active'
              ? 'Waiting for payers to mark payments.'
              : chapterStatus === 'partially_settled'
              ? 'Some payments marked — waiting for receivers to confirm.'
              : ''}
          </p>
        )}
      </div>
    </div>
  );
}
