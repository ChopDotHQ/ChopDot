import { useEffect, useMemo, useState } from "react";
import { TopBar } from "../TopBar";
import { ExpensesTab } from "./ExpensesTab";
import { SavingsTab } from "./SavingsTab";
import { MembersTab } from "./MembersTab";
import { SettingsTab } from "./SettingsTab";
import { Download, Share2, ExternalLink, Copy } from "lucide-react";
import { exportPotExpensesToCSV } from "../../utils/export";
import { triggerHaptic } from "../../utils/haptics";
import { QuickKeypadSheet } from "../QuickKeypadSheet";
import { useAccount } from "../../contexts/AccountContext";
import { useFeatureFlags } from "../../contexts/FeatureFlagsContext";
import { computePotHash, type PotCheckpointInput } from "../../services/chain/remark";
import type { PotHistory } from "../../App";
import { PrimaryButton } from "../PrimaryButton";
import { usePot } from "../../hooks/usePot";
import { warnDev, logDev } from "../../utils/logDev";
import { shouldPreferDLReads } from "../../utils/dlReadsFlag";
import { savePotSnapshot } from "../../services/backup/backupService";
import { useData } from "../../services/data/DataContext";
import type { Pot as DataLayerPot } from "../../services/data/types";

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
  currentUserId: string;
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
  potType: potTypeProp,
  potName: potNameProp,
  baseCurrency: baseCurrencyProp,
  currentUserId,
  members: membersProp,
  expenses: expensesProp,
  budget: budgetProp,
  budgetEnabled: budgetEnabledProp,
  checkpointEnabled: checkpointEnabledProp,
  hasActiveCheckpoint: _hasActiveCheckpoint,
  checkpointConfirmations,
  contributions: contributionsProp = [],
  totalPooled: totalPooledProp = 0,
  yieldRate: yieldRateProp = 0,
  defiProtocol = "Acala Earn",
  goalAmount: goalAmountProp,
  goalDescription: goalDescriptionProp,
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
  // Task 3: Read pot from Data Layer (if flag enabled) with fallback to props
  const preferDLReads = shouldPreferDLReads();
  const { pot: dlPot, error: dlError, refresh: refreshPot } = usePot(potId);
  const { pots: potService } = useData();
  
  // Use Data Layer pot if flag is on or if DL pot is available, otherwise fallback to props
  const pot = useMemo<DataLayerPot | null>(() => {
    if (preferDLReads) {
      // Flag is on - prefer DL reads
      if (dlPot) {
        return dlPot;
      }
      if (dlError && potId) {
        warnDev('[DataLayer] Pot read failed, falling back to UI state', { potId, error: dlError });
      }
      // DL loading or empty - return null (will use props fallback)
      return null;
    } else {
      // Flag is off - use existing behavior (prefer DL if available, otherwise props)
      if (dlPot) {
        return dlPot;
      }
      if (dlError && potId) {
        warnDev('[DataLayer] Pot read failed, falling back to UI state', { potId, error: dlError });
      }
      return null;
    }
  }, [dlPot, dlError, potId, preferDLReads]);

  // Determine which data source to use (Data Layer or props fallback)
  const potType = pot?.type ?? potTypeProp;
  const potName = pot?.name ?? potNameProp;
  const baseCurrency = pot?.baseCurrency ?? baseCurrencyProp;
  // Transform Data Layer types to component types (handle optional/nullable fields)
  const members = useMemo(() => {
    const source = pot?.members ?? membersProp;
    return source.map(m => ({
      id: m.id,
      name: m.name,
      role: (m.role === 'Owner' || m.role === 'Member' ? m.role : 'Member') as 'Owner' | 'Member',
      status: (m.status === 'active' || m.status === 'pending' ? m.status : 'active') as 'active' | 'pending',
      address: m.address ?? undefined, // Convert null to undefined
      verified: m.verified ?? false,
    }));
  }, [pot?.members, membersProp]);

  const expenses = useMemo(() => {
    const source = pot?.expenses ?? expensesProp;
    return source.map(e => {
      // Handle both memo and description fields (backward compatibility)
      const memo = e.memo ?? (e as any).description ?? '';
      const date = e.date ?? new Date().toISOString().split('T')[0];
      return {
        id: e.id,
        amount: e.amount,
        currency: e.currency ?? baseCurrency, // Default to pot currency
        paidBy: e.paidBy,
        memo,
        date, // Always defined
        split: e.split ?? [], // Default to empty array
        attestations: e.attestations ?? [],
        hasReceipt: e.hasReceipt ?? false,
        receiptUrl: e.receiptUrl,
      } as Expense;
    });
  }, [pot?.expenses, expensesProp, baseCurrency]);
  const budget = pot?.budget ?? budgetProp;
  const budgetEnabled = pot?.budgetEnabled ?? budgetEnabledProp;
  const checkpointEnabled = pot?.checkpointEnabled ?? checkpointEnabledProp;
  const contributions = pot?.contributions ?? contributionsProp;
  const totalPooled = pot?.totalPooled ?? totalPooledProp;
  const yieldRate = pot?.yieldRate ?? yieldRateProp;
  const goalAmount = pot?.goalAmount ?? goalAmountProp;
  const goalDescription = pot?.goalDescription ?? goalDescriptionProp;

  // Dynamic tabs based on pot type
  const tabs = potType === "savings" 
    ? ["Savings", "Members", "Settings"]
    : ["Expenses", "Members", "Settings"];
  const [activeTab, setActiveTab] = useState<string>(tabs[0] ?? "Expenses");
  const account = useAccount();
  const { POLKADOT_APP_ENABLED } = useFeatureFlags();
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [isCheckpointing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastCheckpointClick, setLastCheckpointClick] = useState(0);
  
  // Task 2: Use DL-loaded pot history as source of truth
  // Ensure all history entries have required status field (default to 'submitted')
  const normalizeHistory = (history: (PotHistory | { status?: string; [key: string]: unknown })[]): PotHistory[] => {
    return history.map(entry => {
      const baseEntry = entry as PotHistory;
      return {
        ...baseEntry,
        status: baseEntry.status ?? 'submitted',
      } as PotHistory;
    });
  };
  
  const potHistoryFromDL = normalizeHistory(pot?.history ?? []);
  const activeHistory = potHistoryFromDL.length > 0 ? potHistoryFromDL : normalizeHistory(potHistory as (PotHistory | { status?: string; [key: string]: unknown })[]);
  
  // Dev log for history items
  useEffect(() => {
    if (import.meta.env.DEV && activeHistory.length > 0) {
      const settlementCount = activeHistory.filter(e => e.type === 'onchain_settlement').length;
      const checkpointCount = activeHistory.filter(e => e.type === 'remark_checkpoint').length;
      logDev('[DL][history] items loaded', { 
        total: activeHistory.length, 
        settlements: settlementCount, 
        checkpoints: checkpointCount,
        source: potHistoryFromDL.length > 0 ? 'DL' : 'props'
      });
    }
  }, [activeHistory, potHistoryFromDL.length]);

  const checkpointHistory = useMemo(
    () =>
      activeHistory.filter(
        (entry): entry is Extract<PotHistory, { type: 'remark_checkpoint' }> =>
          entry.type === 'remark_checkpoint'
      ),
    [activeHistory]
  );

  const isWalletConnected = account.status === 'connected' && !!account.address0;
  // Only show checkpoint section if: feature enabled, checkpoint enabled, wallet connected, AND (auditable mode OR dev)
  const isDev = import.meta.env.MODE !== 'production';
  const showCheckpointSection = POLKADOT_APP_ENABLED && checkpointEnabled === true && isWalletConnected && (pot?.mode === 'auditable' || isDev);

  const latestCheckpointEntry = checkpointHistory[0];
  
  // Task 7: Get lastBackupCid from pot (DL) or latest checkpoint entry
  const lastBackupCid = pot?.lastBackupCid ?? latestCheckpointEntry?.cid ?? null;

  const checkpointInput = useMemo<PotCheckpointInput>(() => ({
    id: potId || potName,
    name: potName,
    baseCurrency,
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      address: member.address ?? null,
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      paidBy: expense.paidBy,
      memo: expense.memo,
      date: expense.date,
      split: (expense.split || []).map((split) => ({
        memberId: split.memberId,
        amount: split.amount,
      })),
    })),
    lastBackupCid,
  }), [baseCurrency, expenses, lastBackupCid, members, potId, potName]);

  const ipfsGatewayBase =
    (import.meta.env.VITE_IPFS_GATEWAY as string | undefined) ||
    'https://ipfs.io/ipfs/';

  const buildIpfsUrl = (cid: string) => {
    const base = ipfsGatewayBase.endsWith('/')
      ? ipfsGatewayBase
      : `${ipfsGatewayBase}/`;
    return `${base}${cid}`;
  };

  const currentPotHash = useMemo(
    () => computePotHash(checkpointInput, checkpointInput.lastBackupCid ?? null),
    [checkpointInput]
  );
  const latestCheckpointHash = latestCheckpointEntry?.potHash;
  const hashComparison =
    latestCheckpointHash && latestCheckpointHash === currentPotHash
      ? 'unchanged'
      : latestCheckpointHash
      ? 'changed'
      : 'no checkpoint';

  const truncateHash = (hash?: string) => {
    if (!hash) return '—';
    return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  };

  // applyHistoryUpdate removed - checkpoint feature disabled

  const handleCheckpoint = async () => {
    // Debounce: prevent rapid clicks (2s cooldown)
    const now = Date.now();
    if (now - lastCheckpointClick < 2000) {
      return;
    }
    setLastCheckpointClick(now);
    
    if (!showCheckpointSection) return;
    if (!isWalletConnected || !account.address0) {
      onShowToast?.('Connect a wallet to checkpoint on-chain', 'error');
      return;
    }
    if (isCheckpointing) return;

    // Checkpoint feature removed
    onShowToast?.('Checkpoint feature has been removed', 'info');
    return;
  };

  // Task 7: Handle Crust backup
  const handleBackupToCrust = async () => {
    if (!pot || !potId) {
      onShowToast?.('Pot data not available', 'error');
      return;
    }

    setIsBackingUp(true);
    try {
      const { cid } = await savePotSnapshot(pot);
      
      // Update pot's lastBackupCid via Data Layer
      await potService.updatePot(potId, {
        lastBackupCid: cid,
      });
      
      // Refresh pot from Data Layer
      refreshPot();
      
      onShowToast?.(`Backup saved to Crust (CID: ${cid.slice(0, 8)}...)`, 'success');
      
      if (import.meta.env.DEV) {
        logDev('[BackupService] Backup completed and CID saved', { potId, cid });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup failed';
      onShowToast?.(`Backup failed: ${errorMessage}`, 'error');
      warnDev('[BackupService] Backup failed', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  const getCheckpointStatusBadge = (status: PotHistory['status']) => {
    switch (status) {
      case 'finalized':
        return { label: 'Finalized', color: 'var(--success)' };
      case 'in_block':
        return { label: 'In block', color: 'var(--accent)' };
      case 'submitted':
        return { label: 'Submitted', color: 'var(--accent)' };
      case 'failed':
      default:
        return { label: 'Failed', color: 'var(--danger)' };
    }
  };

  const formatCheckpointTimestamp = (when: number) => {
    try {
      return new Date(when).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Open keypad when requested by parent (e.g., FAB)
  if (openQuickAdd && !keypadOpen) {
    setTimeout(() => {
      setKeypadOpen(true);
      onClearQuickAdd && onClearQuickAdd();
    }, 0);
  }

  // Calculate summary for the current (authenticated) user
  const myExpenses = expenses
    .filter((e) => e.paidBy === currentUserId)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  // Calculate net: what you're owed minus what you owe
  const myShare = expenses.reduce((sum, e) => {
    const share = (e.split ?? []).find((s) => s.memberId === currentUserId);
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
      const participantIds = (e.split ?? [])
        .filter((s) => s.amount > 0 && memberIdSet.has(s.memberId))
        .map((s) => s.memberId)
        .sort();
      const key = `${label.toLowerCase()}|${participantIds.join(',')}` as PickKey;
      const existing = stats.get(key);
      const ts = e.date ? new Date(e.date).getTime() : Date.now();
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
                  if (onCopyInviteLink) {
                    onCopyInviteLink();
                  } else {
                    onShowToast?.("No invite link available", "info");
                  }
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


      {false && showCheckpointSection && (
        <div className="px-4 pt-3">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-caption text-secondary uppercase tracking-wide">Verifiability</p>
                <h3 className="text-base font-semibold">Checkpoint on-chain</h3>
              </div>
              <PrimaryButton
                onClick={handleCheckpoint}
                disabled={isCheckpointing || !isWalletConnected}
                loading={isCheckpointing}
              >
                {isWalletConnected ? 'Checkpoint on-chain' : 'Connect wallet'}
              </PrimaryButton>
            </div>
            <p className="text-caption text-secondary">
              Anchor a tamper-evident snapshot of this pot to Polkadot Asset Hub. Ideal before settlements or audits.
            </p>
            {isDev && (
              <div className="text-[11px] text-secondary bg-muted/30 p-2 rounded-lg flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono truncate">
                    Current hash: {truncateHash(currentPotHash)}
                  </span>
                  <span className="font-mono truncate">
                    Last checkpoint: {truncateHash(latestCheckpointHash)} ({hashComparison})
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentPotHash)
                      .catch((error) => {
                        console.warn('[PotHome] Failed to copy pot hash:', error);
                        onShowToast?.('Failed to copy', 'error');
                      });
                  }}
                  className="text-micro text-foreground underline hover:opacity-80 transition-opacity flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            )}
            
            {/* Task 7: Backup to Crust button */}
            <div className="pt-2 border-t border-border">
              <button
                onClick={handleBackupToCrust}
                disabled={isBackingUp || !pot}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isBackingUp ? 'var(--muted)' : 'var(--accent)',
                  color: 'white',
                }}
              >
                {isBackingUp ? 'Backing up...' : import.meta.env.DEV ? 'Backup to Crust (dev stub)' : 'Backup to Crust (coming soon)'}
              </button>
              {!import.meta.env.DEV && (
                <p className="text-micro text-secondary mt-2 text-center">
                  Crust backup integration coming soon
                </p>
              )}
            </div>

            {checkpointInput.lastBackupCid && (
              <div className="flex items-center justify-between text-[11px] text-secondary bg-muted/20 px-3 py-2 rounded-lg">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="uppercase tracking-wide text-[10px]">Backup CID</span>
                  <span className="font-mono truncate">
                    {checkpointInput.lastBackupCid}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(checkpointInput.lastBackupCid || '')
                        .catch((error) => {
                          console.warn('[PotHome] Failed to copy CID:', error);
                          onShowToast?.('Failed to copy', 'error');
                        })
                    }
                    className="text-micro text-accent underline hover:opacity-80 transition-opacity"
                  >
                    Copy
                  </button>
                  {checkpointInput.lastBackupCid && (
                  <a
                      href={buildIpfsUrl(checkpointInput.lastBackupCid || '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-micro text-accent underline hover:opacity-80 transition-opacity"
                  >
                    Open on IPFS
                  </a>
                  )}
                </div>
              </div>
            )}
            {checkpointHistory.length > 0 ? (
              <div className="space-y-2">
                {checkpointHistory.slice(0, 3).map((entry) => {
                  const badge = getCheckpointStatusBadge(entry.status);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${badge.color}20`,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-secondary">
                            {formatCheckpointTimestamp(entry.when)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-secondary truncate">
                          <span className="truncate">
                            Hash {truncateHash(entry.potHash)}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(entry.potHash)
                                .catch((error) => {
                                  console.warn('[PotHome] Failed to copy pot hash:', error);
                                  onShowToast?.('Failed to copy', 'error');
                                });
                            }}
                            className="text-secondary hover:text-foreground transition-colors"
                            title="Copy pot hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {entry.cid && (
                          <a
                            href={buildIpfsUrl(entry.cid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-micro text-foreground hover:underline flex items-center gap-1"
                          >
                            Open backup
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {entry.subscan && (
                          <a
                            href={entry.subscan}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-micro text-foreground hover:underline flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {entry.txHash && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(entry.txHash || '')
                                .catch((error) => {
                                  console.warn('[PotHome] Failed to copy tx hash:', error);
                                  onShowToast?.('Failed to copy', 'error');
                                });
                            }}
                            className="text-micro text-secondary hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy hash
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-caption text-secondary">
                No checkpoints yet. Use the button above to publish the current state on-chain.
              </p>
            )}
          </div>
        </div>
      )}

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
            pot={pot ?? undefined}
            potHistory={activeHistory}
            onAddExpense={() => setKeypadOpen(true)}
            onExpenseClick={onExpenseClick as any}
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
            pot={pot ? {
              id: pot.id || potId || '',
              name: pot.name || potName,
              type: pot.type || potType,
              baseCurrency: (pot.baseCurrency || baseCurrency) as 'USD' | 'DOT',
              members: pot.members || members.map(m => ({ id: m.id, name: m.name, address: m.address || null })),
              expenses: pot.expenses || expenses.map(e => ({
                id: e.id,
                potId: potId || '',
                description: e.memo,
                amount: e.amount,
                paidBy: e.paidBy,
                createdAt: e.date ? new Date(e.date).getTime() : Date.now(),
              })),
              history: pot.history || [],
              budgetEnabled: pot.budgetEnabled ?? budgetEnabled,
              budget: pot.budget ?? budget,
              checkpointEnabled: pot.checkpointEnabled ?? checkpointEnabled ?? true,
              mode: (pot as any).mode ?? 'casual',
              confirmationsEnabled: (pot as any).confirmationsEnabled ?? false,
              archived: pot.archived ?? false,
              createdAt: pot.createdAt || Date.now(),
              updatedAt: pot.updatedAt || Date.now(),
            } as import('../../schema/pot').Pot : (onImportPot ? {
              id: potId || '',
              name: potName,
              type: potType,
              baseCurrency: baseCurrency as 'USD' | 'DOT',
              members: members.map(m => ({ id: m.id, name: m.name, address: m.address || null })),
              expenses: expenses.map(e => ({
                id: e.id,
                potId: potId || '',
                description: e.memo,
                amount: e.amount,
                paidBy: e.paidBy,
                createdAt: e.date ? new Date(e.date).getTime() : Date.now(),
              })),
              history: [],
              budgetEnabled: false,
              checkpointEnabled: checkpointEnabled ?? true,
              mode: 'casual',
              confirmationsEnabled: false,
              archived: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as import('../../schema/pot').Pot : undefined)}
            onUpdateSettings={onUpdateSettings}
            onCopyInviteLink={onCopyInviteLink}
            onResendInvite={onResendInvite}
            onImportPot={onImportPot}
            onShowToast={onShowToast}
            onLeavePot={onLeavePot}
            onArchivePot={onArchivePot}
            onDeletePot={onDeletePot}
            onSharePot={() => {
              if (onCopyInviteLink) onCopyInviteLink();
            }}
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
