import { useMemo, useState } from "react";
import { TopBar } from "../TopBar";
import { ExpensesTab } from "./ExpensesTab";
import { SavingsTab } from "./SavingsTab";
import { MembersTab } from "./MembersTab";
import { SettingsTab } from "./SettingsTab";
import { Download, Share2 } from "lucide-react";
import { exportPotExpensesToCSV } from "../../utils/export";
import { triggerHaptic } from "../../utils/haptics";
import { QuickKeypadSheet } from "../QuickKeypadSheet";

interface Member {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "pending";
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

interface CheckpointConfirmation {
  confirmed: boolean;
  confirmedAt?: string;
}

interface PotHomeProps {
  potId?: string;
  potType: "expense" | "savings";
  potName: string;
  baseCurrency: string;
  members: Member[];
  expenses: Expense[];
  budget?: number;
  budgetEnabled?: boolean;
  // Checkpoint props
  checkpointEnabled?: boolean;
  hasActiveCheckpoint?: boolean;
  checkpointConfirmations?: Map<string, CheckpointConfirmation> | Record<string, CheckpointConfirmation>;
  // Savings pot props
  contributions?: Contribution[];
  totalPooled?: number;
  yieldRate?: number;
  defiProtocol?: string;
  goalAmount?: number;
  goalDescription?: string;
  // Handlers
  onBack: () => void;
  onAddExpense: () => void;
  onExpenseClick: (expense: Expense) => void;
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onUpdateMember?: (member: { id: string; name: string; address?: string; verified?: boolean }) => void;
  onUpdateSettings: (settings: any) => void;
  onSettle: () => void;
  onCopyInviteLink?: () => void;
  onResendInvite?: (memberId: string) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onAttestExpense?: (expenseId: string, silent?: boolean) => void;
  onBatchAttestExpenses?: (expenseIds: string[]) => void;
  onShowToast?: (message: string, type?: "success" | "info" | "error") => void;
  onAddContribution?: () => void;
  onWithdraw?: () => void;
  onViewCheckpoint?: () => void;
  onQuickAddSave?: (data: {
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    hasReceipt: boolean;
  }) => void;
  // When true, open the quick keypad on mount/update
  openQuickAdd?: boolean;
  onClearQuickAdd?: () => void;
  // Export/Import
  onImportPot?: (pot: import('../../schema/pot').Pot) => void;
  // Pot management actions
  onDeletePot?: () => void;
  onLeavePot?: () => void;
  onArchivePot?: () => void;
  // Pot history (on-chain settlements)
  potHistory?: import('../../App').PotHistory[];
  onUpdatePot?: (updates: { history?: import('../../App').PotHistory[] }) => void;
}

export function PotHome({
  potId,
  potType,
  potName,
  baseCurrency,
  members,
  expenses,
  budget,
  budgetEnabled,
  checkpointEnabled,
  hasActiveCheckpoint: _hasActiveCheckpoint,
  checkpointConfirmations,
  contributions = [],
  totalPooled = 0,
  yieldRate = 0,
  defiProtocol = "Acala Earn",
  goalAmount,
  goalDescription,
  onBack,
  // onAddExpense,
  onExpenseClick,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  onUpdateSettings,
  onSettle,
  onCopyInviteLink,
  onResendInvite,
  onDeleteExpense,
  onAttestExpense,
  onBatchAttestExpenses,
  onShowToast,
  onAddContribution,
  onWithdraw,
  onViewCheckpoint: _onViewCheckpoint,
  onQuickAddSave,
  openQuickAdd,
  onClearQuickAdd,
  onImportPot,
  onDeletePot,
  onLeavePot,
  onArchivePot,
  potHistory = [],
  onUpdatePot,
}: PotHomeProps) {
  // Dynamic tabs based on pot type
  const tabs = potType === "savings" 
    ? ["Savings", "Members", "Settings"]
    : ["Expenses", "Members", "Settings"];
  const [activeTab, setActiveTab] = useState<string>(tabs[0] ?? "Expenses");
  const [keypadOpen, setKeypadOpen] = useState(false);

  // Open keypad when requested by parent (e.g., FAB)
  if (openQuickAdd && !keypadOpen) {
    setTimeout(() => {
      setKeypadOpen(true);
      onClearQuickAdd && onClearQuickAdd();
    }, 0);
  }

  // Calculate summary
  const currentUserId = "owner"; // Mock current user
  const myExpenses = expenses
    .filter((e) => e.paidBy === currentUserId)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  // Calculate net: what you're owed minus what you owe
  const myShare = expenses.reduce((sum, e) => {
    const share = e.split.find((s) => s.memberId === currentUserId);
    return sum + (share?.amount || 0);
  }, 0);
  const net = myExpenses - myShare;
  void net;

  // Savings pot metrics
  const myContributions = contributions.filter(c => c.memberId === currentUserId).reduce((sum, c) => sum + c.amount, 0);
  const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);
  const yieldEarned = (totalPooled ?? 0) - totalContributed;
  void myContributions; void yieldEarned;

  // Budget calculations
  const budgetPercentage = budget ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const budgetRemaining = budget ? Math.max(budget - totalExpenses, 0) : 0;
  const isOverBudget = budget ? totalExpenses > budget : false;
  void budgetPercentage; void budgetRemaining; void isOverBudget;

  // Derive quick picks from recent expenses (per pot/person context)
  const quickPicks = useMemo(() => {
    type PickKey = string;
    const stats = new Map<PickKey, { label: string; amount: number; participantIds?: string[]; count: number; lastTs: number }>();
    const memberIdSet = new Set(members.map((m) => m.id));

    // Iterate from newest to oldest
    [...expenses].reverse().forEach((e) => {
      const label = (e.memo || '').trim();
      if (label.length === 0) return;
      const participantIds = e.split
        .filter((s) => s.amount > 0 && memberIdSet.has(s.memberId))
        .map((s) => s.memberId)
        .sort();
      const key = `${label.toLowerCase()}|${participantIds.join(',')}` as PickKey;
      const existing = stats.get(key);
      const ts = new Date(e.date).getTime() || Date.now();
      if (existing) {
        existing.count += 1;
        // Keep most recent amount/ts
        if (ts > existing.lastTs) {
          existing.amount = e.amount;
          existing.lastTs = ts;
        }
      } else {
        stats.set(key, {
          label,
          amount: e.amount,
          participantIds: participantIds.length > 0 ? participantIds : undefined,
          count: 1,
          lastTs: ts,
        });
      }
    });

    // Rank by recency then frequency
    const ranked = Array.from(stats.values()).sort((a, b) => {
      if (b.lastTs !== a.lastTs) return b.lastTs - a.lastTs;
      return b.count - a.count;
    });

    return ranked.slice(0, 8).map((r) => ({ label: r.label, amount: r.amount, participantIds: r.participantIds }));
  }, [expenses, members]);
  void quickPicks;

  // Checkpoint status (supports Map or plain object from localStorage)
  const confirmationsArray: CheckpointConfirmation[] = checkpointConfirmations
    ? (checkpointConfirmations instanceof Map
        ? Array.from(checkpointConfirmations.values())
        : Object.values(checkpointConfirmations as Record<string, CheckpointConfirmation>))
    : [];
  const confirmedCount = confirmationsArray.filter(c => c.confirmed).length;
  const totalCount = members.length;

  // Handle CSV export
  const handleExportCSV = () => {
    triggerHaptic('light');
    
    if (potType === "expense" && expenses.length > 0) {
      exportPotExpensesToCSV(potName, expenses, members, currentUserId);
      onShowToast?.("✓ Expenses exported to CSV", "success");
    } else if (potType === "expense") {
      onShowToast?.("No expenses to export", "info");
    } else {
      onShowToast?.("CSV export available for expense pots", "info");
    }
  };

  return (
    <>
    <div className="flex flex-col h-full pb-[68px]">
      <TopBar 
        title={potName} 
        onBack={onBack}
        rightAction={
          <div className="flex items-center gap-1.5">
            {potType === "expense" && (
              <button
                onClick={() => {
                  if (onCopyInviteLink) onCopyInviteLink();
                }}
                className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
                title="Share invite"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
            {potType === "expense" && expenses.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
                title="Export to CSV"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </div>
        }
      />

      {/* Checkpoint metric integrated into balance card (no banner) */}

      {/* Settle plan preview removed to reduce redundancy with balances list; use Settle Up CTA */}

      {/* Tab Pills - Match People & Activity pages */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-border bg-background">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              backgroundColor: activeTab === tab ? "var(--ink)" : "var(--card)",
              color: activeTab === tab ? "var(--bg)" : "var(--ink)",
            }}
            className="px-3 py-1.5 rounded-lg text-[13px] transition-colors font-medium flex-shrink-0"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab === "Savings" && potType === "savings" && (
          <SavingsTab
            members={members}
            currentUserId={currentUserId}
            baseCurrency={baseCurrency}
            contributions={contributions}
            totalPooled={totalPooled}
            yieldRate={yieldRate}
            defiProtocol={defiProtocol}
            goalAmount={goalAmount}
            goalDescription={goalDescription}
            onAddContribution={onAddContribution || (() => {})}
            onWithdraw={onWithdraw || (() => {})}
          />
        )}
        {activeTab === "Expenses" && potType === "expense" && (
          <ExpensesTab
            expenses={expenses}
            members={members}
            currentUserId={currentUserId}
            baseCurrency={baseCurrency}
            budget={budget}
            budgetEnabled={budgetEnabled}
            totalExpenses={totalExpenses}
            contributions={contributions}
            potId={potId}
            potHistory={potHistory}
            onAddExpense={() => setKeypadOpen(true)}
            onExpenseClick={onExpenseClick}
            onSettle={onSettle}
            onDeleteExpense={onDeleteExpense}
            onAttestExpense={onAttestExpense}
            onBatchAttestExpenses={onBatchAttestExpenses}
            onShowToast={onShowToast}
            onUpdatePot={onUpdatePot}
            checkpointConfirmedCount={confirmedCount}
            checkpointTotalCount={totalCount}
          />
        )}
        {activeTab === "Members" && (
          <MembersTab
            members={members}
            expenses={expenses}
            currentUserId={currentUserId}
            baseCurrency={baseCurrency}
            onAddMember={onAddMember}
            onRemoveMember={onRemoveMember}
            onUpdateMember={onUpdateMember}
            onCopyInviteLink={onCopyInviteLink}
            onResendInvite={onResendInvite}
          />
        )}
        {activeTab === "Settings" && (
          <SettingsTab
            potName={potName}
            baseCurrency={baseCurrency}
            hasExpenses={expenses.length > 0}
            budget={budget}
            budgetEnabled={budgetEnabled}
            checkpointEnabled={checkpointEnabled}
            potType={potType}
            members={members}
            potId={potId}
            pot={onImportPot ? {
              id: potId || '',
              name: potName,
              members: members.map(m => ({ id: m.id, name: m.name })),
              expenses: expenses.map(e => ({
                id: e.id,
                potId: potId || '',
                description: e.memo,
                amount: e.amount,
                paidBy: e.paidBy,
                createdAt: new Date(e.date).getTime(),
              })),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } : undefined}
            onUpdateSettings={onUpdateSettings}
            onCopyInviteLink={onCopyInviteLink}
            onResendInvite={onResendInvite}
            onImportPot={onImportPot}
            onShowToast={onShowToast}
            onLeavePot={onLeavePot}
            onArchivePot={onArchivePot}
            onDeletePot={onDeletePot}
          />
        )}
      </div>
    </div>

    {/* Quick Keypad Sheet */}
    {potType === "expense" && (
      <QuickKeypadSheet
        isOpen={keypadOpen}
        onClose={() => setKeypadOpen(false)}
        baseCurrency={baseCurrency}
        members={members}
        currentUserId={currentUserId}
        defaultMode={expenses.length > 0 ? 'last' : 'equal'}
        lastSplit={expenses.length > 0 ? expenses[expenses.length - 1]?.split : undefined}
        onSave={(data) => {
          triggerHaptic('light');
          onQuickAddSave?.(data);
          setKeypadOpen(false);
        }}
      />
    )}
  </>
  );
}