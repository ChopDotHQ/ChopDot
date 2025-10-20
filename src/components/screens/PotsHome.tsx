import { Plus, Bell, TrendingUp, Search, Eye, EyeOff, ListFilter, Receipt, ArrowLeftRight, QrCode, Send, Wallet } from "lucide-react";
import { WalletBanner } from "../WalletBanner";
import { SortFilterSheet, SortOption } from "../SortFilterSheet";
import { useState, useMemo } from "react";

interface Pot {
  id: string;
  name: string;
  type?: "expense" | "savings";
  myExpenses: number;
  totalExpenses: number;
  net: number;
  budget?: number;
  budgetEnabled?: boolean;
  totalPooled?: number;
  yieldRate?: number;
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
  onSettleWithPerson?: (personId: string) => void;
  onRemindSent?: () => void;
  onNotificationClick?: () => void;
  onWalletClick?: () => void;
  walletConnected?: boolean;
  notificationCount?: number;
  onQuickAddExpense?: () => void;
  onQuickSettle?: () => void;
  onQuickScan?: () => void;
  onQuickRequest?: () => void;
}

export function PotsHome({ 
  pots = [], 
  youOwe = [],
  owedToYou = [],
  onCreatePot, 
  onPotClick,
  onSettleWithPerson: _onSettleWithPerson,
  onRemindSent: _onRemindSent,
  onNotificationClick,
  onWalletClick,
  walletConnected = false,
  notificationCount = 0,
  onQuickAddExpense,
  onQuickSettle,
  onQuickScan,
  onQuickRequest,
}: PotsHomeProps) {
  const [balancesVisible, setBalancesVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [sortBy, setSortBy] = useState<string>("recent");

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
    return `${sign}$${absoluteAmount.toFixed(0)}`;
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
    <div className="flex flex-col h-full pb-[68px] bg-background">
      {/* Unified Header */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-screen-title">Pots</h1>
        <div className="flex items-center gap-2">
          {/* Wallet icon */}
          {onWalletClick && (
            <button
              onClick={onWalletClick}
              className="relative p-1.5 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
            >
              <Wallet className="w-4 h-4 text-foreground" />
              {walletConnected && (
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
              )}
            </button>
          )}
          
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
          {/* Wallet Connection Banner */}
          {!walletConnected && (
            <WalletBanner
              isConnected={false}
              onConnect={() => onWalletClick && onWalletClick()}
            />
          )}

          {/* Balance Summary with Privacy Toggle */}
          <div className="card p-4">
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
                <p className="text-caption text-secondary mb-1">You owe</p>
                <p 
                  className="text-[20px] tabular-nums"
                  style={{ 
                    fontWeight: 600, 
                    color: balancesVisible && youOweTotal > 0 ? 'var(--foreground)' : 'var(--foreground)' 
                  }}
                >
                  {balancesVisible ? formatCurrency(youOweTotal) : "•••"}
                </p>
              </div>
              <div>
                <p className="text-caption text-secondary mb-1">Owed to you</p>
                <p 
                  className="text-[20px] tabular-nums"
                  style={{ 
                    fontWeight: 600, 
                    color: balancesVisible && owedToYouTotal > 0 ? 'var(--success)' : 'var(--foreground)' 
                  }}
                >
                  {balancesVisible ? formatCurrency(owedToYouTotal) : "•••"}
                </p>
              </div>
              <div>
                <p className="text-caption text-secondary mb-1">Net</p>
                <p 
                  className="text-[20px] tabular-nums"
                  style={{ 
                    fontWeight: 600, 
                    color: balancesVisible 
                      ? (netTotal >= 0 ? 'var(--money)' : 'var(--foreground)') 
                      : 'var(--foreground)' 
                  }}
                >
                  {balancesVisible ? formatCurrency(netTotal, true) : "•••"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-2">
            {/* Add Expense */}
            <button
              onClick={onQuickAddExpense}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card border border-border"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <span className="text-caption text-foreground">Add</span>
            </button>

            {/* Settle */}
            <button
              onClick={onQuickSettle}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card border border-border"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <ArrowLeftRight className="w-5 h-5 text-white" />
              </div>
              <span className="text-caption text-foreground">Settle</span>
            </button>

            {/* Scan QR */}
            <button
              onClick={onQuickScan}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card border border-border"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(142, 142, 147, 0.2)' }}
              >
                <QrCode className="w-5 h-5" style={{ color: 'var(--foreground)', opacity: 0.8 }} />
              </div>
              <span className="text-caption text-foreground">Scan</span>
            </button>

            {/* Request */}
            <button
              onClick={onQuickRequest}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card border border-border"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'var(--money)' }}
              >
                <Send className="w-5 h-5 text-white" />
              </div>
              <span className="text-caption text-foreground">Request</span>
            </button>
          </div>

          {/* Search bar (when multiple pots) */}
          {pots.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pots…"
                className="w-full pl-10 pr-3 py-2.5 input-field text-body placeholder:text-muted-foreground focus:outline-none focus-ring-pink"
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
              {filteredPots.map((pot) => {
                const budgetPercentage = pot.budgetEnabled && pot.budget 
                  ? Math.min((pot.totalExpenses / pot.budget) * 100, 100) 
                  : 0;
                const isOverBudget = pot.budgetEnabled && pot.budget 
                  ? pot.totalExpenses > pot.budget 
                  : false;
                
                return (
                  <button
                    key={pot.id}
                    onClick={() => onPotClick?.(pot.id)}
                    className="w-full p-3 card text-left hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {pot.type === "savings" && (
                          <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
                        )}
                        <p className="text-body flex-1" style={{ fontWeight: 500 }}>{pot.name}</p>
                      </div>
                      {pot.type === "savings" && pot.yieldRate && (
                        <span className="px-2 py-0.5 rounded text-caption whitespace-nowrap flex-shrink-0 tabular-nums" style={{ background: 'rgba(25, 195, 125, 0.15)', color: 'var(--success)' }}>
                          {pot.yieldRate.toFixed(1)}% APY
                        </span>
                      )}
                    </div>
                    {balancesVisible && (
                      <div className="flex items-center justify-between">
                        {pot.type === "savings" ? (
                          <>
                            <div>
                              <p className="text-caption text-secondary">Your contribution</p>
                              <p className="text-body tabular-nums" style={{ fontWeight: 500 }}>
                                ${pot.myExpenses.toFixed(0)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-caption text-secondary">Total pooled</p>
                              <p className="text-body tabular-nums" style={{ fontWeight: 500 }}>
                                ${pot.totalExpenses.toFixed(0)}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-caption text-secondary">Total expenses</p>
                              <p className="text-body tabular-nums" style={{ fontWeight: 500 }}>
                                ${pot.totalExpenses.toFixed(0)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-caption text-secondary">Your balance</p>
                              <p 
                                className="text-body tabular-nums" 
                                style={{ 
                                  fontWeight: 500,
                                  color: Math.abs(pot.net) < 0.01 
                                    ? 'var(--muted)' 
                                    : pot.net >= 0 
                                      ? 'var(--money)' 
                                      : 'var(--foreground)'
                                }}
                              >
                                {Math.abs(pot.net) < 0.01 
                                  ? 'Settled' 
                                  : `${pot.net >= 0 ? '+' : ''}${Math.abs(pot.net).toFixed(2)}`
                                }
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {pot.budgetEnabled && pot.budget && pot.type !== "savings" && (
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-micro text-secondary">Budget</span>
                          <span className="text-micro text-foreground tabular-nums">
                            <span className={isOverBudget ? "text-destructive" : ""}>
                              ${pot.totalExpenses}
                            </span>
                            <span className="text-secondary"> / ${pot.budget}</span>
                          </span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOverBudget ? "bg-destructive" : "bg-primary"
                            }`}
                            style={{ width: `${budgetPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {pot.type === "savings" && (
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-micro" style={{ color: 'var(--text-secondary)' }}>Total Pooled</span>
                          <span className="text-micro text-foreground tabular-nums">
                            ${pot.totalPooled}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-micro" style={{ color: 'var(--text-secondary)' }}>Yield Rate</span>
                          <span className="text-micro text-foreground tabular-nums">
                            ${pot.yieldRate}%
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
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