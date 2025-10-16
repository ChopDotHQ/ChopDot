import { User, Bell, HandCoins, ListFilter, Wallet } from "lucide-react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { WalletBanner } from "../WalletBanner";
import { TrustIndicator } from "../TrustIndicator";
import { EmptyState } from "../EmptyState";
import { SortFilterSheet, SortOption } from "../SortFilterSheet";
import { useState, useMemo } from "react";
//
import { PeopleView } from "./PeopleView";

interface DebtBreakdown {
  potName: string;
  amount: number;
}

interface PersonDebt {
  id: string;
  name: string;
  totalAmount: number;
  breakdown: DebtBreakdown[];
  trustScore?: number; // 3-10
  paymentPreference?: string; // e.g., "Bank", "PayPal", "TWINT", "DOT"
}

interface Person {
  id: string;
  name: string;
  balance: number;
  trustScore: number;
  paymentPreference?: string;
  potCount?: number;
}

interface PeopleHomeProps {
  youOwe: PersonDebt[];
  owedToYou: PersonDebt[];
  people: Person[];
  walletConnected: boolean;
  onConnectWallet: () => void;
  onSettle: (personId: string) => void;
  onRemindSent?: () => void;
  onPersonClick?: (person: Person) => void;
  onNotificationClick?: () => void;
  onWalletClick?: () => void;
  notificationCount?: number;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export function PeopleHome({
  youOwe,
  owedToYou,
  people,
  walletConnected,
  onConnectWallet,
  onSettle,
  onRemindSent: _onRemindSent,
  onPersonClick,
  onNotificationClick,
  onWalletClick,
  notificationCount = 0,
  isDarkMode = false,
  onToggleTheme,
}: PeopleHomeProps) {
  const [remindOverlayOpen, setRemindOverlayOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonDebt | null>(null);
  void remindOverlayOpen; void selectedPerson; void onToggleTheme; void isDarkMode;
  const [activeTab, setActiveTab] = useState<"people" | "balances">("people"); // FLIPPED DEFAULT
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [sortBy, setSortBy] = useState<string>("amount-high");

  const sortOptions: SortOption[] = [
    { id: "amount-high", label: "Amount (high to low)" },
    { id: "amount-low", label: "Amount (low to high)" },
    { id: "name-asc", label: "Name (A-Z)" },
    { id: "name-desc", label: "Name (Z-A)" },
  ];

  // Calculate totals
  const totalYouOwe = youOwe.reduce((sum, person) => sum + person.totalAmount, 0);
  const totalOwedToYou = owedToYou.reduce((sum, person) => sum + person.totalAmount, 0);
  const net = totalOwedToYou - totalYouOwe;

  // Sort settlements
  const sortedYouOwe = useMemo(() => {
    const sorted = [...youOwe];
    switch (sortBy) {
      case "amount-low":
        sorted.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "amount-high":
      default:
        sorted.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
    }
    return sorted;
  }, [youOwe, sortBy]);

  const sortedOwedToYou = useMemo(() => {
    const sorted = [...owedToYou];
    switch (sortBy) {
      case "amount-low":
        sorted.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "amount-high":
      default:
        sorted.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
    }
    return sorted;
  }, [owedToYou, sortBy]);

  const handleRemind = (person: PersonDebt) => {
    setSelectedPerson(person);
    setRemindOverlayOpen(true);
  };

  const renderPersonRow = (person: PersonDebt, action: "settle" | "remind") => {
    const breakdownText = person.breakdown
      .map((b) => `${b.potName} ${b.amount}`)
      .join(" • ");

    return (
      <div
        key={person.id}
        className="p-2 glass-sm rounded-lg"
      >
        <button
          onClick={() => onPersonClick?.({ 
            id: person.id, 
            name: person.name, 
            balance: person.totalAmount,
            trustScore: person.trustScore || 95,
            paymentPreference: person.paymentPreference,
            potCount: person.breakdown.length,
          })}
          className="w-full flex items-start justify-between gap-2 mb-1.5 text-left hover:opacity-70 active:opacity-50 transition-opacity"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[13px]" style={{ fontWeight: 500 }}>{person.name}</p>
                {person.trustScore && (
                  <TrustIndicator score={person.trustScore} />
                )}
                {person.paymentPreference && (
                  <span className="text-[9px] px-1 py-0.5 bg-muted text-muted-foreground rounded">
                    {person.paymentPreference}
                  </span>
                )}
              </div>
              {breakdownText && (
                <p className="text-[10px] text-secondary truncate">
                  {breakdownText}
                </p>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p 
              className="text-[13px] tabular-nums" 
              style={{ 
                fontWeight: 500,
                color: action === 'settle' ? 'var(--foreground)' : 'var(--money)'
              }}
            >
              {action === 'settle' ? '-' : '+'}${person.totalAmount.toFixed(2)}
            </p>
          </div>
        </button>
        <div className="flex gap-1.5">
          {action === "settle" ? (
            <PrimaryButton
              onClick={() => onSettle(person.id)}
              fullWidth
            >
              Settle
            </PrimaryButton>
          ) : (
            <SecondaryButton
              onClick={() => handleRemind(person)}
              fullWidth
            >
              Remind
            </SecondaryButton>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="h-full pb-[68px] overflow-auto">
        {/* Unified Header */}
        <div className="bg-background border-b border-border sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-screen-title">People</h1>
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
          {/* Subtabs - All tab + Balances tab */}
          <div className="px-4 pb-3 flex flex-nowrap items-center gap-2">
            <button
              onClick={() => setActiveTab("people")}
              style={{
                backgroundColor: activeTab === "people" ? "var(--ink)" : "var(--card)",
                color: activeTab === "people" ? "var(--bg)" : "var(--ink)",
              }}
              className="px-3 py-1.5 rounded-lg text-[13px] transition-colors font-medium flex-shrink-0"
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("balances")}
              style={{
                backgroundColor: activeTab === "balances" ? "var(--ink)" : "var(--card)",
                color: activeTab === "balances" ? "var(--bg)" : "var(--ink)",
              }}
              className="px-3 py-1.5 rounded-lg text-[13px] transition-colors font-medium flex-shrink-0"
            >
              Balances
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "people" ? (
          <PeopleView
            people={people}
            onPersonClick={(person) => {
              onPersonClick?.(person);
            }}
            onSettle={(personId) => {
              onSettle(personId);
            }}
          />
        ) : (
          <div className="p-3 space-y-3">
            {/* Wallet Banner */}
            <WalletBanner
              isConnected={walletConnected}
              onConnect={onConnectWallet}
            />

            {/* Overview Chips */}
            <div className="card p-3">
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <div>
                  <span className="text-secondary">You owe </span>
                  <span 
                    className="tabular-nums" 
                    style={{ 
                      fontWeight: 500,
                      color: totalYouOwe > 0 ? 'var(--foreground)' : 'var(--foreground)' 
                    }}
                  >
                    ${totalYouOwe.toFixed(0)}
                  </span>
                </div>
                <span className="text-secondary">•</span>
                <div>
                  <span className="text-secondary">Owed to you </span>
                  <span 
                    className="tabular-nums" 
                    style={{ 
                      fontWeight: 500,
                      color: totalOwedToYou > 0 ? 'var(--success)' : 'var(--foreground)' 
                    }}
                  >
                    ${totalOwedToYou.toFixed(0)}
                  </span>
                </div>
                <span className="text-secondary">•</span>
                <div>
                  <span className="text-secondary">Net </span>
                  <span 
                    className="tabular-nums" 
                    style={{ 
                      fontWeight: 500,
                      color: net >= 0 ? 'var(--money)' : 'var(--foreground)' 
                    }}
                  >
                    {net >= 0 ? '+' : ''}${Math.abs(net).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* People You Owe */}
            {sortedYouOwe.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-caption text-secondary">
                    People you owe
                  </p>
                  {(sortedYouOwe.length > 1 || sortedOwedToYou.length > 0) && (
                    <button
                      onClick={() => setShowSortSheet(true)}
                      className="p-1 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
                    >
                      <ListFilter className="w-3.5 h-3.5 text-secondary" />
                    </button>
                  )}
                </div>
                {sortedYouOwe.map((person) => renderPersonRow(person, "settle"))}
              </div>
            )}

            {/* People Who Owe You */}
            {sortedOwedToYou.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-caption text-secondary px-1">
                  People who owe you
                </p>
                {sortedOwedToYou.map((person) => renderPersonRow(person, "remind"))}
              </div>
            )}

            {/* Empty States */}
            {sortedYouOwe.length === 0 && sortedOwedToYou.length === 0 && (
              <div className="pt-8">
                <EmptyState
                  icon={HandCoins}
                  message="You're all square — no outstanding balances."
                />
              </div>
            )}

            {sortedYouOwe.length === 0 && sortedOwedToYou.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-caption text-secondary px-1">
                  People you owe
                </p>
                <EmptyState
                  icon={HandCoins}
                  message="You don't owe anyone right now."
                />
              </div>
            )}

            {sortedYouOwe.length > 0 && sortedOwedToYou.length === 0 && (
              <div className="space-y-1.5">
                <p className="text-caption text-secondary px-1">
                  People who owe you
                </p>
                <EmptyState
                  icon={HandCoins}
                  message="No one owes you right now."
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sort/Filter Sheet */}
      <SortFilterSheet
        isOpen={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        options={sortOptions}
        selectedId={sortBy}
        onSelect={setSortBy}
      />
    </>
  );
}
