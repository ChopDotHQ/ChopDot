import { TopBar } from "../TopBar";
import { HandCoins, User } from "lucide-react";
import { EmptyState } from "../EmptyState";

interface PersonBalance {
  id: string;
  name: string;
  amount: number;
  direction: "owe" | "owed"; // you owe them OR they owe you
  trustScore?: number;
  paymentPreference?: string;
}

interface SettleSelectionProps {
  potName?: string;
  balances: PersonBalance[];
  onBack: () => void;
  onSelectPerson: (personId: string) => void;
  baseCurrency?: string; // Base currency for the pot (e.g., "DOT", "USD")
}

export function SettleSelection({
  potName,
  balances,
  onBack,
  onSelectPerson,
  baseCurrency = "USD", // Default to USD if not provided
}: SettleSelectionProps) {
  // Separate into "you owe" and "owed to you"
  const youOwe = balances.filter(b => b.direction === "owe");
  const owedToYou = balances.filter(b => b.direction === "owed");
  const totalOpen = balances.reduce((sum, balance) => sum + Math.abs(balance.amount), 0);
  
  // Format amount based on currency
  const formatAmount = (amount: number) => {
    const currency = baseCurrency || 'USD';
    const isDot = currency === 'DOT';
    const decimals = isDot ? 6 : 2;
    const formatted = Math.abs(amount).toFixed(decimals);
    if (currency === 'USD') return `$${formatted}`;
    return `${currency} ${formatted}`;
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Settle up"
        onBack={onBack}
      />
      
      <div className="flex-1 overflow-auto px-4 pb-8 pt-6 space-y-6">
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 28,
            padding: 24,
            background: 'radial-gradient(circle at 86% 18%, rgba(230,0,122,0.30), transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.13), rgba(255,255,255,0.055))',
            boxShadow: '0 24px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <div>
            {potName && <p className="text-caption text-secondary">{potName}</p>}
            <h1 className="mt-3 text-[44px] font-semibold leading-none tracking-normal">
              {owedToYou.length > 0 && youOwe.length === 0 ? 'Collect' : youOwe.length > 0 && owedToYou.length === 0 ? 'Pay' : 'Settle'}
            </h1>
            <p className="mt-2 text-[40px] font-semibold leading-none tabular-nums" style={{ color: 'var(--accent)' }}>
              {formatAmount(totalOpen)}
            </p>
          </div>
        </div>

        {youOwe.length > 0 && (
          <div className="space-y-2">
            <p className="text-label font-semibold px-1">Choose person</p>
            {youOwe.map((person) => (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className="w-full rounded-[22px] p-4 text-left transition-all duration-200 active:scale-[0.98]"
                style={{
                  borderRadius: 22,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045))',
                  boxShadow: '0 14px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="text-left">
                      <p className="text-label" style={{ fontWeight: 600 }}>{person.name}</p>
                      {person.paymentPreference && (
                        <p className="text-micro text-secondary">
                          {person.paymentPreference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] tabular-nums" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                      {formatAmount(person.amount)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {owedToYou.length > 0 && (
          <div className="space-y-2">
            <p className="text-label font-semibold px-1">Choose person</p>
            {owedToYou.map((person) => (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className="w-full rounded-[22px] p-4 text-left transition-all duration-200 active:scale-[0.98]"
                style={{
                  borderRadius: 22,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045))',
                  boxShadow: '0 14px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="text-left">
                      <p className="text-label" style={{ fontWeight: 600 }}>{person.name}</p>
                      {person.paymentPreference && (
                        <p className="text-micro text-secondary">
                          {person.paymentPreference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] tabular-nums" style={{ fontWeight: 700, color: 'var(--money)' }}>
                      {formatAmount(person.amount)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {balances.length === 0 && (
          <div className="pt-8">
            <EmptyState
              icon={HandCoins}
              message="All settled up! No outstanding balances."
            />
          </div>
        )}
      </div>
    </div>
  );
}
