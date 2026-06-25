import { Plus, Bell, TrendingUp, Search, Eye, EyeOff, ListFilter, Receipt, ArrowLeftRight, QrCode, Send, Loader2 } from "lucide-react";
import { WalletBanner } from "../WalletBanner";
import { SortFilterSheet, SortOption } from "../SortFilterSheet";
import { useState, useMemo } from "react";
import { AccountMenu } from "../AccountMenu";
import { EmptyState } from "../EmptyState";
import { usePots } from "../../hooks/usePots";
import { useAuth } from "../../contexts/AuthContext";
import { warnDev } from "../../utils/logDev";
import { shouldPreferDLReads } from "../../utils/dlReadsFlag";
import { usePSAStyle } from "../../utils/usePSAStyle";
import type { Pot as DataLayerPot } from "../../services/data/types";
import { Skeleton } from "../Skeleton";
import { buildDotStatus, type DotChapter } from "../../chopdot-dot/commitmentKernel";
import type { ChapterPotMode } from "../../types/app";

interface Pot {
  id: string;
  name: string;
  type?: "expense" | "savings";
  baseCurrency?: string;
  myExpenses: number;
  totalExpenses: number;
  net: number;
  budget?: number;
  budgetEnabled?: boolean;
  totalPooled?: number;
  yieldRate?: number;
  chapterMode?: ChapterPotMode;
  dotChapter?: DotChapter;
}

interface DebtBreakdown {
  potName: string;
  amount: number;
}

interface PersonDebt {
  id: string;
  name: string;
  totalAmount: number;
  breakdown: DebtBreakdown[];
}

interface PotsHomeProps {
  pots?: Pot[];
  youOwe?: PersonDebt[];
  owedToYou?: PersonDebt[];
  onCreatePot: () => void;
  onPotClick?: (potId: string) => void;
  pendingInvites?: Array<{ id: string; token: string; created_at?: string; expires_at?: string; pot_name?: string }>;
  onAcceptInvite?: (token: string) => void;
  onDeclineInvite?: (token: string) => void;
  onSettleWithPerson?: (personId: string) => void;
  onRemindSent?: () => void;
  onNotificationClick?: () => void;
  onWalletClick?: () => void;
  walletConnected?: boolean;
  notificationCount?: number;
  onQuickAddExpense?: (displayedPots: { id: string }[]) => void;
  onQuickSettle?: () => void;
  onQuickScan?: () => void;
  onQuickRequest?: () => void;
}

function chapterPersonName(chapter: DotChapter, participantId: string): string {
  return chapter.participants.find((participant) => participant.id === participantId)?.name ?? participantId;
}

function chapterAmount(chapter: DotChapter, states?: string[]): number {
  return chapter.obligations
    .filter((obligation) => !states || states.includes(obligation.state))
    .reduce((total, obligation) => total + obligation.amount, 0);
}

function formatChapterCardPrompt(chapter: DotChapter): string {
  const openObligation = chapter.obligations.find((obligation) => obligation.state === 'open');
  if (openObligation) {
    return `${chapterPersonName(chapter, openObligation.fromParticipantId)} pays ${chapterPersonName(chapter, openObligation.toParticipantId)}`;
  }
  const claimedObligation = chapter.obligations.find((obligation) => obligation.state === 'claimed');
  if (claimedObligation) {
    return `${chapterPersonName(chapter, claimedObligation.toParticipantId)} confirms ${chapterPersonName(chapter, claimedObligation.fromParticipantId)}`;
  }
  const release = chapter.releaseRequests.at(-1);
  if (release?.state === 'requested') return 'Approval needed';
  if (release?.state === 'approved') return 'Ready to release';
  if (release?.state === 'claimed_released') return `${chapterPersonName(chapter, release.recipientId)} confirms receipt`;
  return 'Ready to close';
}

export function PotsHome({
  pots: potsProp = [],
  youOwe = [],
  owedToYou = [],
  onCreatePot,
  onPotClick,
  pendingInvites = [],
  onAcceptInvite,
  onDeclineInvite,
  onSettleWithPerson: _onSettleWithPerson,
  onRemindSent: _onRemindSent,
  onNotificationClick,
  notificationCount = 0,
  onQuickAddExpense,
  onQuickSettle,
  onQuickScan,
  onQuickRequest,
}: PotsHomeProps) {
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();
  const [balancesVisible, setBalancesVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [sortBy, setSortBy] = useState<string>("recent");

  // Task 3: Read pots from Data Layer (if flag enabled) with fallback
  const preferDLReads = shouldPreferDLReads();
  // Use paginated hook
  const { pots: dlPots, loading: potsLoading, hasMore, loadMore, summaries } = usePots(10); // Page size 10
  const { user } = useAuth();
  const summaryUserId = user?.id ?? 'owner';

  // Transform Data Layer pots to potSummaries format
  const transformPotToSummary = useMemo(() => {
    return (pot: DataLayerPot, summary?: { totalExpenses: number; myExpenses: number; myShare: number }): Pot => {
      const fallbackMyExpenses = pot.expenses
        .filter((e) => e.paidBy === summaryUserId)
        .reduce((sum, e) => sum + e.amount, 0);

      const fallbackTotalExpenses = pot.expenses.reduce(
        (sum, e) => sum + e.amount,
        0,
      );

      const fallbackMyShare = pot.expenses.reduce((sum, e) => {
        const split = (e.split || []).find(
          (s) => s.memberId === summaryUserId,
        );
        return sum + (split?.amount || 0);
      }, 0);

      const myExpenses = summary?.myExpenses ?? fallbackMyExpenses;
      const totalExpenses = summary?.totalExpenses ?? fallbackTotalExpenses;
      const myShare = summary?.myShare ?? fallbackMyShare;
      const net = myExpenses - myShare;

      return {
        id: pot.id,
        name: pot.name,
        type: pot.type,
        baseCurrency: pot.baseCurrency,
        myExpenses,
        totalExpenses,
        net,
        budget: pot.budget ?? undefined,
        budgetEnabled: pot.budgetEnabled,
        totalPooled: pot.totalPooled,
        yieldRate: pot.yieldRate,
        chapterMode: pot.chapterMode,
        dotChapter: pot.dotChapter,
      };
    };
  }, [summaryUserId]);

  // Task 3: Determine which pots to use (Data Layer or fallback based on flag)
  const pots = useMemo(() => {
    // If flag is on, prefer DL reads; otherwise prefer props (current behavior)
    if (preferDLReads) {
      // Prefer DL reads when flag is on
      if (dlPots.length > 0) {
        try {
          const transformed = dlPots
            .filter(p => !p.archived)
            .map((pot) => transformPotToSummary(pot, summaries[pot.id]));
          return transformed;
        } catch (error) {
          warnDev('[DataLayer] Read failed, using UI state fallback', error);
          return potsProp;
        }
      }
      // DL empty/loading but flag is on - still prefer DL (will show empty until loaded)
      return [];
    } else {
      // Flag is off - use existing behavior (prefer props, use DL if props empty)
      if (dlPots.length > 0 && potsProp.length === 0) {
        try {
          const transformed = dlPots
            .filter(p => !p.archived)
            .map((pot) => transformPotToSummary(pot, summaries[pot.id]));
          return transformed;
        } catch (error) {
          warnDev('[DataLayer] Read failed, using UI state fallback', error);
          return potsProp;
        }
      }
      return potsProp;
    }
  }, [dlPots, potsProp, transformPotToSummary, preferDLReads, summaries]);


  const sortOptions: SortOption[] = [
    { id: "recent", label: "Recent activity" },
    { id: "name-asc", label: "Alphabetically (A-Z)" },
    { id: "name-desc", label: "Alphabetically (Z-A)" },
    { id: "balance-high", label: "Balance (high to low)" },
    { id: "balance-low", label: "Balance (low to high)" },
  ];

  // Calculate summary from all pots
  const youOweTotal = youOwe.reduce((sum, p) => sum + p.totalAmount, 0);
  const owedToYouTotal = owedToYou.reduce((sum, p) => sum + p.totalAmount, 0);
  const netTotal = owedToYouTotal - youOweTotal;

  // Local currency formatter; keep lightweight and consistent across dashboard
  const formatCurrency = (amount: number, withSign: boolean = false): string => {
    const absoluteAmount = Math.abs(amount);
    const sign = withSign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : '';
    return `${sign}$${absoluteAmount.toFixed(2)}`;
  };

  // Currency-aware formatter for pot-level amounts
  const formatPotAmount = (amount: number, currency?: string, withSign: boolean = false): string => {
    const absoluteAmount = Math.abs(amount);
    const sign = withSign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : '';
    if (currency === 'DOT') {
      return `${sign}${absoluteAmount.toFixed(6)} DOT`;
    }
    return `${sign}$${absoluteAmount.toFixed(2)}`;
  };

  // Filter and sort pots
  const filteredPots = useMemo(() => {
    let filtered = pots.filter(pot =>
      pot.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    switch (sortBy) {
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "balance-high":
        filtered.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
        break;
      case "balance-low":
        filtered.sort((a, b) => Math.abs(a.net) - Math.abs(b.net));
        break;
      case "recent":
      default:
        // Keep original order (most recent first)
        break;
    }

    return filtered;
  }, [pots, searchQuery, sortBy]);

  return (
    <div
      className={`flex flex-col h-full pb-[68px] ${isPSA ? '' : 'bg-background'}`}
      style={isPSA ? psaStyles.background : undefined}
    >
      {/* Unified Header */}
      <div className={`${isPSA ? '' : 'bg-background'} border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10`}
        style={isPSA ? { background: 'transparent' } : undefined}
      >
        <h1 className="text-screen-title">Pots</h1>
        <div className="flex items-center gap-2">
          {/* Account Menu - unified wallet connection */}
          <AccountMenu />

          {/* Notification bell */}
          {onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className="relative p-1.5 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
            >
              <Bell className="w-4 h-4 text-foreground" />
              {notificationCount > 0 && (
                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-micro text-primary-foreground">{notificationCount}</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">

          {/* Wallet Balance Banner - Shows when connected */}
          <WalletBanner />

          {/* Balance Summary with Privacy Toggle */}
          <div
            className={isPSA ? `${psaClasses.card} p-4 transition-shadow duration-200` : 'card p-4 transition-shadow duration-200'}
            style={isPSA ? psaStyles.card : undefined}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-section" style={{ fontWeight: 500 }}>Totals across all pots</h3>
              <button
                onClick={() => setBalancesVisible(!balancesVisible)}
                className="p-1 hover:bg-muted/30 rounded-lg transition-colors"
              >
                {balancesVisible ? (
                  <Eye className="w-4 h-4 text-secondary" />
                ) : (
                  <EyeOff className="w-4 h-4 text-secondary" />
                )}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-micro text-secondary mb-1">You owe</p>
                <p
                  className="text-[22px] tabular-nums"
                  style={{
                    fontWeight: 700,
                    color: balancesVisible && youOweTotal > 0 ? 'var(--ink)' : 'var(--ink)'
                  }}
                >
                  {balancesVisible ? formatCurrency(youOweTotal) : "•••"}
                </p>
              </div>
              <div>
                <p className="text-micro text-secondary mb-1">Owed to you</p>
                <p
                  className="text-[22px] tabular-nums"
                  style={{
                    fontWeight: 700,
                    color: balancesVisible && owedToYouTotal > 0 ? 'var(--success)' : 'var(--ink)'
                  }}
                >
                  {balancesVisible ? formatCurrency(owedToYouTotal) : "•••"}
                </p>
              </div>
              <div>
                <p className="text-micro text-secondary mb-1">Net</p>
                <p
                  className="text-[24px] tabular-nums"
                  style={{
                    fontWeight: 700,
                    color: balancesVisible
                      ? (netTotal >= 0 ? 'var(--money)' : 'var(--ink)')
                      : 'var(--ink)'
                  }}
                >
                  {balancesVisible ? formatCurrency(netTotal, true) : "•••"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-2">
            {/* Add Expense - Primary Action */}
            <button
              aria-label="Add expense"
              onClick={() => onQuickAddExpense?.(pots)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 ${isPSA ? '' : ''}`}
              style={isPSA ? psaStyles.pinkAccentButton : {
                background: 'var(--accent)',
                boxShadow: '0 2px 8px rgba(230, 0, 122, 0.25)'
              }}
              onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.pinkAccentButtonHover) : undefined}
              onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.pinkAccentButton) : undefined}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: isPSA ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)' }}
              >
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <span className="text-caption text-white" style={{ fontWeight: 500 }}>Add</span>
            </button>

            {/* Settle - Secondary */}
            <button
              aria-label="Settle up"
              onClick={onQuickSettle}
              className={isPSA ? `flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 ${psaClasses.card}` : 'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card hover:shadow-[var(--shadow-fab)]'}
              style={isPSA ? psaStyles.card : undefined}
              onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
              onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(142, 142, 147, 0.1)' }}
              >
                <ArrowLeftRight className="w-5 h-5" style={{ color: 'var(--ink)' }} />
              </div>
              <span className="text-caption text-foreground">Settle</span>
            </button>

            {/* Scan QR - Tertiary */}
            <button
              aria-label="Scan QR code"
              onClick={onQuickScan}
              className={isPSA ? `flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 ${psaClasses.card}` : 'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card hover:shadow-[var(--shadow-fab)]'}
              style={isPSA ? psaStyles.card : undefined}
              onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
              onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(142, 142, 147, 0.1)' }}
              >
                <QrCode className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <span className="text-caption text-secondary">Scan</span>
            </button>

            {/* Request - Tertiary */}
            <button
              aria-label="Request payment"
              onClick={onQuickRequest}
              className={isPSA ? `flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 ${psaClasses.card}` : 'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card hover:shadow-[var(--shadow-fab)]'}
              style={isPSA ? psaStyles.card : undefined}
              onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
              onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(142, 142, 147, 0.1)' }}
              >
                <Send className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <span className="text-caption text-secondary">Request</span>
            </button>
          </div>

          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className={isPSA ? `${psaClasses.card} p-3 flex items-center justify-between gap-3` : 'card p-3 flex items-center justify-between gap-3'}
                  style={isPSA ? psaStyles.card : undefined}
                >
                  <div>
                    <p className="text-body" style={{ fontWeight: 500 }}>
                      {invite.pot_name ? `Invite to "${invite.pot_name}"` : 'Pot invite'}
                    </p>
                    <p className="text-caption text-secondary">
                      Accept to join.{invite.expires_at ? ` Expires ${new Date(invite.expires_at).toLocaleDateString()}.` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeclineInvite?.(invite.token)}
                      className="px-3 py-2 rounded-lg text-caption text-secondary hover:text-foreground hover:bg-muted/10 transition-all duration-200 active:scale-95"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => onAcceptInvite?.(invite.token)}
                      className="px-3 py-2 rounded-lg text-caption text-white transition-all duration-200 active:scale-95"
                      style={{ background: 'var(--accent)' }}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search bar (when multiple pots) */}
          {pots.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pots…"
                className="w-full pl-10 pr-3 py-2.5 input-field text-body placeholder:text-secondary focus:outline-none focus-ring-pink"
              />
            </div>
          )}

          {/* Pots Section */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-label text-secondary">
                Your pots {pots.length > 0 && <span className="ml-1">{pots.length}</span>}
              </h3>
              <div className="flex items-center gap-2">
                {pots.length > 0 && (
                  <button
                    onClick={() => setShowSortSheet(true)}
                    className="p-1.5 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
                  >
                    <ListFilter className="w-4 h-4 text-secondary" />
                  </button>
                )}
                <button
                  onClick={onCreatePot}
                  className="flex items-center gap-1 px-3 py-1.5 card rounded-lg text-caption text-secondary hover:text-foreground hover:bg-muted/10 transition-all duration-200 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {potsLoading && filteredPots.length === 0 ? (
                <div className="space-y-3 pt-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 card space-y-3">
                      <div className="flex justify-between">
                        <Skeleton height={20} width="60%" />
                        <Skeleton height={20} width="20%" />
                      </div>
                      <Skeleton height={14} width="40%" />
                    </div>
                  ))}
                </div>
              ) : filteredPots.length === 0 ? (
                <div className="pt-8">
                  <EmptyState
                    icon={Receipt}
                    message="No pots yet"
                    description="Create your first pot to start tracking expenses"
                    primaryAction={{
                      label: "Create Pot",
                      onClick: onCreatePot
                    }}
                  />
                </div>
              ) : (
                <>
                  {filteredPots.map((pot) => {
                    const budgetPercentage = pot.budgetEnabled && pot.budget
                      ? Math.min((pot.totalExpenses / pot.budget) * 100, 100)
                      : 0;
                    const isOverBudget = pot.budgetEnabled && pot.budget
                      ? pot.totalExpenses > pot.budget
                      : false;
                    const chapterStatus = pot.dotChapter ? buildDotStatus(pot.dotChapter) : null;
                    const chapterHandled = pot.dotChapter
                      ? pot.dotChapter.obligations.filter((item: { state: string }) => item.state === 'confirmed' || item.state === 'exception_recorded').length
                      : 0;
                    const chapterTotal = pot.dotChapter?.obligations.length ?? 0;
                    const chapterExpected = pot.dotChapter ? chapterAmount(pot.dotChapter) : 0;
                    const chapterConfirmed = pot.dotChapter ? chapterAmount(pot.dotChapter, ['confirmed']) : 0;
                    const chapterPrompt = pot.dotChapter ? formatChapterCardPrompt(pot.dotChapter) : null;
                    const chapterCurrency = pot.dotChapter?.obligations[0]?.currency ?? pot.baseCurrency;
                    const chapterLabel =
                      pot.chapterMode === 'shared_expense'
                        ? 'Group expense'
                        : pot.chapterMode === 'savings_circle'
                        ? 'Savings circle'
                        : pot.chapterMode === 'emergency_pot'
                          ? 'Emergency pot'
                          : pot.chapterMode === 'community_fund'
                            ? 'Community fund'
                            : null;

                    return (
                      <button
                        key={pot.id}
                        aria-label={`Open ${pot.name} pot`}
                        onClick={() => onPotClick?.(pot.id)}
                        className={isPSA ? `w-full p-4 ${psaClasses.card} text-left transition-all duration-200` : 'w-full p-4 card text-left card-hover-lift hover:shadow-[var(--shadow-fab)] transition-all duration-200'}
                        style={isPSA ? psaStyles.card : undefined}
                        onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
                        onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {pot.type === "savings" && !pot.chapterMode && (
                              <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
                            )}
                            <p className="text-body flex-1 truncate" style={{ fontWeight: 500 }}>{pot.name}</p>
                          </div>
                          {chapterLabel && (
                            <span className="px-2 py-0.5 rounded text-caption whitespace-nowrap flex-shrink-0" style={{ background: 'var(--accent-pink-soft)', color: 'var(--accent)' }}>
                              {chapterLabel}
                            </span>
                          )}
                          {!chapterLabel && pot.type === "savings" && (
                            <span className="px-2 py-0.5 rounded text-caption whitespace-nowrap flex-shrink-0" style={{ background: 'rgba(25, 195, 125, 0.15)', color: 'var(--success)' }}>
                              Record only
                            </span>
                          )}
                        </div>
                        {balancesVisible && (
                          <div className={pot.chapterMode && chapterStatus ? 'space-y-3' : 'flex items-center justify-between'}>
                            {pot.chapterMode && chapterStatus ? (
                              <div className="space-y-2">
                                <div>
                                  <p className="text-micro text-secondary mb-0.5">Next up</p>
                                  <p className="text-[24px] leading-tight" style={{ fontWeight: 700, color: chapterStatus.closeoutReadiness === 'ready' ? 'var(--money)' : 'var(--ink)' }}>
                                    {chapterPrompt}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-lg bg-muted/10 p-2">
                                    <p className="text-micro text-secondary">Expected</p>
                                    <p className="text-body tabular-nums" style={{ fontWeight: 600 }}>
                                      {formatPotAmount(chapterExpected, chapterCurrency)}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-muted/10 p-2">
                                    <p className="text-micro text-secondary">Confirmed</p>
                                    <p className="text-body tabular-nums" style={{ fontWeight: 600 }}>
                                      {formatPotAmount(chapterConfirmed, chapterCurrency)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : pot.type === "savings" ? (
                              <>
                                <div>
                                  <p className="text-micro text-secondary mb-0.5">Your recorded</p>
                                  <p className="text-[18px] tabular-nums" style={{ fontWeight: 600 }}>
                                    {formatPotAmount(pot.myExpenses, pot.baseCurrency)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-micro text-secondary mb-0.5">Recorded total</p>
                                  <p className="text-[24px] tabular-nums" style={{ fontWeight: 700, color: 'var(--money)' }}>
                                    {formatPotAmount(pot.totalPooled ?? pot.totalExpenses, pot.baseCurrency)}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <p className="text-micro text-secondary mb-0.5">Total expenses</p>
                                  <p className="text-[18px] tabular-nums" style={{ fontWeight: 600 }}>
                                    {formatPotAmount(pot.totalExpenses, pot.baseCurrency)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-micro text-secondary mb-0.5">Your balance</p>
                                  <p
                                    className="text-[24px] tabular-nums"
                                    style={{
                                      fontWeight: 700,
                                      color: Math.abs(pot.net) < (pot.baseCurrency === 'DOT' ? 0.000001 : 0.01)
                                        ? 'var(--muted)'
                                        : pot.net >= 0
                                          ? 'var(--money)'
                                          : 'var(--ink)'
                                    }}
                                  >
                                    {Math.abs(pot.net) < (pot.baseCurrency === 'DOT' ? 0.000001 : 0.01)
                                      ? formatPotAmount(0, pot.baseCurrency)
                                      : formatPotAmount(pot.net, pot.baseCurrency, true)
                                    }
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {pot.chapterMode && chapterStatus && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-micro text-secondary">{chapterHandled}/{chapterTotal} handled</span>
                              <span className="text-micro text-foreground tabular-nums">
                                {chapterStatus.blockers.length} open
                              </span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all duration-300 bg-primary"
                                style={{ width: `${chapterTotal ? (chapterHandled / chapterTotal) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {!pot.chapterMode && pot.budgetEnabled && pot.budget && pot.type !== "savings" && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-micro text-secondary">Budget</span>
                              <span className="text-micro text-foreground tabular-nums">
                                <span className={isOverBudget ? "text-destructive" : ""}>
                                  {formatPotAmount(pot.totalExpenses, pot.baseCurrency)}
                                </span>
                                <span className="text-secondary"> / {formatPotAmount(pot.budget || 0, pot.baseCurrency)}</span>
                              </span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${isOverBudget ? "bg-destructive" : "bg-primary"
                                  }`}
                                style={{ width: `${budgetPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {!pot.chapterMode && pot.type === "savings" && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-micro" style={{ color: 'var(--text-secondary)' }}>Shared record</span>
                              <span className="text-micro text-foreground tabular-nums">
                                {formatPotAmount(pot.totalPooled ?? 0, pot.baseCurrency)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-micro" style={{ color: 'var(--text-secondary)' }}>Money movement</span>
                              <span className="text-micro text-foreground">
                                Outside app
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Load More Button */}
                  {hasMore && preferDLReads && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => loadMore()}
                        disabled={potsLoading}
                        className="px-4 py-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-caption font-medium transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                      >
                        {potsLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load older pots'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sort/Filter Sheet */}
      <SortFilterSheet
        isOpen={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        options={sortOptions}
        selectedId={sortBy}
        onSelect={setSortBy}
      />

    </div>
  );
}
