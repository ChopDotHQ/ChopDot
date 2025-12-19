import { User, Bell, HandCoins, ListFilter } from "lucide-react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { WalletBanner } from "../WalletBanner";
import { TrustIndicator } from "../TrustIndicator";
import { EmptyState } from "../EmptyState";
import { SortFilterSheet, SortOption } from "../SortFilterSheet";
import { useState, useMemo } from "react";
import { AccountMenu } from "../AccountMenu";
import { PeopleView } from "./PeopleView";
import { usePSAStyle } from "../../utils/usePSAStyle";

interface DebtBreakdown {
  potName: string;
  amount: number;
  currency?: string; // Currency for this breakdown item
}

interface PersonDebt {
  id: string;
  name: string;
  totalAmount: number;
  breakdown: DebtBreakdown[];
  trustScore?: number; // 3-10
  paymentPreference?: string; // e.g., "Bank", "PayPal", "TWINT", "DOT"
  address?: string; // Optional Polkadot wallet address
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
  onSettle,
  onRemindSent: _onRemindSent,
  onPersonClick,
  onNotificationClick,
  notificationCount = 0,
  isDarkMode = false,
  onToggleTheme,
}: PeopleHomeProps) {
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();
  const [remindOverlayOpen, setRemindOverlayOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonDebt | null>(null);
  void remindOverlayOpen; void selectedPerson; void onToggleTheme; void isDarkMode;
  const [activeTab, setActiveTab] = useState<"people" | "balances">("people"); // FLIPPED DEFAULT
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [sortBy, setSortBy] = useState<string>("amount-high");

  // Helper to format amounts based on currency
  const formatAmount = (amount: number, currency?: string): string => {
    const isDot = currency === 'DOT';
    const decimals = isDot ? 6 : 2;
    if (isDot) {
      return `${amount.toFixed(decimals)} DOT`;
    }
    return `$${amount.toFixed(decimals)}`;
  };

  // Helper to get display currency from person (use first breakdown currency or default to USD)
  const getDisplayCurrency = (person: PersonDebt): string => {
    if (person.breakdown.length > 0 && person.breakdown[0]?.currency) {
      return person.breakdown[0].currency;
    }
    return 'USD';
  };

  const sortOptions: SortOption[] = [
    { id: "amount-high", label: "Amount (high to low)" },
    { id: "amount-low", label: "Amount (low to high)" },
    { id: "name-asc", label: "Name (A-Z)" },
    { id: "name-desc", label: "Name (Z-A)" },
  ];

  // Calculate totals - but these are tricky when mixing currencies
  // For now, we'll show aggregated totals, but individual rows show their currency
  const totalYouOwe = youOwe.reduce((sum, person) => sum + person.totalAmount, 0);
  const totalOwedToYou = owedToYou.reduce((sum, person) => sum + person.totalAmount, 0);
  const net = totalOwedToYou - totalYouOwe;
  
  // Determine if we should show DOT or USD for totals (use first breakdown currency if all same)
  const allCurrencies = [...youOwe, ...owedToYou]
    .flatMap(p => p.breakdown.map(b => b.currency || 'USD'))
    .filter((c, i, arr) => arr.indexOf(c) === i); // unique
  const totalCurrency = allCurrencies.length === 1 ? allCurrencies[0] : 'USD'; // Use single currency if all same

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
    const displayCurrency = getDisplayCurrency(person);
    const breakdownText = person.breakdown
      .map((b) => {
        const currency = b.currency || 'USD';
        return `${b.potName} ${formatAmount(b.amount, currency)}`;
      })
      .join(" • ");

    return (
      <div
        key={person.id}
        className={isPSA ? `p-4 ${psaClasses.card} rounded-lg transition-shadow duration-200` : 'p-4 card rounded-lg card-hover-lift transition-shadow duration-200 hover:shadow-[var(--shadow-fab)]'}
        style={isPSA ? psaStyles.card : undefined}
        onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
        onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
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
          className="w-full flex items-start justify-between gap-2 mb-2 text-left hover:opacity-70 active:opacity-50 transition-opacity"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-label" style={{ fontWeight: 600 }}>{person.name}</p>
                {person.trustScore && (
                  <TrustIndicator score={person.trustScore} />
                )}
                {person.paymentPreference && (
                  <span className="text-micro px-1.5 py-0.5 bg-muted text-secondary rounded">
                    {person.paymentPreference}
                  </span>
                )}
              </div>
              {breakdownText && (
                <p className="text-micro text-secondary truncate mt-0.5">
                  {breakdownText}
                </p>
              )}
              {person.address && (
                <p className="text-micro text-secondary font-mono mt-0.5 truncate">
                  {person.address.slice(0, 8)}...{person.address.slice(-6)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p 
              className="text-[18px] tabular-nums" 
              style={{ 
                fontWeight: 700,
                color: action === 'settle' ? 'var(--ink)' : 'var(--money)'
              }}
            >
              {action === 'settle' ? '-' : '+'}{formatAmount(Math.abs(person.totalAmount), displayCurrency)}
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
      <div 
        className={`h-full pb-[68px] overflow-auto ${isPSA ? '' : 'bg-background'}`}
        style={isPSA ? psaStyles.background : undefined}
      >
        {/* Unified Header */}
        <div className={`${isPSA ? '' : 'bg-background'} border-b border-border sticky top-0 z-10`}
          style={isPSA ? { background: 'transparent' } : undefined}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-screen-title">People</h1>
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
          {/* Subtabs - All tab + Balances tab */}
          <div className="px-4 pb-3 flex flex-nowrap items-center gap-2">
            <button
              onClick={() => setActiveTab("people")}
              style={{
                backgroundColor: activeTab === "people" ? "var(--ink)" : "var(--card)",
                color: activeTab === "people" ? "var(--bg)" : "var(--ink)",
              }}
              className="px-3 py-1.5 rounded-lg text-label transition-colors font-medium flex-shrink-0"
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("balances")}
              style={{
                backgroundColor: activeTab === "balances" ? "var(--ink)" : "var(--card)",
                color: activeTab === "balances" ? "var(--bg)" : "var(--ink)",
              }}
              className="px-3 py-1.5 rounded-lg text-label transition-colors font-medium flex-shrink-0"
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
            {/* Wallet Balance Banner - Shows when connected */}
            <WalletBanner />

            {/* Overview Chips */}
            <div 
              className={isPSA ? `${psaClasses.card} p-4 transition-shadow duration-200` : 'card p-4 transition-shadow duration-200'}
              style={isPSA ? psaStyles.card : undefined}
            >
              <div className="flex items-center gap-2 flex-wrap text-micro">
                <div>
                  <span className="text-secondary">You owe </span>
                  <span 
                    className="tabular-nums" 
                    style={{ 
                      fontWeight: 500,
                      color: totalYouOwe > 0 ? 'var(--foreground)' : 'var(--foreground)' 
                    }}
                  >
                    {formatAmount(totalYouOwe, totalCurrency)}
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
                    {formatAmount(totalOwedToYou, totalCurrency)}
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
                    {net >= 0 ? '+' : ''}{formatAmount(Math.abs(net), totalCurrency)}
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
