import { Receipt, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { TopBar } from "../TopBar";
import { MemberChip } from "../MemberChip";
import { LinkButton } from "../LinkButton";
import { useState } from "react";
import { isValidSs58Any, normalizeToPolkadot } from "../../services/chain/address";

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
  potType,
  setPotType,
  baseCurrency,
  setBaseCurrency,
  members,
  setMembers,
  goalAmount,
  setGoalAmount,
  goalDescription,
  setGoalDescription,
  onBack,
  onCreate,
}: CreatePotProps) {
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [showAddressField, setShowAddressField] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressValid, setAddressValid] = useState(false);
  const [allowCashBank, setAllowCashBank] = useState(true);

  // Validate address on change
  const validateAddress = (addr: string) => {
    if (!addr.trim()) {
      setAddressError(null);
      setAddressValid(false);
      return;
    }

    if (isValidSs58Any(addr)) {
      setAddressError(null);
      setAddressValid(true);
    } else {
      setAddressError('Invalid address (any SS58 allowed)');
      setAddressValid(false);
    }
  };

  const handleAddressChange = (addr: string) => {
    setNewMemberAddress(addr);
    validateAddress(addr);
  };

  const addMember = async () => {
    if (newMemberName.trim()) {
      let normalizedAddress: string | undefined = undefined;
      if (newMemberAddress.trim() && addressValid) {
        normalizedAddress = normalizeToPolkadot(newMemberAddress);
      } else {
        // In simulation mode, auto-inject mock address for DOT pots if no address provided
        const { getMockAddressForMember, isSimulationMode } = await import('../../utils/simulation');
        if (isSimulationMode() && baseCurrency === 'DOT' && !normalizedAddress) {
          const mockAddr = getMockAddressForMember(newMemberName.trim());
          if (mockAddr) {
            normalizedAddress = mockAddr;
          }
        }
      }

      setMembers([...members, { 
        id: Date.now().toString(), 
        name: newMemberName.trim(),
        address: normalizedAddress,
        verified: false,
      }]);
      setNewMemberName("");
      setNewMemberAddress("");
      setShowAddressField(false);
      setAddressError(null);
      setAddressValid(false);
    }
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText("https://chopdot.app/inv/abc123");
  };

  const isValid = potName.trim() !== "";

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar title="Create Pot" onBack={onBack} />
      
      <div className="flex-1 overflow-auto p-3 space-y-3 pb-[68px]">
        {/* Pot Type Selection */}
        <div className="space-y-2">
          <h3 className="text-micro text-secondary">Type</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPotType("expense")}
              className={`p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                potType === "expense"
                  ? "border-[var(--accent)]"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="w-4 h-4" style={{ color: potType === "expense" ? "var(--accent)" : "var(--muted)" }} />
                <p className="text-body text-foreground">Expense</p>
              </div>
              <p className="text-caption text-secondary text-left">
                Track and split shared costs
              </p>
            </button>
            
            <button
              onClick={() => setPotType("savings")}
              className={`p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                potType === "savings"
                  ? "border-[var(--success)] bg-[rgba(25,195,125,0.08)]"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4" style={{ color: potType === "savings" ? "var(--success)" : "var(--muted)" }} />
                <p className="text-body text-foreground">Savings</p>
              </div>
              <p className="text-caption text-secondary text-left">
                Pool funds & earn yield
              </p>
            </button>
          </div>
        </div>

        {/* Details - Compact */}
        <div className="space-y-2">
          <h3 className="text-micro text-secondary">Details</h3>
          <div>
            <label className="text-micro text-secondary mb-1 block">
              {potType === "savings" ? "Savings pot name" : "Pot name"}
            </label>
            <input
              value={potName}
              onChange={(e) => setPotName(e.target.value)}
              placeholder={potType === "savings" ? "e.g., House Down Payment" : "e.g., Groceries"}
              className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body"
            />
          </div>
          
          {/* Two-column for Currency + Settings */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-micro text-secondary mb-1 block">Currency</label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body appearance-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="DOT">DOT</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-1.5 p-1.5 card rounded-lg cursor-pointer w-full transition-all duration-200 hover:shadow-[var(--shadow-fab)] active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={allowCashBank}
                  onChange={(e) => setAllowCashBank(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-micro">Cash/Bank</span>
              </label>
            </div>
          </div>
        </div>

        {/* Savings-specific: Goal */}
        {potType === "savings" && (
          <>
            <div>
              <label className="text-micro text-secondary mb-1 block">Savings goal (optional)</label>
              <input
                type="number"
                value={goalAmount || ""}
                onChange={(e) => setGoalAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g., 50000"
                className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body"
              />
            </div>
            <div>
              <label className="text-micro text-secondary mb-1 block">What are you saving for?</label>
              <input
                value={goalDescription || ""}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="e.g., First home together 🏡"
                className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body"
              />
            </div>
          </>
        )}

        {/* Members - Compact */}
        <div className="space-y-2 pt-2 border-t border-border">
          <h3 className="text-micro text-secondary">Members</h3>
          
          <div className="flex flex-wrap gap-1.5">
            {members.map((member, index) => (
              <MemberChip
                key={member.id}
                name={member.name}
                role={index === 0 ? "Owner" : undefined}
                onRemove={index > 0 ? () => removeMember(member.id) : undefined}
              />
            ))}
          </div>
          
          <div className="space-y-1">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !showAddressField && addMember()}
              placeholder="Name, handle, or email"
              className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body"
            />
            
            {/* Optional Address Field */}
            {showAddressField && (
              <div className="space-y-1">
                <input
                  type="text"
                  value={newMemberAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && newMemberName.trim() && (!newMemberAddress.trim() || addressValid) && addMember()}
                  placeholder="Polkadot wallet address (optional, any SS58)"
                  className={`w-full px-2 py-1.5 bg-input-background border rounded-lg focus:outline-none focus-ring-pink text-body font-mono ${
                    addressError ? 'border-destructive' : addressValid ? 'border-green-500' : 'border-border'
                  }`}
                />
                {addressError && (
                  <div className="flex items-center gap-1 text-micro text-destructive">
                    <AlertCircle className="w-3 h-3" />
                    <span>{addressError}</span>
                  </div>
                )}
                {addressValid && !addressError && (
                  <div className="flex items-center gap-1 text-micro text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>Will be normalized to Polkadot format.</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowAddressField(false);
                    setNewMemberAddress("");
                    setAddressError(null);
                    setAddressValid(false);
                  }}
                  className="text-micro text-secondary hover:text-foreground"
                >
                  Remove address field
                </button>
              </div>
            )}
            
            {!showAddressField && (
              <button
                onClick={() => setShowAddressField(true)}
                className="text-micro text-secondary hover:text-foreground"
              >
                + Add wallet address (optional)
              </button>
            )}
            
            <div className="flex justify-between items-center">
              <p className="text-micro text-secondary">
                Add now or invite later
              </p>
              <LinkButton onClick={copyInviteLink}>Copy link</LinkButton>
            </div>
          </div>
        </div>

        {/* Create Button - Inline with content */}
        <div className="pt-2">
          <button
            onClick={onCreate}
            disabled={!isValid}
            className={`w-full py-2.5 rounded-lg text-body transition-all duration-200 text-center ${
              isValid
                ? "card hover:shadow-[var(--shadow-fab)] active:scale-[0.98] text-foreground"
                : "bg-muted/30 text-secondary cursor-not-allowed border border-border"
            }`}
          >
            Create Pot
          </button>
        </div>
      </div>
    </div>
  );
}