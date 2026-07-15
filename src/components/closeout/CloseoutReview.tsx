import { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import type { SettlementLeg } from '../../types/app';

interface CloseoutReviewProps {
  potName: string;
  legs: SettlementLeg[];
  members: Array<{ id: string; name: string }>;
  baseCurrency: string;
  currentUserId: string;
  onClose: (annotation?: string) => void;
  onCancel: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function CloseoutReview({
  potName,
  legs,
  members,
  baseCurrency,
  currentUserId: _currentUserId,
  onClose,
  onCancel,
  onShowToast: _onShowToast,
}: CloseoutReviewProps) {
  const [annotation, setAnnotation] = useState('');

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? id;

  const confirmed = legs.filter((l) => l.status === 'confirmed');
  const paid = legs.filter((l) => l.status === 'paid');
  const pending = legs.filter((l) => l.status === 'pending');
  const hasOpenItems = paid.length > 0 || pending.length > 0;
  const canClose = !hasOpenItems || annotation.trim().length > 0;

  const handleClose = () => {
    if (!canClose) return;
    onClose(hasOpenItems ? annotation.trim() : undefined);
  };

  return (
    <div
      className="flex flex-col h-full bg-background"
      data-testid="closeout-review-screen"
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <p className="text-body font-semibold">{potName}</p>
        <p className="text-caption text-secondary mt-0.5">
          Save record
        </p>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
        {/* Confirmed */}
        {confirmed.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-caption font-medium text-green-700">
                Confirmed ({confirmed.length})
              </p>
            </div>
            {confirmed.map((leg) => (
              <div
                key={leg.id}
                className="rounded-xl bg-green-50 border border-green-200 px-3 py-2"
              >
                <p className="text-caption font-medium">
                  {getMemberName(leg.fromMemberId)} → {getMemberName(leg.toMemberId)}
                </p>
                <p className="text-caption text-secondary">
                  {leg.currency || baseCurrency} {leg.amount.toFixed(2)} · Confirmed received
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Paid but not confirmed */}
        {paid.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <p className="text-caption font-medium text-amber-700">
                Paid, not confirmed ({paid.length})
              </p>
            </div>
            {paid.map((leg) => (
              <div
                key={leg.id}
                className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2"
              >
                <p className="text-caption font-medium">
                  {getMemberName(leg.fromMemberId)} → {getMemberName(leg.toMemberId)}
                </p>
                <p className="text-caption text-secondary">
                  {leg.currency || baseCurrency} {leg.amount.toFixed(2)} · Waiting for confirmation
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Not yet paid */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-caption font-medium text-red-700">
                Still open ({pending.length})
              </p>
            </div>
            {pending.map((leg) => (
              <div
                key={leg.id}
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-2"
              >
                <p className="text-caption font-medium">
                  {getMemberName(leg.fromMemberId)} → {getMemberName(leg.toMemberId)}
                </p>
                <p className="text-caption text-secondary">
                  {leg.currency || baseCurrency} {leg.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Open items warning + annotation */}
        {hasOpenItems && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-caption font-medium text-amber-800">
                  Add note
                </p>
              </div>
            </div>
            <textarea
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              placeholder="Reason or next step"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-caption text-foreground placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-amber-400"
              rows={2}
              data-testid="closeout-annotation"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-5 pt-2 space-y-2 border-t border-border bg-background">
        <button
          onClick={handleClose}
          disabled={!canClose}
          className="w-full rounded-xl py-3 text-caption font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          style={{ backgroundColor: canClose ? 'var(--accent)' : 'var(--muted)' }}
          data-testid="closeout-confirm"
        >
          {hasOpenItems && !canClose ? 'Add note to close' : hasOpenItems ? 'Close with note' : 'Close record'}
        </button>
        <button
          onClick={onCancel}
          className="w-full rounded-xl border border-border py-3 text-caption font-medium transition-all active:scale-[0.98]"
          data-testid="closeout-cancel"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
