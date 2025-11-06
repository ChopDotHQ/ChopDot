import { ChevronRight, Bell, AlertCircle, ChevronDown, ChevronUp, Check, DollarSign, TrendingUp, UserPlus, Eye, EyeOff, X, RefreshCw, ListFilter, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import { SettleSheet } from "../SettleSheet";
import { SortFilterSheet, SortOption } from "../SortFilterSheet";
import { usePullToRefresh } from "../../utils/usePullToRefresh";
import { triggerHaptic } from "../../utils/haptics";
import { AccountMenu } from "../AccountMenu";

interface ActivityItem {
  id: string;
  type: "expense" | "settlement" | "attestation" | "member";
  timestamp: string;
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  avatarName?: string;
}

//

interface ActivityHomeProps {
  totalOwed: number;
  totalOwing: number;
  activities: ActivityItem[];
  pendingExpenses: Array<{
    id: string;
    memo: string;
    amount: number;
    paidBy: string;
    potName: string;
  }>;
  topPersonToSettle?: {
    id: string;
    name: string;
    amount: number;
    preferredMethod: string;
    pots: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
  };
  hasPendingAttestations: boolean;
  onActivityClick: (activity: ActivityItem) => void;
  onNotificationClick: () => void;
  onWalletClick: () => void;
  walletConnected?: boolean;
  onSettleClick?: (personId: string, method: "Bank" | "PayPal" | "DOT" | "Cash") => void;
  onConfirmExpense?: (expenseId: string) => void;
  onRefresh?: () => Promise<void>;
  notificationCount?: number;
}

export function ActivityHome({ 
  totalOwed,
  totalOwing,
  activities,
  pendingExpenses,
  topPersonToSettle,
  hasPendingAttestations,
  onActivityClick,
  onNotificationClick,
  onWalletClick,
  walletConnected = false,
  onSettleClick,
  onConfirmExpense,
  onRefresh,
  notificationCount = 0,
}: ActivityHomeProps) {
  const [filter, setFilter] = useState<"all" | "expenses" | "settlements" | "attestations">("all");
  const [attestationsExpanded, setAttestationsExpanded] = useState(false);
  const [showSettleSheet, setShowSettleSheet] = useState(false);
  const [balancesVisible, setBalancesVisible] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [sortBy, setSortBy] = useState<string>("date-recent");

  const sortOptions: SortOption[] = [
    { id: "date-recent", label: "Date (recent first)" },
    { id: "date-oldest", label: "Date (oldest first)" },
    { id: "amount-high", label: "Amount (high to low)" },
    { id: "amount-low", label: "Amount (low to high)" },
    { id: "type", label: "Group by type" },
  ];

  // Lightweight currency formatter to keep UI consistent with PotsHome
  const formatCurrency = (amount: number): string => {
    const absoluteAmount = Math.abs(amount);
    return `$${absoluteAmount.toFixed(0)}`;
  };

  // Pull-to-refresh
  const { scrollContainerRef, pullDistance, shouldTrigger } = usePullToRefresh({
    onRefresh: async () => {
      if (onRefresh) {
        await onRefresh();
      }
    },
    threshold: 80,
    enabled: !!onRefresh,
  });

  const filteredActivities = useMemo(() => {
    let filtered = activities.filter((activity) => {
      if (filter === "all") return true;
      if (filter === "expenses") return activity.type === "expense";
      if (filter === "settlements") return activity.type === "settlement";
      if (filter === "attestations") return activity.type === "attestation";
      return true;
    });

    // Sort
    switch (sortBy) {
      case "date-oldest":
        filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case "amount-high":
        filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        break;
      case "amount-low":
        filtered.sort((a, b) => (a.amount || 0) - (b.amount || 0));
        break;
      case "type":
        filtered.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "date-recent":
      default:
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
    }

    return filtered;
  }, [activities, filter, sortBy]);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "expense":
        return <DollarSign className="w-4 h-4 text-background" />;
      case "settlement":
        return <TrendingUp className="w-4 h-4 text-white" />;
      case "attestation":
        return <Check className="w-4 h-4 text-white" />;
      case "member":
        return <UserPlus className="w-4 h-4 text-foreground" />;
    }
  };

  return (
    <div className="flex flex-col h-full pb-[68px] bg-background">
      {/* Header with wallet and notification icons */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-screen-title">Activity</h1>
        <div className="flex items-center gap-2">
          {/* Pending confirmations badge */}
          {hasPendingAttestations && (
            <div className="px-2 py-1 rounded-md text-[11px]" style={{ background: 'var(--accent-pink-soft)', color: 'var(--accent)' }}>
              {pendingExpenses.length} pending
            </div>
          )}
          {/* Account Menu - unified wallet connection */}
          <AccountMenu />
          
          {/* Notification bell */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNotificationClick();
            }}
            className="relative p-1.5 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
          >
            <Bell className="w-4 h-4 text-foreground" />
            {notificationCount > 0 && (
              <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-micro text-primary-foreground">{notificationCount}</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex justify-center items-center transition-all duration-200"
          style={{ 
            height: `${pullDistance}px`,
            opacity: Math.min(pullDistance / 80, 1),
          }}
        >
          <RefreshCw 
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              shouldTrigger ? 'rotate-180' : ''
            }`}
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      )}

      {/* Main Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
      >
        <div className="p-4 space-y-3">
          {/* Balance Overview Card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-section" style={{ fontWeight: 500 }}>Your balance</h3>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-caption text-secondary mb-1">You owe</p>
                <p 
                  className="text-[20px] tabular-nums"
                  style={{ 
                    fontWeight: 600,
                    color: balancesVisible && totalOwing > 0 ? 'var(--foreground)' : 'var(--foreground)'
                  }}
                >
                  {balancesVisible ? formatCurrency(totalOwing) : "•••"}
                </p>
              </div>
              <div>
                <p className="text-caption text-secondary mb-1">Owed to you</p>
                <p 
                  className="text-[20px] tabular-nums" 
                  style={{ 
                    fontWeight: 600,
                    color: balancesVisible && totalOwed > 0 ? 'var(--success)' : 'var(--foreground)'
                  }}
                >
                  {balancesVisible ? formatCurrency(totalOwed) : "•••"}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Attestations Banner */}
          {hasPendingAttestations && showBanner && (
            <div className="card p-3 bg-muted/10 border border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--foreground)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-body mb-1">
                    {pendingExpenses.length} expense{pendingExpenses.length > 1 ? 's' : ''} need confirmation
                  </p>
                  <button
                    onClick={() => setAttestationsExpanded(!attestationsExpanded)}
                    className="text-caption flex items-center gap-1"
                    style={{ color: 'var(--accent)' }}
                  >
                    {attestationsExpanded ? "Hide" : "Review"}
                    {attestationsExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="p-1 hover:bg-muted/30 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Expanded pending expenses */}
              {attestationsExpanded && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {pendingExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-2 bg-card rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-body truncate">{expense.memo}</p>
                        <p className="text-caption text-muted-foreground">
                          {expense.potName} • {expense.paidBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span className="text-body tabular-nums">${expense.amount.toFixed(2)}</span>
                        <button
                          onClick={() => onConfirmExpense?.(expense.id)}
                          className="px-2 py-1 text-caption rounded-lg transition-colors"
                          style={{ background: 'var(--accent-pink-soft)', color: 'var(--accent)' }}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Person to Settle (if available) */}
          {topPersonToSettle && (
            <button
              onClick={() => setShowSettleSheet(true)}
              className="w-full card p-4 text-left hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--success)' }}>
                    <span className="text-body">💰</span>
                  </div>
                  <div>
                    <p className="text-body">Settle with {topPersonToSettle.name}</p>
                    <p className="text-caption text-muted-foreground">
                      via {topPersonToSettle.preferredMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body tabular-nums">${topPersonToSettle.amount.toFixed(2)}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              </div>
            </button>
          )}

          {/* Activity Section Header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-label" style={{ color: 'var(--text-secondary)' }}>
              Activity
            </h3>
            {activities.length > 0 && (
              <button
                onClick={() => setShowSortSheet(true)}
                className="p-1.5 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
              >
                <ListFilter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(["all", "expenses", "settlements", "attestations"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-caption whitespace-nowrap transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted/20"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Activity Feed */}
          <div className="space-y-2">
            <h3 className="text-label text-muted-foreground px-1">Recent activity</h3>
            {filteredActivities.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-body text-muted-foreground">No activity yet</p>
                <p className="text-caption text-muted-foreground mt-1">
                  Your expenses and settlements will appear here
                </p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => onActivityClick(activity)}
                  className="w-full card p-3 text-left hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor:
                          activity.type === "expense"
                            ? "var(--foreground)"
                            : activity.type === "settlement"
                              ? "var(--money)"
                              : activity.type === "attestation"
                                ? "var(--accent)"
                                : "var(--secondary)",
                      }}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body truncate">{activity.title}</p>
                      {activity.subtitle && (
                        <p className="text-caption text-muted-foreground truncate">
                          {activity.subtitle}
                        </p>
                      )}
                      <p className="text-micro text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {activity.amount && (
                      <span className="text-body tabular-nums flex-shrink-0">
                        ${activity.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settle Sheet */}
      {showSettleSheet && topPersonToSettle && (
        <SettleSheet
          personId={topPersonToSettle.id}
          personName={topPersonToSettle.name}
          amount={topPersonToSettle.amount}
          preferredMethod={topPersonToSettle.preferredMethod as any}
          pots={topPersonToSettle.pots}
          onClose={() => setShowSettleSheet(false)}
          onConfirm={(method: "Bank" | "PayPal" | "DOT" | "Cash") => {
            onSettleClick?.(topPersonToSettle.id, method);
            setShowSettleSheet(false);
          }}
          onReviewPending={() => {}}
          onViewHistory={() => {}}
        />
      )}

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
