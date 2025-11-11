import { Receipt, AlertCircle, Plus, TrendingUp, TrendingDown, CheckCircle, ChevronDown, ChevronUp, History, ArrowRight, Wallet, ExternalLink, Copy } from "lucide-react";
import { useState, useMemo } from "react";
import { SwipeableExpenseRow } from "../SwipeableExpenseRow";
import { computeBalances, suggestSettlements, getMemberBalance } from "../../services/settlement/calc";
import type { Pot, Expense as PotExpense } from "../../schema/pot";
import { SettlementConfirmModal } from "../SettlementConfirmModal";
import { polkadotChainService } from "../../services/chain/polkadot";
import { normalizeToPolkadot } from "../../services/chain/address";
import { useAccount } from "../../contexts/AccountContext";
import type { PotHistory } from "../../App";
import { ConfirmModal } from "../ConfirmModal";

interface Member {
  id: string;
  name: string;
  address?: string; // Optional Polkadot wallet address
  verified?: boolean; // Optional verification status
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
  potId?: string; // Pot ID for calculations
  pot?: Pot; // Full pot object for readiness checks
  potHistory?: PotHistory[]; // On-chain settlement history
  onAddExpense: () => void;
  onExpenseClick: (expense: Expense) => void;
  onSettle: () => void;
  onDeleteExpense?: (expenseId: string) => void;
  onAttestExpense?: (expenseId: string, silent?: boolean) => void;
  onBatchAttestExpenses?: (expenseIds: string[]) => void;
  onReviewPending?: () => void;
  onShowToast?: (message: string, type?: "success" | "info" | "error") => void;
  onUpdatePot?: (updates: { history?: PotHistory[]; lastCheckpoint?: any; lastEditAt?: string }) => void; // Callback to update pot history
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
  potId,
  pot: _pot,
  potHistory = [],
  onAddExpense, 
  onExpenseClick, 
  onSettle,
  onDeleteExpense,
  onAttestExpense,
  onBatchAttestExpenses,
  onReviewPending: _onReviewPending,
  onShowToast,
  onUpdatePot,
  checkpointConfirmedCount: _checkpointConfirmedCount,
  checkpointTotalCount: _checkpointTotalCount,
}: ExpensesTabProps) {
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  
  // Settlement modal state
  const [settlementModal, setSettlementModal] = useState<{
    fromMemberId: string;
    toMemberId: string;
    fromAddress: string;
    toAddress: string;
    fromName: string;
    toName: string;
    amountDot: number;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const account = useAccount();
  
  // Check if this is a DOT pot
  const isDotPot = baseCurrency === "DOT";
  
  // Ensure we're on Asset Hub for DOT pots
  useMemo(() => {
    if (isDotPot) {
      polkadotChainService.setChain('assethub');
    }
  }, [isDotPot]);
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const settlementHistory = useMemo(
    () =>
      potHistory.filter(
        (entry): entry is Extract<PotHistory, { type: 'onchain_settlement' }> =>
          entry.type === 'onchain_settlement'
      ),
    [potHistory]
  );
  
  // Convert to schema format for deterministic calculation
  // Preserves custom splits if provided, otherwise computeBalances() will use equal split
  const potForCalc: Pot = useMemo(() => {
    const potExpenses: PotExpense[] = expenses.map(exp => ({
      id: exp.id,
      potId: potId || '',
      description: exp.memo || 'Expense',
      amount: exp.amount,
      paidBy: exp.paidBy,
      createdAt: new Date(exp.date).getTime(),
      split: exp.split, // Preserve custom splits for accurate balance calculation
    }));
    
    const potMembers = members.map(m => ({
      id: m.id,
      name: m.name,
      address: undefined, // Optional for MVP
    }));
    
    return {
      id: potId || 'temp',
      name: 'Pot',
      type: 'expense' as const,
      baseCurrency: 'USD' as const,
      mode: 'casual' as const,
      members: potMembers,
      expenses: potExpenses,
      history: [],
      budgetEnabled: false,
      checkpointEnabled: true,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as unknown as Pot;
  }, [expenses, members, potId]);
  
  // Calculate balances using deterministic algorithm
  const computedBalances = useMemo(() => computeBalances(potForCalc), [potForCalc]);
  const settlementSuggestions = useMemo(() => suggestSettlements(computedBalances), [computedBalances]);
  
  // Get current user's net balance
  const netBalance = getMemberBalance(computedBalances, currentUserId);
  
  // Budget calculations (passed as props)
  const budgetPercentage = budget ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const budgetRemaining = budget ? Math.max(budget - totalExpenses, 0) : 0;
  const isOverBudget = budget ? totalExpenses > budget : false;
  
  // Convert to display format (exclude current user)
  // For DOT pots, use a much smaller threshold (0.000001 DOT = 1 micro-DOT)
  // For USD pots, use 0.01 as threshold
  const settleThreshold = baseCurrency === 'DOT' ? 0.000001 : 0.01;
  
  const balances = computedBalances
    .filter(b => b.memberId !== currentUserId && Math.abs(b.net) > settleThreshold)
    .map(b => {
      const member = members.find(m => m.id === b.memberId);
      if (!member) return null;
    return {
      member,
        balance: b.net, // Positive = they owe you, Negative = you owe them
    };
    })
    .filter(Boolean) as { member: Member; balance: number }[];
  
  // Helper to check if expense is confirmed by user (handles both old and new format)
  const hasConfirmed = (expense: Expense, userId: string): boolean => {
    const atts = expense.attestations ?? [];
    if (Array.isArray(atts) && atts.length > 0) {
      if (typeof atts[0] === 'string') {
        return (atts as string[]).includes(userId);
      }
      return (atts as Array<{ memberId: string; confirmedAt: string }>).some(a => a.memberId === userId);
    }
    return false;
  };

  // Calculate pending attestations (only expenses paid by OTHERS that you haven't confirmed)
  const pendingExpenses = expenses.filter(e => 
    e.paidBy !== currentUserId &&  // Exclude your own expenses
    !hasConfirmed(e, currentUserId)  // You haven't confirmed yet
  );
  const pendingAttestations = pendingExpenses.length;
  const totalPendingAmount = pendingExpenses.reduce((sum, e) => {
    const share = e.split.find(s => s.memberId === currentUserId);
    return sum + (share?.amount || 0);
  }, 0);
  
  // Check readiness to settle using new helper (if pot provided)
  // Ready to settle check - REMOVED (no confirmations required)
  const canSettle = expenses.length > 0 && (
    balances.some(b => Math.abs(b.balance) > settleThreshold) ||
    settlementSuggestions.length > 0
  );
  
  // Filter expenses (when showing pending only, exclude self-paid expenses)
  const displayedExpenses = showPendingOnly 
    ? expenses.filter(e => e.paidBy !== currentUserId && !hasConfirmed(e, currentUserId))
    : expenses;

  // Handle expense click
  const handleExpenseClick = (expense: Expense) => {
    onExpenseClick(expense);
  };

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
  
  // Handle settlement confirmation
  const handleSettleConfirm = async () => {
    if (!settlementModal || !onUpdatePot) return;
    
    setIsSending(true);
    
    try {
      let txHash: string | undefined;
      let blockHash: string | undefined;
      let status: 'in_block' | 'finalized' | 'failed' = 'in_block';
      
      // Send DOT transaction with lifecycle tracking
      const { chain } = await import('../../services/chain');
      await chain.sendDot({
        from: settlementModal.fromAddress,
        to: settlementModal.toAddress,
        amountDot: settlementModal.amountDot,
        onStatus: (s, ctx) => {
          if (s === 'submitted') {
            onShowToast?.('Transaction submitted...', 'info');
          } else if (s === 'inBlock') {
            txHash = ctx?.txHash || txHash;
            blockHash = ctx?.blockHash || blockHash;
            status = 'in_block';
            onShowToast?.(`Transaction in block! ${txHash ? `Hash: ${txHash.slice(0, 8)}...` : ''}`, 'success');
          } else if (s === 'finalized') {
            status = 'finalized';
            blockHash = ctx?.blockHash || blockHash;
            onShowToast?.('Transaction finalized!', 'success');
          }
        },
      });
      
      if (!txHash) {
        throw new Error('Transaction hash not received');
      }
      
      // Create history entry (status will be updated if finalized callback fires)
      const historyEntry: PotHistory = {
        id: `settlement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'onchain_settlement',
        fromMemberId: settlementModal.fromMemberId,
        toMemberId: settlementModal.toMemberId,
        fromAddress: settlementModal.fromAddress,
        toAddress: settlementModal.toAddress,
        amountDot: settlementModal.amountDot.toFixed(6),
        txHash,
        block: blockHash,
        status: status, // Will be 'in_block' initially, 'finalized' if callback fired
        when: Date.now(),
        subscan: polkadotChainService.buildSubscanUrl(txHash),
      };
      
      // Update pot history
      const updatedHistory = [historyEntry, ...potHistory];
      onUpdatePot({ history: updatedHistory });
      
      // Refresh balance
      try {
        await account.refreshBalance();
      } catch (refreshError) {
        console.error('[ExpensesTab] Balance refresh failed:', refreshError);
      }
      
      // Close modal
      setSettlementModal(null);
      setIsSending(false);
      
    } catch (error: any) {
      console.error('[ExpensesTab] Settlement error:', error);
      setIsSending(false);
      
      if (error?.message === 'USER_REJECTED') {
        onShowToast?.('Transaction cancelled', 'info');
      } else if (error?.message?.includes('Insufficient')) {
        onShowToast?.('Insufficient balance for transaction', 'error');
      } else {
        onShowToast?.(`Settlement failed: ${error?.message || 'Unknown error'}`, 'error');
      }
    }
  };
  
  const handleSettleCancel = () => {
    setSettlementModal(null);
    setIsSending(false);
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
                  {netBalance >= 0 ? '+' : ''}{baseCurrency === 'DOT' ? `${Math.abs(netBalance).toFixed(6)} DOT` : `$${Math.abs(netBalance).toFixed(2)}`}
                </p>
              </div>
              
              {/* Quick context line: Total spent + Budget */}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-caption text-secondary">
                  {baseCurrency === 'DOT' ? `${totalExpenses.toFixed(6)} DOT` : `$${totalExpenses.toFixed(0)}`} spent
                </span>
                {budgetEnabled && budget && (
                  <>
                    <span className="text-caption text-secondary">•</span>
                    <span className="text-caption text-secondary" style={{ color: isOverBudget ? 'var(--danger)' : undefined }}>
                      {isOverBudget ? `${(totalExpenses - budget).toFixed(0)} over` : `${budgetRemaining.toFixed(0)} left`} of ${budget.toFixed(0)}
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
            {balances.length > 0 && (
              <div className="space-y-1.5">
                {balances
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
                          {balance > 0 ? '+' : '-'}{isDotPot ? `${Math.abs(balance).toFixed(6)} DOT` : `$${Math.abs(balance).toFixed(2)}`}
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
            
            {/* Settlement Suggestions */}
            {settlementSuggestions.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-caption text-secondary mb-2">Suggested settlements</p>
                <div className="space-y-1.5">
                  {settlementSuggestions.map((suggestion, idx) => {
                    const fromMember = members.find(m => m.id === suggestion.from);
                    const toMember = members.find(m => m.id === suggestion.to);
                    if (!fromMember || !toMember) return null;
                    
                    // Check if recipient has address (for DOT settlements)
                    const hasRecipientAddress = !!(toMember as any).address;
                    const fromMemberAddress = (fromMember as any).address;
                    
                    // For DOT pots: check if current user is the sender and has wallet connected
                    const isCurrentUserSender = fromMember.id === currentUserId;
                    const canSettleWithDot = isDotPot && 
                      isCurrentUserSender && 
                      hasRecipientAddress && 
                      fromMemberAddress && 
                      account.status === 'connected' &&
                      account.address0 &&
                      normalizeToPolkadot(fromMemberAddress) === account.address0;
                    
                    // For DOT pots, amounts are already in DOT; for non-DOT pots, we don't show settle button
                    const amountDot = suggestion.amount; // Always in pot's base currency
                    const displayAmount = isDotPot ? `${suggestion.amount.toFixed(6)} DOT` : `$${suggestion.amount.toFixed(2)}`;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-3 card rounded-lg card-hover-lift transition-shadow duration-200 ${
                          !hasRecipientAddress ? 'opacity-60' : ''
                        }`}
                        title={!hasRecipientAddress ? `No wallet address on file for ${toMember.name}` : undefined}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-label truncate" style={{ fontWeight: 500 }}>
                            {fromMember.name}
                          </span>
                          <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
                          <span className="text-label truncate" style={{ fontWeight: 500 }}>
                            {toMember.name}
                          </span>
                          {!hasRecipientAddress && (
                            <span className="text-micro text-secondary" title="No wallet address on file for this member">
                              (no address)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-label tabular-nums" style={{ fontWeight: 500 }}>
                            {displayAmount}
                          </span>
                          {canSettleWithDot && (
                            <button
                              onClick={() => {
                                setSettlementModal({
                                  fromMemberId: fromMember.id,
                                  toMemberId: toMember.id,
                                  fromAddress: normalizeToPolkadot(fromMemberAddress),
                                  toAddress: normalizeToPolkadot((toMember as any).address),
                                  fromName: fromMember.name,
                                  toName: toMember.name,
                                  amountDot,
                                });
                              }}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-accent text-white hover:opacity-90 transition-opacity flex items-center gap-1"
                              disabled={isSending}
                            >
                              <Wallet className="w-3 h-3" />
                              Settle with DOT
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-caption text-secondary mt-2" style={{ fontSize: '10px' }}>
                  {isDotPot 
                    ? "Settle directly on-chain with DOT. Minimal transfers to settle all balances."
                    : "These are minimal transfers to settle all balances. Use \"Settle Up\" to initiate settlements."
                  }
                </p>
              </div>
            )}
            
            {/* Recent Settlements (DOT pots only) */}
            {isDotPot && settlementHistory.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-caption text-secondary mb-2">Recent settlements</p>
                <div className="space-y-1.5">
                  {settlementHistory.slice(0, 5).map((entry) => {
                    const fromMember = members.find(m => m.id === entry.fromMemberId);
                    const toMember = members.find(m => m.id === entry.toMemberId);
                    const statusBadge = entry.status === 'finalized' 
                      ? { label: 'Finalized', color: 'var(--success)' }
                      : entry.status === 'in_block'
                      ? { label: 'In block', color: 'var(--accent)' }
                      : { label: 'Failed', color: 'var(--danger)' };
                    
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 card rounded-lg card-hover-lift transition-shadow duration-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-label truncate" style={{ fontWeight: 500 }}>
                            {fromMember?.name || 'Unknown'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
                          <span className="text-label truncate" style={{ fontWeight: 500 }}>
                            {toMember?.name || 'Unknown'}
                          </span>
                          <span className="text-micro px-1.5 py-0.5 rounded" style={{ 
                            background: `${statusBadge.color}20`,
                            color: statusBadge.color,
                            fontWeight: 500
                          }}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-label tabular-nums" style={{ fontWeight: 500 }}>
                            {parseFloat(entry.amountDot).toFixed(6)} DOT
                          </span>
                          {entry.status === 'finalized' && (
                            <a
                              href={entry.subscan}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="View on Subscan"
                            >
                              <ExternalLink className="w-3 h-3 text-secondary" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(entry.txHash);
                              onShowToast?.('Transaction hash copied', 'success');
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Copy transaction hash"
                          >
                            <Copy className="w-3 h-3 text-secondary" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Quick Actions Row */}
            <div className="flex gap-2 pt-2 items-center">
              <button
                onClick={onAddExpense}
                className="flex-1 py-3 rounded-[var(--r-lg)] transition-all active:scale-[0.98]"
                style={{ 
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600
                }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span className="text-body">Add Expense</span>
                </div>
              </button>
              
              {canSettle && (
                <button
                  onClick={() => {
                    onSettle();
                  }}
                  className="flex-1 py-2.5 rounded-[var(--r-lg)] transition-all active:scale-[0.98] card hover:shadow-[var(--shadow-fab)]"
                  style={{ 
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

      {/* Pending Attestations Alert - REMOVED */}
      {false && pendingAttestations > 0 && (
        <div className="mx-3">
          <div className="card p-4 space-y-3 transition-shadow duration-200" style={{ 
            background: 'rgba(230, 0, 122, 0.1)',
            border: '1px solid rgba(230, 0, 122, 0.2)'
          }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-pink)' }}>
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-label" style={{ fontWeight: 500 }}>
                  {pendingAttestations} expense{pendingAttestations !== 1 ? 's' : ''} need{pendingAttestations === 1 ? 's' : ''} your confirmation
                </p>
                <p className="text-micro text-secondary">
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
                      !hasConfirmed(exp, currentUserId)
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
                <p className="text-micro text-center py-4" style={{ color: 'var(--text-secondary)' }}>
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
                          {event.metadata.currency || baseCurrency} {event.metadata.amount.toFixed(baseCurrency === 'DOT' ? 6 : 2)}
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
      ) : displayedExpenses.length === 0 ? (
        <div className="mx-3">
          <div className="flex flex-col items-center justify-center gap-3 p-8 card transition-shadow duration-200">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(25, 195, 125, 0.1)' }}>
              <CheckCircle className="w-6 h-6" style={{ color: 'var(--success)' }} />
            </div>
            <div className="text-center">
              <p className="text-body text-foreground">All caught up!</p>
              <p className="text-caption mt-1 text-secondary">No pending expenses to review</p>
            </div>
            <button
              onClick={() => setShowPendingOnly(false)}
              className="mt-2 text-micro underline"
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
                <h3 className="text-micro" style={{ color: 'var(--text-secondary)' }}>{dateLabel}</h3>
                <span className="text-micro tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {baseCurrency} {dateExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </span>
              </div>
              
              {/* Expenses in this date group */}
              <div className="space-y-1.5">
                {dateExpenses.map((expense) => {
                  return (
                    <SwipeableExpenseRow
                      key={expense.id}
                      expense={expense as any}
                      members={members}
                      currentUserId={currentUserId}
                      baseCurrency={baseCurrency}
                      onClick={() => handleExpenseClick(expense)}
                      onDelete={onDeleteExpense ? () => onDeleteExpense(expense.id) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Settlement Confirmation Modal */}
      {settlementModal && (
        <SettlementConfirmModal
          isOpen={!!settlementModal}
          fromAddress={settlementModal.fromAddress}
          toAddress={settlementModal.toAddress}
          fromName={settlementModal.fromName}
          toName={settlementModal.toName}
          amountDot={settlementModal.amountDot}
          onConfirm={handleSettleConfirm}
          onCancel={handleSettleCancel}
          isSending={isSending}
        />
      )}

      {/* Edit Invalidation Confirm Modal */}
      {/* ConfirmModal - REMOVED */}
      {false && (
      <ConfirmModal
          open={false}
        title="Editing will void the snapshot"
        body="This pot has a checkpoint. Editing invalidates it; you'll need a new checkpoint before settling."
        confirmText="Edit anyway"
        cancelText="Cancel"
          onConfirm={() => {}}
          onCancel={() => {}}
      />
      )}
    </div>
  );
}
