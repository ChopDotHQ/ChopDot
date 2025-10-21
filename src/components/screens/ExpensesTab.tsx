import { Receipt, AlertCircle, Plus, TrendingUp, TrendingDown, CheckCircle, ChevronDown, ChevronUp, History } from "lucide-react";
import { useState } from "react";
import { SwipeableExpenseRow } from "../SwipeableExpenseRow";

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[];
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

interface ActivityEvent {
  id: string;
  type: "expense_added" | "expense_edited" | "expense_deleted" | "attestation" | "member_joined" | "contribution" | "withdrawal";
  timestamp: string;
  description: string;
  actor: string;
  metadata?: {
    amount?: number;
    currency?: string;
    expenseMemo?: string;
  };
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
  onAddExpense: () => void;
  onExpenseClick: (expense: Expense) => void;
  onSettle: () => void;
  onDeleteExpense?: (expenseId: string) => void;
  onAttestExpense?: (expenseId: string, silent?: boolean) => void;
  onBatchAttestExpenses?: (expenseIds: string[]) => void;
  onReviewPending?: () => void;
  onShowToast?: (message: string, type?: "success" | "info" | "error") => void;
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
  totalExpenses: _propTotalExpenses,
  contributions = [],
  onAddExpense, 
  onExpenseClick, 
  onSettle,
  onDeleteExpense,
  onAttestExpense,
  onBatchAttestExpenses,
  onReviewPending: _onReviewPending,
  onShowToast,
  checkpointConfirmedCount,
  checkpointTotalCount,
}: ExpensesTabProps) {
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  
  // Calculate balances
  const myExpenses = expenses.filter(e => e.paidBy === currentUserId).reduce((sum, e) => sum + e.amount, 0);
  const myShare = expenses.reduce((sum, e) => {
    const share = e.split.find(s => s.memberId === currentUserId);
    return sum + (share?.amount || 0);
  }, 0);
  const netBalance = myExpenses - myShare;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Budget calculations (passed as props)
  const budgetPercentage = budget ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const budgetRemaining = budget ? Math.max(budget - totalExpenses, 0) : 0;
  const isOverBudget = budget ? totalExpenses > budget : false;
  
  // Calculate who owes what
  const balances = members.map(member => {
    if (member.id === currentUserId) return null;
    
    //
    
    // Calculate what they owe you or what you owe them
    const myShareOfTheirExpenses = expenses
      .filter(e => e.paidBy === member.id)
      .reduce((sum, e) => {
        const share = e.split.find(s => s.memberId === currentUserId);
        return sum + (share?.amount || 0);
      }, 0);
    
    const theirShareOfMyExpenses = expenses
      .filter(e => e.paidBy === currentUserId)
      .reduce((sum, e) => {
        const share = e.split.find(s => s.memberId === member.id);
        return sum + (share?.amount || 0);
      }, 0);
    
    const balance = theirShareOfMyExpenses - myShareOfTheirExpenses;
    
    return {
      member,
      balance, // Positive = they owe you, Negative = you owe them
    };
  }).filter(Boolean) as { member: Member; balance: number }[];
  
  // Calculate pending attestations (only expenses paid by OTHERS that you haven't confirmed)
  const pendingExpenses = expenses.filter(e => 
    e.paidBy !== currentUserId &&  // Exclude your own expenses
    !e.attestations.includes(currentUserId)  // You haven't confirmed yet
  );
  const pendingAttestations = pendingExpenses.length;
  const totalPendingAmount = pendingExpenses.reduce((sum, e) => {
    const share = e.split.find(s => s.memberId === currentUserId);
    return sum + (share?.amount || 0);
  }, 0);
  
  const canSettle = expenses.length > 0 && balances.some(b => Math.abs(b.balance) > 0.01);
  
  // Filter expenses (when showing pending only, exclude self-paid expenses)
  const displayedExpenses = showPendingOnly 
    ? expenses.filter(e => e.paidBy !== currentUserId && !e.attestations.includes(currentUserId))
    : expenses;

  // Group expenses by date (sorted desc within groups)
  const groupedExpenses = displayedExpenses
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((groups, expense) => {
    const date = new Date(expense.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let label = '';
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
      if (!groups[label]) groups[label] = [] as Expense[];
      (groups[label] as Expense[]).push(expense);
      return groups;
    }, {} as Record<string, Expense[]>);

  // Generate activity events
  const activityEvents: ActivityEvent[] = [];
  
  // Add expense events
  expenses.forEach(expense => {
    const paidByMember = members.find(m => m.id === expense.paidBy);
    activityEvents.push({
      id: `expense-${expense.id}`,
      type: "expense_added",
      timestamp: expense.date,
      description: `${paidByMember?.name === "You" ? "You" : paidByMember?.name} added "${expense.memo}"`,
      actor: paidByMember?.name || "Unknown",
      metadata: {
        amount: expense.amount,
        currency: baseCurrency,
        expenseMemo: expense.memo,
      }
    });
    
    // Add attestation events
    expense.attestations.forEach((memberId, index) => {
      const attestor = members.find(m => m.id === memberId);
      const attestationDate = new Date(new Date(expense.date).getTime() + (index + 1) * 60000).toISOString(); // Mock time offset
      activityEvents.push({
        id: `attestation-${expense.id}-${memberId}`,
        type: "attestation",
        timestamp: attestationDate,
        description: `${attestor?.name === "You" ? "You" : attestor?.name} confirmed "${expense.memo}"`,
        actor: attestor?.name || "Unknown",
      });
    });
  });
  
  // Add contribution/withdrawal events
  contributions.forEach(contribution => {
    const contributor = members.find(m => m.id === contribution.memberId);
    activityEvents.push({
      id: `contribution-${contribution.id}`,
      type: contribution.amount > 0 ? "contribution" : "withdrawal",
      timestamp: contribution.date,
      description: contribution.amount > 0 
        ? `${contributor?.name === "You" ? "You" : contributor?.name} added ${baseCurrency} ${contribution.amount.toFixed(2)}`
        : `${contributor?.name === "You" ? "You" : contributor?.name} withdrew ${baseCurrency} ${Math.abs(contribution.amount).toFixed(2)}`,
      actor: contributor?.name || "Unknown",
      metadata: {
        amount: Math.abs(contribution.amount),
        currency: baseCurrency,
      }
    });
  });
  
  // Sort by most recent first
  const sortedActivity = activityEvents.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 20); // Show last 20 events
  
  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);
    
    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-3">
      {/* Consolidated Hero Dashboard */}
      {expenses.length > 0 && (
        <div className="mx-3 mt-3">
          <div className="hero-card p-4 space-y-3">
            {/* Net Balance - BIG and prominent */}
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
                    color: netBalance >= 0 ? 'var(--success)' : 'var(--ink)'
                  }}
                >
                  {netBalance >= 0 ? '+' : ''}${Math.abs(netBalance).toFixed(2)}
                </p>
              </div>
              
              {/* Quick context line: Total spent + Budget */}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-caption text-secondary">
                  ${totalExpenses.toFixed(0)} spent
                </span>
                {budgetEnabled && budget && (
                  <>
                    <span className="text-caption text-secondary">•</span>
                    <span className="text-caption text-secondary" style={{ color: isOverBudget ? 'var(--danger)' : undefined }}>
                      {isOverBudget ? `${(totalExpenses - budget).toFixed(0)} over` : `${budgetRemaining.toFixed(0)} left`} of ${budget.toFixed(0)}
                    </span>
                  </>
                )}
                {typeof checkpointConfirmedCount === 'number' && typeof checkpointTotalCount === 'number' && checkpointTotalCount > 0 && (
                  <>
                    <span className="text-caption text-secondary">•</span>
                    <span className="text-caption text-secondary">
                      {checkpointConfirmedCount}/{checkpointTotalCount} confirmed
                    </span>
                  </>
                )}
              </div>
              
              {/* Compact budget progress bar (if enabled) */}
              {budgetEnabled && budget && (
                <div className="mt-2 h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${budgetPercentage}%`,
                      background: isOverBudget ? 'var(--danger)' : 'var(--ink)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Member Balances Breakdown */}
            {balances.filter(b => Math.abs(b.balance) > 0.01).length > 0 && (
              <div className="space-y-1.5">
                {balances
                  .filter(b => Math.abs(b.balance) > 0.01)
                  .sort((a, b) => b.balance - a.balance)
                  .map(({ member, balance }) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.08)' }}>
                          <span className="text-caption text-foreground">{member.name[0]}</span>
                        </div>
                        <span className="text-label" style={{ fontWeight: 500 }}>{member.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-label tabular-nums" style={{ 
                          fontWeight: 500,
                          color: balance > 0 ? 'var(--success)' : 'var(--ink)'
                        }}>
                          {balance > 0 ? '+' : '-'}${Math.abs(balance).toFixed(2)}
                        </span>
                        <p className="text-caption text-secondary">
                          {balance > 0 ? 'owes you' : 'you owe'}
                        </p>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            
            {/* Quick Actions Row */}
            <div className="flex gap-2 pt-2 items-center">
              <button
                onClick={onAddExpense}
                className="btn-primary flex-1 py-2.5 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span className="text-body" style={{ fontWeight: 500 }}>Add Expense</span>
                </div>
              </button>
              
              {canSettle && (
                <button
                  onClick={onSettle}
                  className="flex-1 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  style={{ 
                    background: 'var(--card)',
                    border: '2px solid var(--ink)',
                    color: 'var(--ink)'
                  }}
                >
                  <div className="flex items-center justify-center">
                    <span className="text-body" style={{ fontWeight: 500 }}>Settle Up</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Attestations Alert - One-click approve */}
      {pendingAttestations > 0 && (
        <div className="mx-3">
          <div className="card p-3 space-y-3" style={{ 
            background: 'rgba(230, 0, 122, 0.1)',
            border: '1px solid rgba(230, 0, 122, 0.2)'
          }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-pink)' }}>
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm" style={{ fontWeight: 500 }}>
                  {pendingAttestations} expense{pendingAttestations !== 1 ? 's' : ''} need{pendingAttestations === 1 ? 's' : ''} your confirmation
                </p>
                <p className="text-xs text-secondary">
                  Paid by others · Your share: {baseCurrency} {totalPendingAmount.toFixed(2)}
                </p>
              </div>
            </div>
            
            {/* Approve All button */}
            {(onBatchAttestExpenses || onAttestExpense) && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const toApprove = pendingExpenses.filter(exp => 
                      !exp.attestations.includes(currentUserId)
                    );
                    
                    // Get all expense IDs to approve
                    const expenseIds = toApprove.map(exp => exp.id);
                    
                    // Use batch approve if available, otherwise fallback to individual
                    if (expenseIds.length > 0) {
                      if (onBatchAttestExpenses) {
                        onBatchAttestExpenses(expenseIds);
                      } else {
                        // Fallback - this won't work well due to async state but kept for compatibility
                        expenseIds.forEach(id => onAttestExpense && onAttestExpense(id, true));
                        
                        if (onShowToast) {
                          setTimeout(() => {
                            onShowToast(`✓ All ${expenseIds.length} expense${expenseIds.length > 1 ? 's' : ''} confirmed`, "success");
                          }, 100);
                        }
                      }
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  style={{ 
                    background: 'var(--accent-pink)',
                    color: '#fff',
                  }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-body" style={{ fontWeight: 500 }}>
                      Confirm All
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setShowPendingOnly(!showPendingOnly)}
                  className="px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  style={{ 
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="text-body" style={{ fontWeight: 500 }}>
                    {showPendingOnly ? 'Show All' : 'Review'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Activity History - Collapsible */}
      {expenses.length > 0 && (
        <div className="mx-3">
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="w-full flex items-center justify-between p-3 rounded-xl transition-all active:scale-[0.98]"
            style={{ 
              background: 'var(--card)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-label" style={{ fontWeight: 500 }}>Recent Activity</span>
              <span className="text-caption px-1.5 py-0.5 rounded-full" style={{ 
                background: 'var(--muted)',
                color: 'var(--card)'
              }}>
                {sortedActivity.length}
              </span>
            </div>
            {showActivity ? (
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
          
          {showActivity && (
            <div className="mt-2 p-3 rounded-xl space-y-2" style={{ 
              background: 'var(--card)',
              boxShadow: 'var(--shadow-card)',
            }}>
              {sortedActivity.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                  No activity yet
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedActivity.map((event) => (
                    <div key={event.id} className="flex items-start gap-2 pb-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ 
                        background: event.type === "attestation" ? 'rgba(25, 195, 125, 0.1)' :
                                   event.type === "contribution" ? 'rgba(86, 243, 154, 0.1)' :
                                   event.type === "withdrawal" ? 'rgba(255, 149, 0, 0.1)' :
                                   'rgba(230, 0, 122, 0.1)'
                      }}>
                        {event.type === "attestation" && <CheckCircle className="w-3 h-3" style={{ color: 'var(--success)' }} />}
                        {event.type === "expense_added" && <Receipt className="w-3 h-3" style={{ color: 'var(--accent-pink)' }} />}
                        {event.type === "contribution" && <TrendingUp className="w-3 h-3" style={{ color: 'var(--success)' }} />}
                        {event.type === "withdrawal" && <TrendingDown className="w-3 h-3" style={{ color: 'var(--ink)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-caption leading-snug">{event.description}</p>
                        <p className="text-micro mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {formatActivityTime(event.timestamp)}
                        </p>
                      </div>
                      {event.metadata?.amount && (
                        <span className="text-caption tabular-nums flex-shrink-0" style={{ 
                          color: 'var(--text-secondary)',
                          fontWeight: 500 
                        }}>
                          ${event.metadata.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="mx-3">
          <button
            onClick={onAddExpense}
            className="w-full flex flex-col items-center justify-center gap-3 p-8 card hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
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
      ) : displayedExpenses.length === 0 ? (
        <div className="mx-3">
          <div className="flex flex-col items-center justify-center gap-3 p-8 card">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(25, 195, 125, 0.1)' }}>
              <CheckCircle className="w-6 h-6" style={{ color: 'var(--success)' }} />
            </div>
            <div className="text-center">
              <p className="text-body text-foreground">All caught up!</p>
              <p className="text-caption mt-1 text-secondary">No pending expenses to review</p>
            </div>
            <button
              onClick={() => setShowPendingOnly(false)}
              className="mt-2 text-xs underline"
            >
              Show all expenses
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-3 pb-3">
          {Object.entries(groupedExpenses).map(([dateLabel, dateExpenses]) => (
            <div key={dateLabel} className="space-y-2">
              {/* Date header */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs" style={{ color: 'var(--text-secondary)' }}>{dateLabel}</h3>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {baseCurrency} {dateExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </span>
              </div>
              
              {/* Expenses in this date group */}
              <div className="space-y-1.5">
                {dateExpenses.map((expense) => {
                  const needsAttestation = !expense.attestations.includes(currentUserId);
                  
                  return (
                    <SwipeableExpenseRow
                      key={expense.id}
                      expense={expense}
                      members={members}
                      currentUserId={currentUserId}
                      onClick={() => onExpenseClick(expense)}
                      onDelete={onDeleteExpense ? () => onDeleteExpense(expense.id) : undefined}
                      onAttest={needsAttestation && onAttestExpense ? () => onAttestExpense(expense.id) : undefined}
                      showApproveButton={showPendingOnly && needsAttestation}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}