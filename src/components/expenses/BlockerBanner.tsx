/**
 * BlockerBanner — surfaces the single most urgent pending action
 * for the current user at the top of PotHome.
 *
 * Design: SaaS Brutalism — no decoration, one clear action per row.
 * Shows "You owe X → tap to mark paid" or "X paid you → confirm received".
 */

import { CheckCircle, ArrowUpRight } from 'lucide-react';
import type { SettlementLeg } from '../../types/app';

interface Member {
  id: string;
  name: string;
}

interface BlockerBannerProps {
  legs: SettlementLeg[];
  members: Member[];
  currentUserId: string;
  baseCurrency: string;
  onMarkPaid: (legId: string, method: SettlementLeg['method'], reference?: string) => Promise<void>;
  onConfirmReceipt: (legId: string) => Promise<void>;
}

function getMemberName(members: Member[], id: string, currentUserId: string): string {
  if (id === currentUserId) return 'You';
  return members.find((m) => m.id === id)?.name ?? 'Member';
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function BlockerBanner({
  legs,
  members,
  currentUserId,
  baseCurrency,
  onMarkPaid,
  onConfirmReceipt,
}: BlockerBannerProps) {
  // Filter to only actionable legs for the current user
  const myPayments = legs.filter(
    (leg) => leg.fromMemberId === currentUserId && leg.status === 'pending',
  );
  const myConfirmations = legs.filter(
    (leg) => leg.toMemberId === currentUserId && leg.status === 'paid',
  );

  // Also show legs waiting on others (read-only awareness)
  const waitingOnOthers = legs.filter(
    (leg) =>
      leg.status === 'pending' && leg.fromMemberId !== currentUserId,
  );

  if (myPayments.length === 0 && myConfirmations.length === 0 && waitingOnOthers.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-3 space-y-2" data-testid="blocker-banner">
      {/* Confirmations the user needs to action — highest priority */}
      {myConfirmations.map((leg) => (
        <div
          key={leg.id}
          className="flex items-center justify-between gap-3 rounded-2xl p-3.5"
          style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
          }}
          data-testid={`blocker-confirm-${leg.id}`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-label font-medium">
              {getMemberName(members, leg.fromMemberId, currentUserId)} paid you
            </p>
            <p className="text-caption text-secondary mt-0.5">
              {formatAmount(leg.amount, leg.currency || baseCurrency)}
            </p>
          </div>
          <button
            onClick={() => void onConfirmReceipt(leg.id)}
            className="px-4 py-2 rounded-xl text-caption font-semibold text-white transition-all active:scale-[0.96]"
            style={{ background: 'var(--success)' }}
            data-testid={`blocker-confirm-btn-${leg.id}`}
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm
            </span>
          </button>
        </div>
      ))}

      {/* Payments the user needs to make */}
      {myPayments.map((leg) => (
        <div
          key={leg.id}
          className="flex items-center justify-between gap-3 rounded-2xl p-3.5 card"
          data-testid={`blocker-pay-${leg.id}`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-label font-medium">
              You owe {getMemberName(members, leg.toMemberId, currentUserId)}
            </p>
            <p className="text-caption text-secondary mt-0.5">
              {formatAmount(leg.amount, leg.currency || baseCurrency)}
            </p>
          </div>
          <button
            onClick={() => void onMarkPaid(leg.id, 'cash')}
            className="px-4 py-2 rounded-xl text-caption font-semibold transition-all active:scale-[0.96]"
            style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            data-testid={`blocker-pay-btn-${leg.id}`}
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Mark paid
            </span>
          </button>
        </div>
      ))}

      {/* Read-only: waiting on others */}
      {waitingOnOthers.length > 0 && myPayments.length === 0 && myConfirmations.length === 0 && (
        <div
          className="rounded-2xl p-3.5 card"
          data-testid="blocker-waiting"
        >
          <p className="text-caption text-secondary">
            Waiting on {waitingOnOthers.map((leg) =>
              getMemberName(members, leg.fromMemberId, currentUserId),
            ).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
