import { BottomSheet } from "../BottomSheet";
import { Upload, X } from "lucide-react";
import { useState } from "react";

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string; // ISO date string
  split: { memberId: string; amount: number }[];
  attestations: string[];
  hasReceipt: boolean;
  receiptUrl?: string;
}

interface AddExpenseProps {
  members: Member[];
  baseCurrency: string;
  potName?: string;
  existingExpense?: Expense;
  prefilledData?: {
    memo: string;
    amount: number;
  };
  onSave: (data: {
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    hasReceipt: boolean;
  }) => void;
  onBack: () => void;
  onChangePot?: () => void;
}

export function AddExpense({ 
  members, 
  baseCurrency,
  potName,
  existingExpense,
  prefilledData,
  onSave, 
  onBack,
  onChangePot,
}: AddExpenseProps) {
  // Details state - use prefilledData if provided, otherwise existingExpense
  const [amount, setAmount] = useState(
    prefilledData?.amount.toString() || 
    existingExpense?.amount.toString() || 
    ""
  );
  const [currency, setCurrency] = useState(existingExpense?.currency || baseCurrency);
  const [paidBy, setPaidBy] = useState(existingExpense?.paidBy || members[0]?.id || "");
  const [memo, setMemo] = useState(
    prefilledData?.memo || 
    existingExpense?.memo || 
    ""
  );
  const [date, setDate] = useState<string>(() => {
    const iso = existingExpense?.date ?? new Date().toISOString();
    const first = iso.split('T')[0];
    return first ?? '';
  });
  
  // Receipt state
  const [hasReceipt, setHasReceipt] = useState(existingExpense?.hasReceipt || false);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);
  
  // Split state - initialize from existing expense if editing
  const [splitType, setSplitType] = useState("equal");
  const [customPercents, setCustomPercents] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.id, "0"]))
  );
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.id, "1"]))
  );
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(
    existingExpense?.split 
      ? new Set(existingExpense.split.map(s => s.memberId))
      : new Set(members.map(m => m.id))
  );
  
  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  const toggleMember = (id: string) => {
    const newSet = new Set(includedMembers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setIncludedMembers(newSet);
  };

  const calculateSplit = () => {
    const numAmount = parseFloat(amount);
    
    if (splitType === "equal") {
      const perPerson = numAmount / includedMembers.size;
      return Array.from(includedMembers).map(memberId => ({
        memberId,
        amount: perPerson,
      }));
    } else if (splitType === "custom") {
      return members
        .filter(m => includedMembers.has(m.id))
        .map(m => ({
          memberId: m.id,
          amount: (numAmount * parseFloat(customPercents[m.id] || "0")) / 100,
        }));
    } else {
      const totalShares = Array.from(includedMembers).reduce(
        (sum, id) => sum + parseInt(shares[id] || "0"),
        0
      );
      return Array.from(includedMembers).map(memberId => ({
        memberId,
        amount: (numAmount * parseInt(shares[memberId] || "0")) / totalShares,
      }));
    }
  };

  const totalPercent = members.reduce(
    (sum, m) => sum + parseFloat(customPercents[m.id] || "0"),
    0
  );
  const isSplitValid = splitType !== "custom" || Math.abs(totalPercent - 100) < 0.01;
  const isValid = parseFloat(amount) > 0 && paidBy !== "" && isSplitValid;

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save delay (in real app, this would be an API call)
    await new Promise(resolve => setTimeout(resolve, 800));
    onSave({
      amount: parseFloat(amount),
      currency: currency,
      paidBy,
      memo,
      date,
      split: calculateSplit(),
      hasReceipt,
    });
    // Note: isSaving will reset when component unmounts on navigation back
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <button onClick={onBack} className="p-1.5 -ml-1.5 hover:bg-muted rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 16L6 10L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{existingExpense ? "Edit" : "Add"} expense</span>
            {potName && (
              <>
                <span className="text-muted-foreground text-xs">•</span>
                {onChangePot ? (
                  <button
                    onClick={onChangePot}
                    className="px-2 py-0.5 bg-secondary rounded-lg text-xs hover:bg-secondary/80 transition-colors"
                  >
                    {potName}
                  </button>
                ) : (
                  <span className="px-2 py-0.5 bg-secondary rounded-lg text-xs">
                    {potName}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="w-8" />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-3 pb-[68px]">
        {/* Amount (largest, most prominent) */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
          <div className="flex items-center gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={isSaving}
              className="px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
              <option value="JPY">JPY</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              placeholder="0.00"
              disabled={isSaving}
              className="flex-1 px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-base disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Title/Memo */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title</label>
          <div className="flex items-center gap-2">
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Optional"
              disabled={isSaving}
              className="flex-1 px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Two-column: Paid By + Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Paid by</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              disabled={isSaving}
              className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSaving}
              className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Split Section */}
        <div className="pt-2 border-t border-border space-y-2">
          <h3 className="text-xs text-muted-foreground">Split between</h3>
          
          {/* Split Type Tabs - More compact */}
          <div className="flex gap-1 p-0.5 bg-secondary/50 dark:bg-secondary/30 rounded-lg">
            <button
              onClick={() => setSplitType("equal")}
              className={`flex-1 py-1 px-2 rounded text-xs transition-all duration-200 ${
                splitType === "equal"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Equal
            </button>
            <button
              onClick={() => setSplitType("custom")}
              className={`flex-1 py-1 px-2 rounded text-xs transition-all duration-200 ${
                splitType === "custom"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom %
            </button>
            <button
              onClick={() => setSplitType("shares")}
              className={`flex-1 py-1 px-2 rounded text-xs transition-all duration-200 ${
                splitType === "shares"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Shares
            </button>
          </div>

          {/* Equal Split - Checkbox list */}
          {splitType === "equal" && (
            <div className="space-y-1">
              {members.map(member => {
                const isIncluded = includedMembers.has(member.id);
                const numAmount = parseFloat(amount) || 0;
                const perPerson = includedMembers.size > 0 ? numAmount / includedMembers.size : 0;
                return (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 p-1.5 glass-sm rounded-lg cursor-pointer hover:bg-muted/50 transition-all duration-200 active:scale-[0.98]"
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() => toggleMember(member.id)}
                      className="w-3.5 h-3.5"
                    />
                    <span className="flex-1 text-xs">{member.name}</span>
                    {isIncluded && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {perPerson.toFixed(2)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {/* Custom % Split - Compact inline inputs */}
          {splitType === "custom" && (
            <div className="space-y-1">
              {members.map(member => {
                const percent = parseFloat(customPercents[member.id] || "0");
                const numAmount = parseFloat(amount) || 0;
                const memberAmount = (numAmount * percent) / 100;
                
                return (
                  <div key={member.id} className="flex items-center gap-2 p-1.5 glass-sm rounded-lg">
                    <span className="flex-1 text-xs">{member.name}</span>
                    <input
                      value={customPercents[member.id]}
                      onChange={(e) =>
                        setCustomPercents({ ...customPercents, [member.id]: e.target.value })
                      }
                      type="number"
                      placeholder="0"
                      className="w-14 px-1.5 py-0.5 bg-input-background border border-border rounded text-xs text-right tabular-nums"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                      {memberAmount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              <p className={`text-xs px-1.5 ${isSplitValid ? "text-muted-foreground" : "text-destructive"}`}>
                Total: {totalPercent.toFixed(1)}% {!isSplitValid && "(must equal 100%)"}
              </p>
            </div>
          )}

          {/* Shares Split - Compact inline inputs */}
          {splitType === "shares" && (
            <div className="space-y-1">
              {members.map(member => {
                const totalShares = members.reduce(
                  (sum, m) => sum + parseInt(shares[m.id] || "0"),
                  0
                );
                const memberShares = parseInt(shares[member.id] || "0");
                const numAmount = parseFloat(amount) || 0;
                const memberAmount = totalShares > 0 ? (numAmount * memberShares) / totalShares : 0;
                
                return (
                  <div key={member.id} className="flex items-center gap-2 p-1.5 glass-sm rounded-lg">
                    <span className="flex-1 text-xs">{member.name}</span>
                    <input
                      value={shares[member.id]}
                      onChange={(e) => setShares({ ...shares, [member.id]: e.target.value })}
                      type="number"
                      placeholder="1"
                      className="w-14 px-1.5 py-0.5 bg-input-background border border-border rounded text-xs text-right tabular-nums"
                    />
                    <span className="text-xs text-muted-foreground">shares</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                      {memberAmount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save Button - Inline with content */}
        <div className="pt-2 space-y-1.5">
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-center flex items-center justify-center gap-2 ${
              isValid && !isSaving
                ? "bg-foreground text-background hover:opacity-90 active:scale-[0.98]"
                : "bg-muted/30 text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isSaving && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            )}
            <span style={{ opacity: isSaving ? 0.9 : 1 }}>
              {existingExpense ? "Update" : "Save"} Expense
            </span>
          </button>
          {isSaving && (
            <p className="text-caption text-center text-muted">Saving…</p>
          )}
        </div>
      </div>

      {/* Receipt Bottom Sheet */}
      {showReceiptSheet && (
        <BottomSheet isOpen title="Receipt" onClose={() => setShowReceiptSheet(false)}>
          <div className="flex flex-col h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h2 className="text-sm">Receipt</h2>
              <button
                onClick={() => setShowReceiptSheet(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {!hasReceipt ? (
                <button
                  onClick={() => {
                    setHasReceipt(true);
                    setShowReceiptSheet(false);
                  }}
                  className="w-full p-6 border-2 border-dashed border-border rounded-lg hover:bg-muted transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Tap to upload</p>
                </button>
              ) : (
                <div className="relative p-2 bg-muted rounded-lg">
                  <button
                    onClick={() => setHasReceipt(false)}
                    className="absolute top-1 right-1 p-1 bg-background rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="w-full h-32 bg-secondary rounded flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Receipt preview</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Stored privately with expense details
              </p>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}