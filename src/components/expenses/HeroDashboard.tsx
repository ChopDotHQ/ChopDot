import { CheckCircle2, TrendingDown, TrendingUp, Plus } from 'lucide-react';
import type { SettlementResult } from '../../nav';

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
  recentSettlement?: SettlementResult;
  trackedCloseout?: unknown | null;
  savedRecord?: {
    closedAt?: string;
    annotation?: string;
    legs?: Array<{ status: string }>;
  } | null;
  currentUserId: string;
  canSettle: boolean;
  formatPotAmount: (value: number, withSign?: boolean) => string;
  onAddExpense: () => void;
  onSettle: () => void;
  onCloseRecord?: () => void;
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
  recentSettlement,
  trackedCloseout,
  savedRecord,
  currentUserId,
  canSettle,
  formatPotAmount,
  onAddExpense,
  onSettle,
  onCloseRecord,
  onReopenTrackedSettlement,
  canAddExpense = true,
  addExpenseDisabledReason,
}: HeroDashboardProps) {
  const adjustedOutstanding = applyRecentSettlementToAmount(totalOutstanding, recentSettlement);
  const adjustedNetBalance = applyRecentSettlementToNetBalance(netBalance, recentSettlement);
  const adjustedBalances = applyRecentSettlementToBalances(balances, currentUserId, recentSettlement);
  const potTotalDisplay = formatPotAmount(totalExpenses);
  const outstandingDisplay = formatPotAmount(adjustedOutstanding);
  const hasOpenBalance = adjustedOutstanding > 0.009;
  const savedOpenCount = savedRecord?.legs?.filter((leg) => leg.status !== 'confirmed').length ?? 0;

  return (
    <div className="mx-3 mt-3">
      <div className="hero-card p-4 space-y-3">
        {/* Net Balance */}
        <div className="text-center">
          <p className="text-caption text-secondary mb-1.5">Your net balance</p>
          <div className="flex items-center justify-center gap-2">
            {adjustedNetBalance >= 0 ? (
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
                color: adjustedNetBalance >= 0 ? 'var(--success)' : 'var(--ink)',
              }}
            >
              {formatPotAmount(adjustedNetBalance, true)}
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

          {recentSettlement && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/10 p-3 text-left">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--success)' }} />
                <div className="min-w-0">
                  <p className="text-label font-medium truncate">
                    {recentSettlement.direction === 'owe' ? 'Payment marked' : 'Money received'}
                  </p>
                  <p className="text-caption text-secondary truncate">
                    {recentSettlement.counterpartyName}
                    {recentSettlement.savedOnDeviceOnly ? ' · saved on this device' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-label tabular-nums font-semibold">{formatPotAmount(recentSettlement.amount)}</p>
                <p className="text-caption text-secondary">{outstandingDisplay} open</p>
              </div>
            </div>
          )}

          {savedRecord && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/10 p-3 text-left">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--success)' }} />
                <div className="min-w-0">
                  <p className="text-label font-medium truncate">Record saved</p>
                  <p className="text-caption text-secondary truncate">
                    {savedOpenCount > 0 ? `${savedOpenCount} still open` : 'Ready for history'}
                  </p>
                </div>
              </div>
              <p className="text-label font-semibold whitespace-nowrap">
                {savedOpenCount > 0 ? 'Saved' : 'Closed'}
              </p>
            </div>
          )}

          <div className="pt-3">
            <button
              onClick={onAddExpense}
              disabled={!canAddExpense}
              title={!canAddExpense ? addExpenseDisabledReason : undefined}
              className="w-full py-3 rounded-[var(--r-lg)] transition-all active:scale-[0.98]"
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
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="rounded-[var(--r-lg)] border border-border/40 bg-muted/10 p-3 text-left">
              <p className="text-caption text-secondary mb-1">Total spent</p>
              <p className="text-xl font-semibold tabular-nums">{potTotalDisplay}</p>
            </div>
            <div className="rounded-[var(--r-lg)] border border-border/40 bg-muted/10 p-3 text-left">
              <p className="text-caption text-secondary mb-1">Still open</p>
              <p className="text-xl font-semibold tabular-nums">{outstandingDisplay}</p>
            </div>
          </div>
        </div>

        {adjustedBalances.length > 0 && (
          <div className="space-y-1.5 border-t border-border/50 pt-3">
            {adjustedBalances
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
                      {getBalanceLabel(member, currentUserId, balance)}
                    </p>
                  </div>
                </div>
                );
              })}
          </div>
        )}

        {canSettle && !trackedCloseout && !savedRecord && (
          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
            <div className="min-w-0">
              <p className="text-caption text-secondary">{hasOpenBalance ? 'Still open' : 'All clear'}</p>
              <p className="text-label font-medium tabular-nums">{outstandingDisplay} open</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onCloseRecord && (
                <button
                  onClick={onCloseRecord}
                  className="px-4 py-2 rounded-[var(--r-lg)] transition-all active:scale-[0.98] border border-border/50 bg-transparent whitespace-nowrap text-label"
                  style={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                >
                  Review record
                </button>
              )}
              <button
                onClick={onSettle}
                className="px-4 py-2 rounded-[var(--r-lg)] transition-all active:scale-[0.98] border border-border/60 bg-transparent whitespace-nowrap text-label"
                style={{ color: 'var(--ink)', fontWeight: 600 }}
              >
                Settle Up
              </button>
            </div>
          </div>
        )}

        {!canSettle && !trackedCloseout && !savedRecord && onCloseRecord && (
          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
            <div className="min-w-0">
              <p className="text-caption text-secondary">Everything looks handled</p>
              <p className="text-label font-medium">Ready to save</p>
            </div>
            <button
              onClick={onCloseRecord}
              className="shrink-0 px-4 py-2 rounded-[var(--r-lg)] transition-all active:scale-[0.98] whitespace-nowrap text-label"
              style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600 }}
            >
              Close record
            </button>
          </div>
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

      </div>
    </div>
  );
}

function getDisplayMemberName(member: Member, currentUserId: string): string {
  if (isCurrentVisibleMember(member, currentUserId)) {
    return 'You';
  }
  return member.name?.trim() || 'Member';
}

function getBalanceLabel(member: Member, currentUserId: string, balance: number): string {
  if (Math.abs(balance) < 0.01) return 'settled';
  if (isCurrentVisibleMember(member, currentUserId)) {
    return balance > 0 ? 'you are owed' : 'you owe';
  }
  return balance > 0 ? 'owes you' : 'you owe';
}

function isCurrentVisibleMember(member: Member, currentUserId: string): boolean {
  return member.id === currentUserId || member.name?.trim().toLowerCase() === 'you';
}

function applyRecentSettlementToAmount(amount: number, settlement?: SettlementResult): number {
  if (!settlement) return amount;
  return Math.max(0, amount - settlement.amount);
}

function applyRecentSettlementToNetBalance(netBalance: number, settlement?: SettlementResult): number {
  if (!settlement) return netBalance;
  if (settlement.direction === 'owed' && netBalance > 0) {
    return Math.max(0, netBalance - settlement.amount);
  }
  if (settlement.direction === 'owe' && netBalance < 0) {
    return Math.min(0, netBalance + settlement.amount);
  }
  return netBalance;
}

function applyRecentSettlementToBalances(
  balances: BalanceEntry[],
  currentUserId: string,
  settlement?: SettlementResult,
): BalanceEntry[] {
  if (!settlement) return balances;
  return balances.map((entry) => {
    const isCurrent = isCurrentVisibleMember(entry.member, currentUserId);
    const isCounterparty = entry.member.id === settlement.counterpartyId;
    if (!isCurrent && !isCounterparty) return entry;
    if (settlement.direction === 'owed' && entry.balance > 0) {
      return { ...entry, balance: Math.max(0, entry.balance - settlement.amount) };
    }
    if (settlement.direction === 'owe' && entry.balance < 0) {
      return { ...entry, balance: Math.min(0, entry.balance + settlement.amount) };
    }
    return entry;
  });
}
