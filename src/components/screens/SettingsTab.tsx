import { useState } from "react";
import { Copy, Send } from "lucide-react";

interface Member {
  id: string;
  name: string;
  status: "active" | "pending";
}

interface SettingsTabProps {
  potName: string;
  baseCurrency: string;
  hasExpenses: boolean;
  budget?: number;
  budgetEnabled?: boolean;
  checkpointEnabled?: boolean;
  potType?: "expense" | "savings";
  members?: Member[];
  onUpdateSettings: (settings: any) => void;
  onCopyInviteLink?: () => void;
  onResendInvite?: (memberId: string) => void;
}

export function SettingsTab({
  potName: initialPotName,
  baseCurrency: initialCurrency,
  hasExpenses: _hasExpenses,
  budget: initialBudget,
  budgetEnabled: initialBudgetEnabled,
  checkpointEnabled: initialCheckpointEnabled,
  potType = "expense",
  members = [],
  onUpdateSettings,
  onCopyInviteLink,
  onResendInvite,
}: SettingsTabProps) {
  const [potName, setPotName] = useState(initialPotName);
  const [baseCurrency, setBaseCurrency] = useState(initialCurrency);
  const [budgetEnabled, setBudgetEnabled] = useState(initialBudgetEnabled || false);
  const [budget, setBudget] = useState(initialBudget?.toString() || "");
  const [checkpointEnabled, setCheckpointEnabled] = useState(initialCheckpointEnabled !== false);

  const pendingMembers = members.filter(m => m.status === "pending");

  const handleSave = () => {
    onUpdateSettings({ 
      potName, 
      baseCurrency,
      budgetEnabled,
      budget: budgetEnabled && budget ? parseFloat(budget) : undefined,
      checkpointEnabled,
    });
  };

  return (
    <div className="p-3 space-y-3">
      {/* Compact settings form */}
      <div className="space-y-2">
        <div>
          <label className="text-label text-secondary mb-1 block">Pot name</label>
          <input
            value={potName}
            onChange={(e) => setPotName(e.target.value)}
            className="w-full px-3 py-2.5 bg-input-background border border-border/30 rounded-[var(--r-lg)] text-body placeholder:text-muted-foreground focus:outline-none focus-ring-pink transition-all"
          />
        </div>
        
        <div>
          <label className="text-label text-secondary mb-1 block">Currency</label>
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="w-full px-3 py-2.5 bg-input-background border border-border/30 rounded-[var(--r-lg)] text-body focus:outline-none focus-ring-pink transition-all appearance-none"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="DOT">DOT</option>
          </select>
        </div>

        {/* Budget Settings */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-label block">Enable budget tracking</label>
              <p className="text-caption text-secondary">Track spending against a limit</p>
            </div>
            <button
              onClick={() => setBudgetEnabled(!budgetEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                budgetEnabled ? "bg-primary" : "bg-switch-background"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  budgetEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          
          {budgetEnabled && (
            <div className="mt-2">
              <label className="text-label text-secondary mb-1 block">Budget limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">$</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="500"
                  className="w-full pl-7 pr-3 py-2.5 bg-input-background border border-border/30 rounded-[var(--r-lg)] text-body placeholder:text-muted-foreground focus:outline-none focus-ring-pink transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Checkpoint Settings (Expense pots only) */}
        {potType === "expense" && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-label block">Settlement checkpoints</label>
                <p className="text-caption text-secondary">Confirm expenses before settling</p>
              </div>
              <button
                onClick={() => setCheckpointEnabled(!checkpointEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  checkpointEnabled ? "bg-primary" : "bg-switch-background"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    checkpointEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-foreground text-background rounded-lg text-body hover:opacity-90 transition-all duration-200 active:scale-[0.98] text-center"
      >
        Save
      </button>

      {/* Compact Pending Members Section */}
      {pendingMembers.length > 0 && (
        <div className="pt-2 space-y-1.5 border-t border-border">
          <p className="text-label text-secondary">Pending invites ({pendingMembers.length})</p>
          {pendingMembers.map(member => (
            <div key={member.id} className="p-2 glass-sm rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-label">{member.name}</p>
                <span className="text-caption px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                  Pending
                </span>
              </div>
              <button
                onClick={() => onResendInvite?.(member.id)}
                className="flex items-center gap-1 text-label text-primary"
              >
                <Send className="w-3 h-3" />
                Resend
              </button>
            </div>
          ))}
          <button
            onClick={onCopyInviteLink}
            className="w-full p-2 bg-muted border border-border rounded-lg flex items-center justify-center gap-1.5 text-label hover:bg-secondary transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy invite link
          </button>
        </div>
      )}

      {/* Pot Management */}
      <div className="pt-2 space-y-2 border-t border-border">
        <p className="text-label text-secondary">Pot management</p>
        <button className="w-full glass-sm rounded-xl p-3 flex items-center justify-between hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] text-left">
          <span className="text-body">Leave Pot</span>
          <span className="text-label text-secondary">›</span>
        </button>
        <button className="w-full glass-sm rounded-xl p-3 flex items-center justify-between hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] text-left">
          <span className="text-body">Archive Pot</span>
          <span className="text-label text-secondary">›</span>
        </button>
      </div>
    </div>
  );
}