import { useEffect, useState } from 'react';
import { TopBar } from '../TopBar';
import { ExpensesTab } from './ExpensesTab';
import { MembersTab } from './MembersTab';
import { SettingsTab } from './SettingsTab';
import { Download, Share2 } from 'lucide-react';
import { exportPotExpensesToCSV } from '../../utils/export';
import { triggerHaptic } from '../../utils/haptics';
import { QuickKeypadSheet } from '../QuickKeypadSheet';
import { useAccount } from '../../contexts/AccountContext';
import { useData } from '../../services/data/DataContext';
import { usePSAStyle } from '../../utils/usePSAStyle';
import { usePotDataMerge } from '../../hooks/usePotDataMerge';
import { usePotSummary } from '../../hooks/usePotSummary';
import { useCheckpointState } from '../../hooks/useCheckpointState';
import { useChapterState } from '../../hooks/useChapterState';
import { ChapterPanel } from '../commit/ChapterPanel';
import type { Pot } from '../../schema/pot';

interface PotHomeProps {
  potId?: string;
  potType: 'expense' | 'savings';
  potName: string;
  baseCurrency: string;
  currentUserId: string;
  members: Array<{ id: string; name: string; role: 'Owner' | 'Member'; status: 'active' | 'pending'; verified?: boolean }>;
  expenses: Array<{ id: string; amount: number; currency: string; paidBy: string; memo: string; date: string; split: { memberId: string; amount: number }[]; attestations: string[]; hasReceipt: boolean; receiptUrl?: string }>;
  budget?: number;
  budgetEnabled?: boolean;
  checkpointEnabled?: boolean;
  hasActiveCheckpoint?: boolean;
  checkpointConfirmations?: Map<string, { confirmed: boolean; confirmedAt?: string }> | Record<string, { confirmed: boolean; confirmedAt?: string }>;
  contributions?: Array<{ id: string; memberId: string; amount: number; date: string }>;
  goalAmount?: number;
  goalDescription?: string;
  onBack: () => void;
  onAddExpense: () => void;
  onExpenseClick: (expense: any) => void;
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onUpdateMember?: (member: { id: string; name: string; verified?: boolean }) => void;
  onUpdateSettings: (settings: any) => void;
  onSettle: () => void;
  onCopyInviteLink?: () => void;
  onResendInvite?: (memberId: string) => void;
  onRevokeInvite?: (memberId: string) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onAddContribution?: () => void;
  onWithdraw?: () => void;
  onViewCheckpoint?: () => void;
  onQuickAddSave?: (data: { amount: number; currency: string; paidBy: string; memo: string; date: string; split: { memberId: string; amount: number }[]; hasReceipt: boolean }) => void;
  openQuickAdd?: boolean;
  onClearQuickAdd?: () => void;
  onImportPot?: (pot: Pot) => void;
  onDeletePot?: () => void;
  onLeavePot?: () => void;
  onArchivePot?: () => void;
  potHistory?: Array<{ type: string; [key: string]: unknown }>;
  closeouts?: unknown[];
  onUpdatePot?: (updates: { history?: unknown[]; lastCheckpoint?: unknown; lastEditAt?: string }) => void;
  onReopenTrackedSettlement?: () => void;
}

export function PotHome(props: PotHomeProps) {
  const {
    potId,
    currentUserId,
    onBack,
    onExpenseClick,
    onAddMember,
    onRemoveMember,
    onUpdateMember,
    onUpdateSettings,
    onSettle,
    onCopyInviteLink,
    onResendInvite,
    onRevokeInvite,
    onDeleteExpense,
    onShowToast,
    onQuickAddSave,
    openQuickAdd,
    onClearQuickAdd,
    onImportPot,
    onDeletePot,
    onLeavePot,
    onArchivePot,
    potHistory: potHistoryProp = [],
    onUpdatePot,
    checkpointConfirmations,
  } = props;

  const { isPSA, psaStyles, psaClasses: _psaClasses } = usePSAStyle();
  const { pots: potService } = useData();
  const account = useAccount();

  const merged = usePotDataMerge({
    potId,
    potType: props.potType,
    potName: props.potName,
    baseCurrency: props.baseCurrency,
    members: props.members,
    expenses: props.expenses,
    budget: props.budget,
    budgetEnabled: props.budgetEnabled,
    checkpointEnabled: props.checkpointEnabled,
    contributions: props.contributions,
    goalAmount: props.goalAmount,
    goalDescription: props.goalDescription,
  });

  const { potType, potName, baseCurrency, members, expenses, budget, budgetEnabled, checkpointEnabled, contributions, pot, refreshPot } = merged;

  const summary = usePotSummary({
    expenses,
    members,
    currentUserId,
    budget,
    contributions,
    checkpointConfirmations,
  });

  const chapter = useChapterState({
    potId,
    currentUserId,
    onShowToast,
  });

  const isWalletConnected = false;
  const showCheckpointSection = false;

  const checkpoint = useCheckpointState({
    pot,
    potId,
    potName,
    baseCurrency,
    members,
    expenses,
    potHistory: potHistoryProp,
    showCheckpointSection,
    isWalletConnected,
    walletAddress: account.address0,
    onShowToast,
    potService,
    refreshPot,
  });

  const tabs = potType === 'savings' ? ['Members', 'Settings'] : ['Expenses', 'Members', 'Settings'];
  const [activeTab, setActiveTab] = useState<string>(tabs[0] ?? 'Expenses');
  const [keypadOpen, setKeypadOpen] = useState(false);
  const canAddExpense = true;
  const addExpenseDisabledReason: string | undefined = undefined;

  useEffect(() => {
    if (!openQuickAdd) return;
    if (potType !== 'expense') { onClearQuickAdd?.(); return; }
    setKeypadOpen(true);
    onClearQuickAdd?.();
  }, [openQuickAdd, onClearQuickAdd, potType]);

  const handleExportCSV = () => {
    triggerHaptic('light');
    if (potType === 'expense' && expenses.length > 0) {
      exportPotExpensesToCSV(potName, expenses, members, currentUserId);
      onShowToast?.('✓ Expenses exported to CSV', 'success');
    } else if (potType === 'expense') {
      onShowToast?.('No expenses to export', 'info');
    } else {
      onShowToast?.('CSV export available for expense pots', 'info');
    }
  };

  const buildSettingsTabPot = (): Pot | undefined => {
    if (pot) {
      return {
        id: pot.id || potId || '',
        name: pot.name || potName,
        type: pot.type || potType,
        baseCurrency: (pot.baseCurrency || baseCurrency) as Pot['baseCurrency'],
        members: pot.members || members.map(m => ({ id: m.id, name: m.name })),
        expenses: pot.expenses || expenses.map(e => ({ id: e.id, potId: potId || '', description: e.memo, amount: e.amount, paidBy: e.paidBy, createdAt: e.date ? new Date(e.date).getTime() : Date.now() })),
        history: pot.history || [],
        closeouts: pot.closeouts || [],
        budgetEnabled: pot.budgetEnabled ?? budgetEnabled,
        budget: pot.budget ?? budget,
        checkpointEnabled: pot.checkpointEnabled ?? checkpointEnabled ?? true,
        mode: (pot as any).mode ?? 'casual',
        confirmationsEnabled: (pot as any).confirmationsEnabled ?? false,
        archived: pot.archived ?? false,
        createdAt: pot.createdAt || Date.now(),
        updatedAt: pot.updatedAt || Date.now(),
      } as Pot;
    }
    if (!onImportPot) return undefined;
    return {
      id: potId || '',
      name: potName,
      type: potType,
      baseCurrency: baseCurrency as Pot['baseCurrency'],
      members: members.map(m => ({ id: m.id, name: m.name })),
      expenses: expenses.map(e => ({ id: e.id, potId: potId || '', description: e.memo, amount: e.amount, paidBy: e.paidBy, createdAt: e.date ? new Date(e.date).getTime() : Date.now() })),
      history: [],
      budgetEnabled: false,
      checkpointEnabled: checkpointEnabled ?? true,
      mode: 'casual',
      confirmationsEnabled: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Pot;
  };

  return (
    <>
      <div
        className={`flex flex-col h-full pb-[68px] ${isPSA ? '' : 'bg-background'}`}
        style={isPSA ? psaStyles.background : undefined}
      >
        <TopBar
          title={potName}
          onBack={onBack}
          rightAction={
            <div className="flex items-center gap-1.5">
              {potType === 'expense' && (
                <button
                  onClick={() => onCopyInviteLink ? onCopyInviteLink() : onShowToast?.('No invite link available', 'info')}
                  className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
                  title="Share invite"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
              {potType === 'expense' && expenses.length > 0 && (
                <button onClick={handleExportCSV} className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95" title="Export to CSV">
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          }
        />

        <div className="px-4 py-3 flex items-center gap-2 border-b border-border bg-background">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ backgroundColor: activeTab === tab ? 'var(--ink)' : 'var(--card)', color: activeTab === tab ? 'var(--bg)' : 'var(--ink)' }}
              className="px-3 py-1.5 rounded-lg text-[13px] transition-colors font-medium flex-shrink-0"
            >
              {tab}
            </button>
          ))}
        </div>

        {potType === 'expense' && (
          <ChapterPanel
            legs={chapter.legs}
            chapterStatus={chapter.chapterStatus}
            members={members}
            currentUserId={currentUserId}
            baseCurrency={baseCurrency}
            onMarkPaid={chapter.markPaid}
            onConfirmReceipt={chapter.confirmReceipt}
          />
        )}

        <div className="flex-1 overflow-auto">
          {activeTab === 'Expenses' && potType === 'expense' && (
            <ExpensesTab
              expenses={expenses}
              members={members}
              currentUserId={currentUserId}
              baseCurrency={baseCurrency}
              budget={budget}
              budgetEnabled={budgetEnabled}
              totalExpenses={summary.totalExpenses}
              contributions={contributions}
              potId={potId}
              pot={pot ?? undefined}
              potHistory={checkpoint.activeHistory}
              onAddExpense={() => {
                if (!canAddExpense) {
                  onShowToast?.(addExpenseDisabledReason || 'Smart settlement has already started.', 'info');
                  return;
                }
                setKeypadOpen(true);
              }}
              onExpenseClick={onExpenseClick}
              onSettle={onSettle}
              trackedCloseout={chapter.hasOpenChapter ? chapter : null}
              onReopenTrackedSettlement={undefined}
              canAddExpense={canAddExpense}
              addExpenseDisabledReason={addExpenseDisabledReason}
              onDeleteExpense={onDeleteExpense}
              onShowToast={onShowToast}
              onUpdatePot={onUpdatePot}
              checkpointConfirmedCount={summary.confirmedCount}
              checkpointTotalCount={summary.totalCount}
            />
          )}
          {activeTab === 'Members' && (
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
              onRevokeInvite={onRevokeInvite}
            />
          )}
          {activeTab === 'Settings' && (
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
              pot={buildSettingsTabPot()}
              onUpdateSettings={onUpdateSettings}
              onCopyInviteLink={onCopyInviteLink}
              onResendInvite={onResendInvite}
              onImportPot={onImportPot}
              onShowToast={onShowToast}
              onLeavePot={onLeavePot}
              onArchivePot={onArchivePot}
              onDeletePot={onDeletePot}
              onSharePot={() => { if (onCopyInviteLink) onCopyInviteLink(); }}
            />
          )}
        </div>
      </div>

      {potType === 'expense' && (
        <QuickKeypadSheet
          isOpen={keypadOpen}
          onClose={() => setKeypadOpen(false)}
          baseCurrency={baseCurrency}
          members={members}
          currentUserId={currentUserId}
          defaultMode={expenses.length > 0 ? 'last' : 'equal'}
          lastSplit={expenses.length > 0 ? expenses[expenses.length - 1]?.split : undefined}
          onSave={(data) => { triggerHaptic('light'); onQuickAddSave?.(data); setKeypadOpen(false); }}
        />
      )}
    </>
  );
}
