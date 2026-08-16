import { TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react';
import type { Suggestion } from '../../services/settlement/calc';

interface Member {
  id: string;
  name: string;
  address?: string;
  verified?: boolean;
}

interface BalanceEntry {
  member: Member;
  balance: number;
}

interface HeroDashboardProps {
  netBalance: number;
  totalExpenses: number;
  totalOutstanding: number;
  budgetEnabled?: boolean;
  budget?: number;
  budgetPercentage: number;
  budgetRemaining: number;
  isOverBudget: boolean;
  balances: BalanceEntry[];
  settlementSuggestions: Suggestion[];
  trackedCloseout?: unknown | null;
  members: Member[];
  currentUserId: string;
  canSettle: boolean;
  formatPotAmount: (value: number, withSign?: boolean) => string;
  onAddExpense: () => void;
  onSettle: () => void;
  onReopenTrackedSettlement?: () => void;
  canAddExpense?: boolean;
  addExpenseDisabledReason?: string;
}

export function HeroDashboard({
  netBalance,
  totalExpenses,
  totalOutstanding,
  budgetEnabled,
  budget,
  budgetPercentage,
  budgetRemaining,
  isOverBudget,
  balances,
  settlementSuggestions,
  trackedCloseout,
  members,
  currentUserId,
  canSettle,
  formatPotAmount,
  onAddExpense,
  onSettle,
  onReopenTrackedSettlement,
  canAddExpense = true,
  addExpenseDisabledReason,
}: HeroDashboardProps) {
  const potTotalDisplay = formatPotAmount(totalExpenses);
  const outstandingDisplay = formatPotAmount(totalOutstanding);

  return (
    <div className="mx-3 mt-3">
      <div className="hero-card p-4 space-y-3">
        {/* Net Balance */}
        <div className="text-center pb-3 border-b border-border/50">
          <p className="text-caption text-secondary mb-1.5">Your net balance</p>
          <div className="flex items-center justify-center gap-2">
            {netBalance >= 0 ? (
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--success)' }} />
            ) : (
              <TrendingDown className="w-5 h-5" style={{ color: 'var(--ink)' }} />
            )}
            <p
              className="tabular-nums"
              style={{
                fontSize: '32px',
                fontWeight: 600,
                lineHeight: 1.2,
                color: netBalance >= 0 ? 'var(--success)' : 'var(--ink)',
              }}
            >
              {formatPotAmount(netBalance, true)}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="text-caption text-secondary">
              {formatPotAmount(totalExpenses)} spent
            </span>
            {budgetEnabled && budget && (
              <>
                <span className="text-caption text-secondary">&bull;</span>
                <span className="text-caption text-secondary" style={{ color: isOverBudget ? 'var(--danger)' : undefined }}>
                  {isOverBudget ? `${formatPotAmount(totalExpenses - budget)} over` : `${formatPotAmount(budgetRemaining)} left`} of {formatPotAmount(budget)}
                </span>
              </>
            )}
          </div>

          {budgetEnabled && budget && (
            <div className="mt-2 h-1 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${budgetPercentage}%`,
                  background: isOverBudget ? 'var(--danger)' : 'var(--ink)',
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 text-left">
              <p className="text-caption text-secondary mb-1">Total pot balance</p>
              <p className="text-xl font-semibold tabular-nums">{potTotalDisplay}</p>
              <p className="text-micro text-secondary mt-0.5">All expenses captured here</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 text-left">
              <p className="text-caption text-secondary mb-1">Still to settle</p>
              <p className="text-xl font-semibold tabular-nums">{outstandingDisplay}</p>
              <p className="text-micro text-secondary mt-0.5">Sum of members who are owed</p>
            </div>
          </div>
        </div>

        {balances.length > 0 && (
          <div className="space-y-1.5">
            {balances
              .sort((a, b) => b.balance - a.balance)
              .map(({ member, balance }) => {
                const displayName = getDisplayMemberName(member, currentUserId);
                return (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.08)' }}>
                      <span className="text-caption text-foreground">{displayName[0]}</span>
                    </div>
                    <span className="text-label" style={{ fontWeight: 500 }}>{displayName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-label tabular-nums" style={{ fontWeight: 500, color: balance > 0 ? 'var(--success)' : 'var(--ink)' }}>
                      {formatPotAmount(balance, true)}
                    </span>
                    <p className="text-caption text-secondary">
                      {balance > 0 ? 'owes you' : 'you owe'}
                    </p>
                  </div>
                </div>
                );
              })}
          </div>
        )}

        {!trackedCloseout && (
          <SettlementSuggestionsList
            suggestions={settlementSuggestions}
            members={members}
            currentUserId={currentUserId}
            formatPotAmount={formatPotAmount}
          />
        )}


        {!!trackedCloseout && (
          <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 space-y-3">
            <div className="space-y-1">
              <p className="text-label font-medium">Smart settlement in progress</p>
            </div>
            <div className="space-y-2 text-micro text-secondary">
              {onReopenTrackedSettlement && (
                <button
                  onClick={onReopenTrackedSettlement}
                  className="text-caption underline text-secondary hover:text-foreground transition-colors"
                >
                  Reopen tab to change expenses
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 items-center">
          <button
            onClick={onAddExpense}
            disabled={!canAddExpense}
            title={!canAddExpense ? addExpenseDisabledReason : undefined}
            className="flex-1 py-3 rounded-[var(--r-lg)] transition-all active:scale-[0.98]"
            style={{
              background: canAddExpense ? 'var(--accent)' : 'var(--muted)',
              color: canAddExpense ? '#fff' : 'var(--secondary)',
              fontWeight: 600,
              opacity: canAddExpense ? 1 : 0.7,
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span className="text-body">Add Expense</span>
            </div>
          </button>
          {canSettle && (
            <button
              onClick={onSettle}
              className="flex-1 py-2.5 rounded-[var(--r-lg)] transition-all active:scale-[0.98] card hover:shadow-[var(--shadow-fab)]"
              style={{ color: 'var(--ink)' }}
            >
              <div className="flex items-center justify-center">
                <span className="text-body" style={{ fontWeight: 500 }}>Settle Up</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SettlementSuggestionsListProps {
  suggestions: Suggestion[];
  members: Member[];
  currentUserId: string;
  formatPotAmount: (value: number, withSign?: boolean) => string;
}

function getDisplayMemberName(member: Member, currentUserId: string): string {
  if (member.id === currentUserId) {
    return 'You';
  }
  return member.name?.trim() || 'Member';
}

function SettlementSuggestionsList(props: SettlementSuggestionsListProps) {
  const { suggestions, members, currentUserId, formatPotAmount } = props;
  if (suggestions.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border/50">
      <p className="text-caption text-secondary mb-2">Suggested settlements</p>
      <div className="space-y-1.5">
        {suggestions.map((suggestion, idx) => {
          const fromMember = members.find(m => m.id === suggestion.from);
          const toMember = members.find(m => m.id === suggestion.to);
          if (!fromMember || !toMember) return null;
          const fromDisplayName = getDisplayMemberName(fromMember, currentUserId);
          const toDisplayName = getDisplayMemberName(toMember, currentUserId);

          const displayAmount = formatPotAmount(suggestion.amount);

          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 card rounded-lg card-hover-lift transition-shadow duration-200"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-label truncate" style={{ fontWeight: 500 }}>
                  {fromDisplayName}
                </span>
                <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
                <span className="text-label truncate" style={{ fontWeight: 500 }}>
                  {toDisplayName}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-label tabular-nums" style={{ fontWeight: 500 }}>
                  {displayAmount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-caption text-secondary mt-2" style={{ fontSize: '10px' }}>
        These are minimal transfers to settle all balances. Use "Settle Up" to initiate settlements.
      </p>
    </div>
  );
}

