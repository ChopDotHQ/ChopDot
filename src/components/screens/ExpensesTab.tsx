import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { SwipeableExpenseRow } from '../SwipeableExpenseRow';
import type { Pot } from '../../schema/pot';
import { formatCurrencyAmount } from '../../utils/currencyFormat';
import { usePotBalances } from '../../hooks/usePotBalances';
import { useExpenseGroups } from '../../hooks/useExpenseGroups';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { HeroDashboard } from '../expenses/HeroDashboard';
import { ActivityHistory } from '../expenses/ActivityHistory';
import type { SettlementResult } from '../../nav';
import type { SettlementLeg } from '../../types/app';
import type { ConfirmedLegAdjustment } from '../../utils/confirmedLegAdjustments';

interface Member {
  id: string;
  name: string;
  verified?: boolean;
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[] | Array<{ memberId: string; confirmedAt: string }>;
  hasReceipt: boolean;
  receiptUrl?: string;
}

interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  txHash?: string;
}

interface ExpensesTabProps {
  expenses: Expense[];
  members: Member[];
  currentUserId: string;
  baseCurrency: string;
  budget?: number;
  budgetEnabled?: boolean;
  totalExpenses?: number;
  contributions?: Contribution[];
  potId?: string;
  pot?: Pot;
  potHistory?: Array<{ type: string; [key: string]: unknown }>;
  onAddExpense: () => void;
  onExpenseClick: (expense: Expense) => void;
  onSettle: () => void;
  onOpenSpendCard?: () => void;
  trackedCloseout?: unknown | null;
  onReopenTrackedSettlement?: () => void;
  canAddExpense?: boolean;
  addExpenseDisabledReason?: string;
  onDeleteExpense?: (expenseId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onUpdatePot?: (updates: { history?: unknown[]; lastCheckpoint?: unknown; lastEditAt?: string }) => void;
  checkpointConfirmedCount?: number;
  checkpointTotalCount?: number;
  recentSettlement?: SettlementResult;
  closeouts?: Array<{
    id?: string;
    closedAt?: string;
    annotation?: string;
    legs?: SettlementLeg[];
  }>;
  confirmedLegs?: ConfirmedLegAdjustment[];
  onCloseRecord?: () => void;
}

export function ExpensesTab({
  expenses,
  members,
  currentUserId,
  baseCurrency,
  budget,
  budgetEnabled,
  contributions = [],
  potId,
  pot,
  onAddExpense,
  onExpenseClick,
  onSettle,
  onOpenSpendCard,
  trackedCloseout,
  onReopenTrackedSettlement,
  canAddExpense = true,
  addExpenseDisabledReason,
  onDeleteExpense,
  recentSettlement,
  closeouts = [],
  confirmedLegs: confirmedLegsProp = [],
  onCloseRecord,
}: ExpensesTabProps) {
  const confirmedLegs = useMemo(
    () =>
      confirmedLegsProp.length
        ? confirmedLegsProp
        : ((pot as any)?.chapter?.legs ?? []).filter(
        (leg: { state?: string }) => leg.state === 'confirmed',
      ),
    [pot, confirmedLegsProp],
  );
  const {
    normalizedBaseCurrency,
    totalExpenses,
    netBalance,
    budgetPercentage,
    budgetRemaining,
    isOverBudget,
    totalOutstanding,
    balances,
    canSettle,
  } = usePotBalances({ expenses, members, potId, baseCurrency, currentUserId, budget, budgetEnabled, confirmedLegs });

  const formatPotAmount = (value: number, withSign: boolean = false) =>
    formatCurrencyAmount(value, normalizedBaseCurrency, { withSign });

  const groupedExpenses = useExpenseGroups(expenses);

  const sortedActivity = useActivityFeed({
    expenses,
    members,
    contributions,
    baseCurrency: normalizedBaseCurrency,
  });
  const latestCloseout = closeouts[closeouts.length - 1];
  const preferredPaymentApp = pot?.spendGroup?.preferredPaymentApp?.toUpperCase() ?? baseCurrency;

  return (
    <div className="space-y-3">
      {onOpenSpendCard && (
        <div className="px-3 pt-3" data-testid="pot-10x-capture-entry">
          <button
            type="button"
            onClick={onOpenSpendCard}
            className="w-full list-row px-4 py-3 text-left active:scale-[0.99] transition-transform"
            data-testid="pot-open-spend-card"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-body font-semibold">Split this payment</p>
                <p className="text-caption text-secondary">
                  {members.filter((member) => member.id !== currentUserId).slice(0, 2).map((member) => member.name).join(', ') || 'Group'} · {preferredPaymentApp}
                </p>
              </div>
              <span className="text-caption font-semibold" style={{ color: 'var(--accent)' }}>
                Open
              </span>
            </div>
          </button>
        </div>
      )}

      {expenses.length > 0 && (
        <HeroDashboard
          netBalance={netBalance}
          totalExpenses={totalExpenses}
          totalOutstanding={totalOutstanding}
          trackedCloseout={trackedCloseout}
          budgetEnabled={budgetEnabled}
          budget={budget}
          budgetPercentage={budgetPercentage}
          budgetRemaining={budgetRemaining}
          isOverBudget={isOverBudget}
          balances={balances}
          recentSettlement={recentSettlement}
          savedRecord={latestCloseout ?? null}
          currentUserId={currentUserId}
          canSettle={canSettle}
          formatPotAmount={formatPotAmount}
          onAddExpense={onAddExpense}
          onSettle={onSettle}
          onCloseRecord={onCloseRecord}
          onReopenTrackedSettlement={onReopenTrackedSettlement}
          canAddExpense={canAddExpense}
          addExpenseDisabledReason={addExpenseDisabledReason}
        />
      )}

      {expenses.length > 0 && (
        <ActivityHistory
          sortedActivity={sortedActivity}
          normalizedBaseCurrency={normalizedBaseCurrency}
        />
      )}

      <ExpensesList
        expenses={expenses}
        groupedExpenses={groupedExpenses}
        members={members}
        currentUserId={currentUserId}
        normalizedBaseCurrency={normalizedBaseCurrency}
        formatPotAmount={formatPotAmount}
        onAddExpense={onAddExpense}
        onExpenseClick={onExpenseClick}
        onDeleteExpense={onDeleteExpense}
      />

    </div>
  );
}

function ExpensesList({
  expenses,
  groupedExpenses,
  members,
  currentUserId,
  normalizedBaseCurrency,
  formatPotAmount,
  onAddExpense,
  onExpenseClick,
  onDeleteExpense,
}: {
  expenses: { id: string; amount: number }[];
  groupedExpenses: Record<string, Array<{
    id: string;
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    attestations: string[] | Array<{ memberId: string; confirmedAt: string }>;
    hasReceipt: boolean;
    receiptUrl?: string;
  }>>;
  members: { id: string; name: string; address?: string; verified?: boolean }[];
  currentUserId: string;
  normalizedBaseCurrency: string;
  formatPotAmount: (value: number, withSign?: boolean) => string;
  onAddExpense: () => void;
  onExpenseClick: (expense: { id: string; amount: number; currency: string; paidBy: string; memo: string; date: string; split: { memberId: string; amount: number }[]; attestations: string[] | Array<{ memberId: string; confirmedAt: string }>; hasReceipt: boolean; receiptUrl?: string }) => void;
  onDeleteExpense?: (expenseId: string) => void;
}) {
  if (expenses.length === 0) {
    return (
      <div className="mx-3 mt-4">
        <button
          onClick={onAddExpense}
          className="w-full flex flex-col items-center justify-center gap-4 py-12 px-6 rounded-2xl active:scale-[0.98] transition-transform duration-200 border-2 border-dashed border-border"
          style={{ background: 'var(--card)' }}
        >
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Plus className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-body font-semibold text-foreground">No expenses yet</p>
            <p className="text-caption text-secondary">Add the first shared cost.</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-3">
      {Object.entries(groupedExpenses).map(([dateLabel, dateExpenses]) => (
        <div key={dateLabel} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-micro" style={{ color: 'var(--text-secondary)' }}>{dateLabel}</h3>
            <span className="text-micro tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {formatPotAmount(dateExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </span>
          </div>

          <div className="space-y-1.5">
            {dateExpenses.map((expense) => (
              <SwipeableExpenseRow
                key={expense.id}
                expense={expense as Parameters<typeof SwipeableExpenseRow>[0]['expense']}
                members={members}
                currentUserId={currentUserId}
                baseCurrency={normalizedBaseCurrency}
                onClick={() => onExpenseClick(expense)}
                onDelete={onDeleteExpense ? () => onDeleteExpense(expense.id) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
