import { TrustDots } from "../TrustDots";
import { usePSAStyle } from "../../utils/usePSAStyle";

interface Person {
  id: string;
  name: string;
  balance: number;
  trustScore: number;
  paymentPreference?: string;
  potCount?: number;
  address?: string; // Optional DOT wallet address
  currency?: string; // Optional display currency (e.g., 'DOT')
}

interface PeopleViewProps {
  people: Person[];
  onPersonClick: (person: Person) => void;
  onSettle: (personId: string) => void;
}

export function PeopleView({ people, onPersonClick: _onPersonClick, onSettle }: PeopleViewProps) {
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();
  
  return (
    <div className="p-3 space-y-2">
      {people.map((person) => {
        // Determine variant based on balance
        const isPositive = person.balance >= 0;
        const amountColor = isPositive ? 'var(--money)' : 'var(--foreground)';
        
        return (
          <button
            key={person.id}
            onClick={() => onSettle(person.id)}
            className={isPSA ? `w-full ${psaClasses.card} p-4 text-left active:opacity-60 transition-all duration-200` : 'w-full card p-4 text-left hover:shadow-[var(--shadow-fab)] active:opacity-60 transition-all duration-200'}
            style={isPSA ? psaStyles.card : undefined}
            onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
            onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Left: Avatar + Name + Payment Preference */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar with TrustDots badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
                    <span className="text-body font-medium">
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* TrustDots overlay - bottom-right corner */}
                  <TrustDots 
                    score={person.trustScore} 
                    className="bottom-0 right-0"
                  />
                </div>
                
                {/* Name + Payment Preference Pill */}
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium truncate">{person.name}</p>
                  
                  {/* Payment Preference Pill */}
                  {person.paymentPreference && (
                    <div className="flex items-center gap-1 mt-1">
                      <span 
                        className="inline-block px-2 py-0.5 rounded-md text-caption"
                        style={{ 
                          backgroundColor: 'var(--muted)',
                          color: 'var(--bg)',
                          opacity: 0.8,
                        }}
                      >
                        Pref: {person.paymentPreference}
                      </span>
                    </div>
                  )}
                  
                  {/* Pot count (secondary info) */}
                  {person.potCount !== undefined && person.potCount > 0 && (
                    <p className="text-caption text-secondary mt-0.5">
                      {person.potCount} pot{person.potCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Right: Amount (right-aligned) */}
              <div className="text-right flex-shrink-0">
                <p 
                  className="text-[18px] tabular-nums"
                  style={{ fontWeight: 700, color: amountColor }}
                >
                  {(() => {
                    const isDot = person.currency === 'DOT';
                    const amt = Math.abs(person.balance);
                    if (isDot) {
                      return `${isPositive ? '' : ''}${amt.toFixed(6)} DOT`;
                    }
                    return `${isPositive ? '+' : ''}$${amt.toFixed(2)}`;
                  })()}
                </p>
                <div className="mt-1">
                  <span
                    className="inline-block px-2 py-0.5 rounded-md text-micro bg-muted/20 text-foreground"
                    style={{ fontWeight: 500 }}
                  >
                    Settle with {person.name.split(' ')[0]}
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
