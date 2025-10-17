import { useState } from "react";
import { TopBar } from "../TopBar";
import { ExpensesTab } from "./ExpensesTab";
import { SavingsTab } from "./SavingsTab";
import { MembersTab } from "./MembersTab";
import { SettingsTab } from "./SettingsTab";
import { Download, Share2 } from "lucide-react";
import { exportPotExpensesToCSV } from "../../utils/export";
import { triggerHaptic } from "../../utils/haptics";

interface Member {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "pending";
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
  checkpointConfirmations?: Map<string, CheckpointConfirmation>;
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
}

export function PotHome({
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
  onAddExpense,
  onExpenseClick,
  onAddMember,
  onRemoveMember,
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
}: PotHomeProps) {
  // Dynamic tabs based on pot type
  const tabs = potType === "savings" 
    ? ["Savings", "Members", "Settings"]
    : ["Expenses", "Members", "Settings"];
  const [activeTab, setActiveTab] = useState<string>(tabs[0] ?? "Expenses");

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

  // Checkpoint status
  const confirmedCount = checkpointConfirmations
    ? Array.from(checkpointConfirmations.values()).filter(c => c.confirmed).length
    : 0;
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
            onAddExpense={onAddExpense}
            onExpenseClick={onExpenseClick}
            onSettle={onSettle}
            onDeleteExpense={onDeleteExpense}
            onAttestExpense={onAttestExpense}
            onBatchAttestExpenses={onBatchAttestExpenses}
            onShowToast={onShowToast}
            checkpointConfirmedCount={confirmedCount}
            checkpointTotalCount={totalCount}
          />
        )}
        {activeTab === "Members" && (
          <MembersTab
            members={members}
            expenses={expenses}
            currentUserId={currentUserId}
            onAddMember={onAddMember}
            onRemoveMember={onRemoveMember}
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
            onUpdateSettings={onUpdateSettings}
            onCopyInviteLink={onCopyInviteLink}
            onResendInvite={onResendInvite}
            onLeavePot={() => {
              // Leave: remove current user from members and navigate back
              const currentUserId = "owner";
              const isMember = members.some(m => m.id === currentUserId);
              if (!isMember) return;
              onShowToast?.("You left the pot", "info");
              onRemoveMember(currentUserId);
              onBack();
            }}
            onArchivePot={() => {
              // Archive: soft-delete by clearing expenses and disabling checkpoint/budget
              onUpdateSettings({ budgetEnabled: false, checkpointEnabled: false });
              onShowToast?.("Pot archived (soft)", "info");
              onBack();
            }}
          />
        )}
      </div>
    </div>
  );
}