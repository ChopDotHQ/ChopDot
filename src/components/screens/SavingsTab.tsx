import { TrendingUp, Plus, ArrowDownToLine, Info } from "lucide-react";
import { useState } from "react";

interface Member {
  id: string;
  name: string;
}

interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  txHash?: string;
}

interface SavingsTabProps {
  members: Member[];
  currentUserId: string;
  baseCurrency: string;
  contributions: Contribution[];
  totalPooled: number;
  yieldRate: number;
  defiProtocol: string;
  goalAmount?: number;
  goalDescription?: string;
  onAddContribution: () => void;
  onWithdraw: () => void;
}

export function SavingsTab({
  members,
  currentUserId,
  baseCurrency: _baseCurrency,
  contributions,
  totalPooled,
  yieldRate,
  defiProtocol,
  goalAmount,
  goalDescription,
  onAddContribution,
  onWithdraw,
}: SavingsTabProps) {
  const [showAllContributions, setShowAllContributions] = useState(false);

  // Calculate individual balances
  const memberBalances = members.map(member => {
    const memberContributions = contributions.filter(c => c.memberId === member.id);
    const total = memberContributions.reduce((sum, c) => sum + c.amount, 0);
    return {
      memberId: member.id,
      memberName: member.name,
      total,
    };
  });

  const totalContributed = memberBalances.reduce((sum, b) => sum + b.total, 0);
  const yieldEarned = totalPooled - totalContributed;

  // Progress towards goal
  const goalProgress = goalAmount ? (totalPooled / goalAmount) * 100 : 0;

  // Display limited contributions by default
  const displayedContributions = showAllContributions 
    ? contributions 
    : contributions.slice(0, 5);

  return (
    <div className="p-3 space-y-3">
      {/* Hero Card - Total Pooled */}
      <div className="hero-card p-4 space-y-3">
        {/* Total Pooled Amount */}
        <div>
          <p className="text-micro text-secondary mb-1">Total Pooled</p>
          <div className="flex items-baseline gap-2">
            <p className="text-[32px] tabular-nums" style={{ fontWeight: 600 }}>
              ${totalPooled.toFixed(2)}
            </p>
            {yieldEarned > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: 'var(--success)', opacity: 0.15 }}>
                <TrendingUp className="w-3 h-3" style={{ color: 'var(--success)' }} />
                <span className="text-micro" style={{ color: 'var(--success)' }}>
                  +${yieldEarned.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* DeFi Protocol & APY */}
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(25, 195, 125, 0.08)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--success)' }}>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-micro" style={{ fontWeight: 500 }}>{defiProtocol}</p>
              <p className="text-micro text-secondary">Earning yield via Polkadot</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px]" style={{ fontWeight: 700, color: 'var(--success)' }}>
              {yieldRate.toFixed(1)}% APY
            </p>
          </div>
        </div>

        {/* Goal Progress (if set) */}
        {goalAmount && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-micro text-secondary">
                {goalDescription || "Savings Goal"}
              </p>
              <p className="text-micro tabular-nums" style={{ fontWeight: 500 }}>
                {goalProgress.toFixed(0)}%
              </p>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(goalProgress, 100)}%`,
                  background: 'var(--success)',
                }}
              />
            </div>
            <p className="text-micro text-secondary text-right">
              ${totalPooled.toFixed(2)} / ${goalAmount.toFixed(2)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAddContribution}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: 'var(--success)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-body" style={{ fontWeight: 600 }}>Add Funds</span>
          </button>
          <button
            onClick={onWithdraw}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl transition-all hover:bg-muted/30 active:scale-[0.98]"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span className="text-body" style={{ fontWeight: 500 }}>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(25, 195, 125, 0.08)', border: '1px solid rgba(25, 195, 125, 0.2)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
        <div>
          <p className="text-micro">
            Your pooled funds are earning {yieldRate.toFixed(1)}% APY through {defiProtocol}. 
            Yield is distributed proportionally to all members.
          </p>
        </div>
      </div>

      {/* Member Balances */}
      <div className="space-y-1.5">
        <p className="text-micro text-secondary px-1">Member Contributions</p>
        <div className="space-y-1">
          {memberBalances.map((balance) => {
            const percentage = totalContributed > 0 ? (balance.total / totalContributed) * 100 : 0;
            const isYou = balance.memberId === currentUserId;
            
            return (
              <div
                key={balance.memberId}
                className="p-4 card rounded-lg transition-shadow duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isYou && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                    )}
                    <p className="text-label" style={{ fontWeight: isYou ? 600 : 500 }}>
                      {balance.memberName}
                    </p>
                  </div>
                  <p className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>
                    ${balance.total.toFixed(2)}
                  </p>
                </div>
                {/* Mini progress bar */}
                <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${percentage}%`,
                      background: isYou ? 'var(--success)' : 'var(--muted)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contribution History */}
      {contributions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-micro text-secondary">Recent Activity</p>
          </div>
          <div className="space-y-1">
            {displayedContributions.map((contribution) => {
              const member = members.find(m => m.id === contribution.memberId);
              const isYou = contribution.memberId === currentUserId;
              
              return (
                <div
                  key={contribution.id}
                  className="p-3 card rounded-lg transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                        <p className="text-label">
                          {isYou ? "You" : member?.name} added funds
                        </p>
                      </div>
                      <p className="text-micro text-secondary">
                        {new Date(contribution.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {contribution.txHash && (
                          <span className="ml-1">· On-chain</span>
                        )}
                      </p>
                    </div>
                    <p className="text-[18px] tabular-nums" style={{ fontWeight: 700, color: 'var(--success)' }}>
                      +${contribution.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {contributions.length > 5 && !showAllContributions && (
            <button
              onClick={() => setShowAllContributions(true)}
              className="w-full py-2 text-micro text-secondary hover:text-foreground transition-colors"
            >
              Show all {contributions.length} contributions
            </button>
          )}
        </div>
      )}
    </div>
  );
}
