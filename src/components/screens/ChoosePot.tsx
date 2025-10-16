import { Search, Users, X, ReceiptText } from "lucide-react";
import { useState } from "react";

interface RecentExpense {
  id: string;
  memo: string;
  amount: number;
  currency: string;
}

interface PotSummary {
  id: string;
  name: string;
  myExpenses: number;
  totalExpenses: number;
  memberCount: number;
  lastUpdated?: string;
  recentExpenses?: RecentExpense[];
}

interface ChoosePotProps {
  pots: PotSummary[];
  onSelectPot: (potId: string) => void;
  onQuickAdd?: (potId: string, expenseTemplate: RecentExpense) => void;
  onCreatePot: () => void;
  onClose: () => void;
}

export function ChoosePot({
  pots,
  onSelectPot,
  onQuickAdd,
  onCreatePot,
  onClose,
}: ChoosePotProps) {
  const [search, setSearch] = useState("");

  const filteredPots = pots.filter((pot) =>
    pot.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute inset-0 z-50 bg-foreground/20 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-x-0 top-20 bottom-20 card flex flex-col animate-slideUp mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-screen-title">Choose pot</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/10 transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pots…"
              className="w-full pl-10 pr-3 py-2.5 input-field text-body placeholder:text-muted-foreground focus:outline-none focus-ring-pink"
            />
          </div>
        </div>

        {/* Pot List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {/* New Pot Option */}
          <button
            onClick={onCreatePot}
            className="w-full p-3 bg-muted/5 rounded-xl text-left hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
          >
            <p className="text-body">New pot…</p>
          </button>

          {/* Recent Pots */}
          {filteredPots.length > 0 && (
            <div className="space-y-2">
              <p className="text-label text-muted-foreground px-1 pt-2">
                Recent
              </p>
              {filteredPots.map((pot) => (
                <div key={pot.id} className="space-y-1">
                  <button
                    onClick={() => onSelectPot(pot.id)}
                    className="w-full p-3 bg-muted/5 rounded-xl text-left hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-body flex-1">{pot.name}</p>
                      <div className="flex items-center gap-1 text-caption text-muted-foreground flex-shrink-0">
                        <Users className="w-3 h-3" />
                        <span>{pot.memberCount}</span>
                      </div>
                    </div>
                    <p className="text-caption text-muted-foreground">
                      My expenses ${pot.myExpenses.toFixed(0)} • Total ${pot.totalExpenses.toFixed(0)}
                    </p>
                    <p className="text-micro text-secondary mt-1">
                      Updated {pot.lastUpdated}
                    </p>
                  </button>
                  
                  {/* Quick Add - Recent Expenses */}
                  {pot.recentExpenses && pot.recentExpenses.length > 0 && onQuickAdd && (
                    <div className="flex gap-2 px-1">
                      {pot.recentExpenses.slice(0, 2).map((expense) => (
                        <button
                          key={expense.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAdd(pot.id, expense);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/60 hover:bg-muted rounded-lg transition-all duration-200 active:scale-95"
                        >
                          <ReceiptText className="w-3 h-3 text-secondary" />
                          <span className="text-caption text-secondary">
                            {expense.memo}
                          </span>
                          <span className="text-caption text-foreground">
                            ${expense.amount}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredPots.length === 0 && search && (
            <div className="pt-8 text-center">
              <p className="text-body text-secondary">
                No pots found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}