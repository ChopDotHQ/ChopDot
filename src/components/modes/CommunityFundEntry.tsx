import { Landmark, ArrowRight, CheckCircle2, PlusCircle, Settings2 } from 'lucide-react';

type CommunityFundRole = 'approver' | 'contributor' | 'admin';

interface CommunityFundEntryProps {
  potId: string;
  potName: string;
  baseCurrency: string;
  role: CommunityFundRole;
  pendingRequests?: number;
  fundBalance?: number;
  onEnter: () => void;
}

const ROLE_CONFIG: Record<
  CommunityFundRole,
  { action: string; icon: typeof CheckCircle2; description: string }
> = {
  approver: {
    action: 'Review request',
    icon: CheckCircle2,
    description: 'You have requests waiting for your review',
  },
  contributor: {
    action: 'Add contribution',
    icon: PlusCircle,
    description: 'Support the group fund',
  },
  admin: {
    action: 'Manage fund',
    icon: Settings2,
    description: 'Review balance, requests, and payouts',
  },
};

export function CommunityFundEntry({
  potName,
  baseCurrency,
  role,
  pendingRequests,
  fundBalance,
  onEnter,
}: CommunityFundEntryProps) {
  const config = ROLE_CONFIG[role];
  const ActionIcon = config.icon;
  const hasPending = (pendingRequests ?? 0) > 0;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 space-y-3"
      data-testid="community-fund-entry"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
          >
            <Landmark className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-body font-semibold">{potName}</p>
            <p className="text-caption text-secondary">Community fund</p>
          </div>
        </div>
        {hasPending && (
          <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-caption font-medium">
            {pendingRequests} pending
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {fundBalance != null && (
          <div className="rounded-xl bg-background px-3 py-2">
            <p className="text-micro text-secondary">Balance</p>
            <p className="text-caption font-medium tabular-nums">
              {fundBalance.toFixed(2)} {baseCurrency}
            </p>
          </div>
        )}
        <div className="rounded-xl bg-background px-3 py-2">
          <p className="text-micro text-secondary">Your role</p>
          <p className="text-caption font-medium capitalize">{role}</p>
        </div>
      </div>

      <p className="text-caption text-secondary">{config.description}</p>

      <button
        onClick={onEnter}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-caption font-semibold text-white transition-all active:scale-[0.98]"
        style={{ backgroundColor: '#10b981' }}
        data-testid="community-fund-enter"
      >
        <ActionIcon className="w-4 h-4" />
        {config.action}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
