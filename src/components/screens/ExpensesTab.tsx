import { Receipt } from 'lucide-react';
import { SwipeableExpenseRow } from '../SwipeableExpenseRow';
import type { Pot } from '../../schema/pot';
import { formatCurrencyAmount } from '../../utils/currencyFormat';
import { usePotBalances } from '../../hooks/usePotBalances';
import { useExpenseGroups } from '../../hooks/useExpenseGroups';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { HeroDashboard } from '../expenses/HeroDashboard';
import { ActivityHistory } from '../expenses/ActivityHistory';

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
  trackedCloseout?: unknown | null;
  onReopenTrackedSettlement?: () => void;
  canAddExpense?: boolean;
  addExpenseDisabledReason?: string;
  onDeleteExpense?: (expenseId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onUpdatePot?: (updates: { history?: unknown[]; lastCheckpoint?: unknown; lastEditAt?: string }) => void;
  checkpointConfirmedCount?: number;
  checkpointTotalCount?: number;
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
  onAddExpense,
  onExpenseClick,
  onSettle,
  trackedCloseout,
  onReopenTrackedSettlement,
  canAddExpense = true,
  addExpenseDisabledReason,
  onDeleteExpense,
}: ExpensesTabProps) {
  const {
    normalizedBaseCurrency,
    totalExpenses,
    settlementSuggestions,
    netBalance,
    budgetPercentage,
    budgetRemaining,
    isOverBudget,
    totalOutstanding,
    balances,
    canSettle,
  } = usePotBalances({ expenses, members, potId, baseCurrency, currentUserId, budget, budgetEnabled });

  const formatPotAmount = (value: number, withSign: boolean = false) =>
    formatCurrencyAmount(value, normalizedBaseCurrency, { withSign });

  const groupedExpenses = useExpenseGroups(expenses);

  const sortedActivity = useActivityFeed({
    expenses,
    members,
    contributions,
    baseCurrency: normalizedBaseCurrency,
  });

  return (
    <div className="space-y-3">
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
          settlementSuggestions={settlementSuggestions}
          members={members}
          currentUserId={currentUserId}
          canSettle={canSettle}
          formatPotAmount={formatPotAmount}
          onAddExpense={onAddExpense}
          onSettle={onSettle}
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
      <div className="mx-3">
        <button
          onClick={onAddExpense}
          className="w-full flex flex-col items-center justify-center gap-3 p-8 card card-hover-lift hover:shadow-[var(--shadow-fab)] transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center">
            <Receipt className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="text-center">
            <p className="text-body text-foreground">No expenses yet</p>
            <p className="text-caption mt-1 text-secondary">Add the first expense to get started</p>
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
