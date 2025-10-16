import { TopBar } from "../TopBar";
import { User } from "lucide-react";
import { TrustIndicator } from "../TrustIndicator";
import { EmptyState } from "../EmptyState";
import { HandCoins } from "lucide-react";

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
}

export function SettleSelection({
  potName,
  balances,
  onBack,
  onSelectPerson,
}: SettleSelectionProps) {
  // Separate into "you owe" and "owed to you"
  const youOwe = balances.filter(b => b.direction === "owe");
  const owedToYou = balances.filter(b => b.direction === "owed");

  return (
    <div className="flex flex-col h-full pb-[68px]">
      <TopBar 
        title={potName ? `Settle: ${potName}` : "Settle Up"} 
        onBack={onBack}
      />
      
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Scope indicator if pot-scoped */}
        {potName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 rounded-lg">
            <span className="text-caption text-secondary">
              📍 Settling within:
            </span>
            <span className="text-caption" style={{ fontWeight: 500 }}>
              {potName}
            </span>
          </div>
        )}

        {/* Instructions */}
        <div className="px-1">
          <p className="text-caption text-secondary">
            Choose who to settle with
          </p>
        </div>

        {/* People You Owe */}
        {youOwe.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-caption text-secondary px-1">
              People you owe
            </p>
            {youOwe.map((person) => (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className="w-full p-3 glass-sm rounded-lg hover:bg-muted/5 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[14px] font-medium">{person.name}</p>
                        {person.trustScore && (
                          <TrustIndicator score={person.trustScore} />
                        )}
                      </div>
                      {person.paymentPreference && (
                        <p className="text-[11px] text-secondary">
                          Prefers {person.paymentPreference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] tabular-nums" style={{ fontWeight: 500, color: 'var(--accent-orange)' }}>
                      -${person.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* People Who Owe You */}
        {owedToYou.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-caption text-secondary px-1">
              People who owe you
            </p>
            {owedToYou.map((person) => (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className="w-full p-3 glass-sm rounded-lg hover:bg-muted/5 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[14px] font-medium">{person.name}</p>
                        {person.trustScore && (
                          <TrustIndicator score={person.trustScore} />
                        )}
                      </div>
                      {person.paymentPreference && (
                        <p className="text-[11px] text-secondary">
                          Prefers {person.paymentPreference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] tabular-nums" style={{ fontWeight: 500, color: 'var(--success)' }}>
                      +${person.amount.toFixed(2)}
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
