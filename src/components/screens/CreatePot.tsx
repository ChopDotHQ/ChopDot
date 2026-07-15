import { ArrowRight, Check, Coins } from "lucide-react";
import { TopBar } from "../TopBar";

interface Member {
  id: string;
  name: string;
  address?: string;
  verified?: boolean;
}

interface CreatePotProps {
  potName: string;
  setPotName: (name: string) => void;
  potType: "expense" | "savings";
  setPotType: (type: "expense" | "savings") => void;
  baseCurrency: string;
  setBaseCurrency: (currency: string) => void;
  members: Member[];
  setMembers: (members: Member[]) => void;
  goalAmount?: number;
  setGoalAmount: (amount: number | undefined) => void;
  goalDescription?: string;
  setGoalDescription: (description: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

export function CreatePot({
  potName,
  setPotName,
  baseCurrency,
  setBaseCurrency,
  onBack,
  onCreate,
}: CreatePotProps) {
  const isValid = potName.trim() !== "";
  const currencyOptions = [
    { code: "CHF", label: "Swiss Franc" },
    { code: "USD", label: "US Dollar" },
    { code: "EUR", label: "Euro" },
    { code: "DOT", label: "DOT" },
  ];

  return (
    <div className="flex flex-col h-full bg-background relative">
      <TopBar title="Create pot" onBack={onBack} />
      
      <div className="flex-1 overflow-auto p-4 pb-32 space-y-5 relative animate-in fade-in duration-300">
        <div className="space-y-2">
          <p className="text-caption font-semibold" style={{ color: "var(--accent)" }}>Step 1 of 2</p>
          <h2 className="text-h1 font-semibold text-foreground tracking-tight leading-tight">
            Start the pot
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-5">
          <div className="space-y-1.5">
            <label className="text-label font-semibold">Pot name</label>
            <input
              value={potName}
              onChange={(e) => setPotName(e.target.value)}
              placeholder="Zurich dinner crew"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:border-[var(--accent)] text-body transition-colors text-lg"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) {
                  onCreate();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-label font-semibold">Currency</label>
            <div className="grid grid-cols-2 gap-2">
              {currencyOptions.map((option) => {
                const selected = baseCurrency === option.code;
                return (
                  <button
                    type="button"
                    key={option.code}
                    onClick={() => setBaseCurrency(option.code)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent)]/15"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-label font-semibold ${selected ? "bg-[var(--accent)] text-white" : "bg-white/10 text-foreground"}`}>
                          {option.code === "DOT" ? <Coins className="w-4 h-4" /> : option.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-label font-semibold truncate">{option.code}</p>
                          <p className="text-micro text-secondary truncate">{option.label}</p>
                        </div>
                      </div>
                      {selected && <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border z-10">
          <button
            onClick={onCreate}
            disabled={!isValid}
            className={`w-full py-3.5 rounded-2xl text-body font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isValid
                ? "bg-[var(--accent)] text-white active:scale-[0.98] shadow-sm"
                : "bg-muted/30 text-secondary cursor-not-allowed"
            }`}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
