import { BottomSheet } from "../BottomSheet";
import { Upload, X, AlertCircle, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { validateExpense } from "../../schema/pot";
import { uploadReceipt } from "../../services/storage/receipt";

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
    receiptUrl?: string;
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
  // For DOT pots, currency is locked to DOT; for others, allow selection but default to baseCurrency
  const [currency, setCurrency] = useState(baseCurrency === 'DOT' ? 'DOT' : (existingExpense?.currency || baseCurrency));
  const currencyLocked = baseCurrency === 'DOT'; // Lock currency for DOT pots
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
  const [receiptUrl, setReceiptUrl] = useState(existingExpense?.receiptUrl || undefined);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Use 6 decimals for DOT, 2 for other currencies
  const decimals = baseCurrency === 'DOT' ? 6 : 2;

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
        amount: Number(perPerson.toFixed(decimals)),
      }));
    } else if (splitType === "custom") {
      return members
        .filter(m => includedMembers.has(m.id))
        .map(m => ({
          memberId: m.id,
          amount: Number(((numAmount * parseFloat(customPercents[m.id] || "0")) / 100).toFixed(decimals)),
        }));
    } else {
      const totalShares = Array.from(includedMembers).reduce(
        (sum, id) => sum + parseInt(shares[id] || "0"),
        0
      );
      return Array.from(includedMembers).map(memberId => ({
        memberId,
        amount: Number(((numAmount * parseInt(shares[memberId] || "0")) / totalShares).toFixed(decimals)),
      }));
    }
  };

  const totalPercent = members.reduce(
    (sum, m) => sum + parseFloat(customPercents[m.id] || "0"),
    0
  );
  const isSplitValid = splitType !== "custom" || Math.abs(totalPercent - 100) < 0.01;
  
  // Validation with inline error messages
  const amountValue = parseFloat(amount) || 0;
  // For DOT pots, allow smaller amounts (0.000001 DOT = 1 micro-DOT)
  // For USD pots, maintain minimum of 0.01
  const minAmount = baseCurrency === 'DOT' ? 0.000001 : 0.01;
  const amountValid = amountValue >= minAmount - 0.0000001; // Handle floating point precision
  const descriptionValid = memo.trim().length > 0;
  const paidByValid = paidBy !== "" && members.some(m => m.id === paidBy);
  const membersIncludedValid = includedMembers.size > 0;
  
  const isValid = amountValid && descriptionValid && paidByValid && isSplitValid && membersIncludedValid;
  
  // Error messages
  const amountError = amount.trim() !== "" && !amountValid 
    ? `Amount must be at least ${minAmount} ${baseCurrency}` 
    : null;
  const descriptionError = memo.trim().length === 0 ? "Description is required" : null;
  const paidByError = !paidByValid ? "Please select who paid" : null;
  const membersError = !membersIncludedValid ? "At least one member must be included" : null;
  const splitError = !isSplitValid ? "Percentages must total 100%" : null;

  const handleSave = async () => {
    if (!isValid) return;
    
    setIsSaving(true);
    
    try {
      // Validate using schema
      const split = calculateSplit();
      const memberIds = members.map(m => m.id);
      const expenseData = {
        id: existingExpense?.id || `exp-${Date.now()}`,
        potId: '', // Will be set by parent
        description: memo.trim(),
        amount: parseFloat(amount),
        paidBy,
        createdAt: existingExpense ? 0 : Date.now(),
      };
      
      const validation = validateExpense(expenseData, memberIds);
      if (!validation.success) {
        setIsSaving(false);
        // Show error toast if available
        const errorMsg = validation.error || 'Validation failed';
        console.error('Validation error:', errorMsg);
        // Show alert if validation fails (temporary - should use toast)
        alert(`Validation error: ${errorMsg}`);
        return;
      }
      
      // Simulate save delay (in real app, this would be an API call)
      await new Promise(resolve => setTimeout(resolve, 800));
      
              // Call onSave - this should trigger navigation
              // Always use baseCurrency for consistency (especially for DOT pots)
              onSave({
                amount: Number(parseFloat(amount).toFixed(decimals)),
                currency: baseCurrency, // Use baseCurrency instead of selected currency for consistency
                paidBy,
                memo: memo.trim(),
                date,
                split,
                hasReceipt,
                receiptUrl,
              });
      
      // Reset saving state after a short delay to ensure navigation happens
      // If navigation doesn't happen, this prevents the UI from being stuck
      setTimeout(() => {
        setIsSaving(false);
      }, 100);
    } catch (error) {
      console.error('Error saving expense:', error);
      setIsSaving(false);
    }
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
            <span className="text-label">{existingExpense ? "Edit" : "Add"} expense</span>
            {potName && (
              <>
                <span className="text-secondary text-micro">•</span>
                {onChangePot ? (
                  <button
                    onClick={onChangePot}
                    className="px-2 py-0.5 bg-secondary rounded-lg text-micro hover:bg-secondary/80 transition-colors"
                  >
                    {potName}
                  </button>
                ) : (
                  <span className="px-2 py-0.5 bg-secondary rounded-lg text-micro">
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
          <label className="text-micro text-secondary mb-1 block">Amount</label>
          <div className="flex items-center gap-2">
            {currencyLocked ? (
              <span className="px-2 py-1.5 bg-input-background border border-border rounded-lg text-body">
                {baseCurrency}
              </span>
            ) : (
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={isSaving}
                className="px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
                <option value="JPY">JPY</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="DOT">DOT</option>
              </select>
            )}
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                const n = Number(amount);
                if (!Number.isNaN(n) && n >= minAmount) {
                  setAmount(n.toFixed(decimals));
                } else if (!Number.isNaN(n) && n > 0 && n < minAmount) {
                  // Round up to minimum if below threshold
                  setAmount(minAmount.toFixed(decimals));
                }
              }}
              type="number"
              step={baseCurrency === 'DOT' ? '0.000001' : '0.01'}
              min={minAmount.toString()}
              placeholder={baseCurrency === 'DOT' ? '0.000000' : '0.00'}
              disabled={isSaving}
              className={`flex-1 px-2 py-1.5 bg-input-background border rounded-lg focus:outline-none focus-ring-pink text-body disabled:opacity-50 disabled:cursor-not-allowed ${
                amountError ? 'border-destructive' : 'border-border'
              }`}
            />
          </div>
          {amountError && (
            <div className="flex items-center gap-1 mt-1 text-micro text-destructive">
              <AlertCircle className="w-3 h-3" />
              <span>{amountError}</span>
            </div>
          )}
        </div>

        {/* Title/Memo */}
        <div>
          <label className="text-micro text-secondary mb-1 block">Description <span className="text-destructive">*</span></label>
          <div className="flex items-center gap-2">
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Enter description"
              disabled={isSaving}
              className={`flex-1 px-2 py-1.5 bg-input-background border rounded-lg focus:outline-none focus-ring-pink text-body disabled:opacity-50 disabled:cursor-not-allowed ${
                descriptionError ? 'border-destructive' : 'border-border'
              }`}
            />
          </div>
          {descriptionError && (
            <div className="flex items-center gap-1 mt-1 text-micro text-destructive">
              <AlertCircle className="w-3 h-3" />
              <span>{descriptionError}</span>
            </div>
          )}
        </div>

        {/* Two-column: Paid By + Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-micro text-secondary mb-1 block">Paid by <span className="text-destructive">*</span></label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              disabled={isSaving}
              className={`w-full px-2 py-1.5 bg-input-background border rounded-lg focus:outline-none focus-ring-pink text-body appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                paidByError ? 'border-destructive' : 'border-border'
              }`}
            >
              <option value="">Select member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {paidByError && (
              <div className="flex items-center gap-1 mt-1 text-micro text-destructive">
                <AlertCircle className="w-3 h-3" />
                <span>{paidByError}</span>
              </div>
            )}
          </div>
          <div>
            <label className="text-micro text-secondary mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSaving}
              className="w-full px-2 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-body disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Split Section */}
        <div className="pt-2 border-t border-border space-y-2">
          <h3 className="text-micro text-secondary">Split between</h3>
          
          {/* Split Type Tabs - More compact */}
          <div className="flex gap-1 p-0.5 bg-secondary/50 dark:bg-secondary/30 rounded-lg">
            <button
              onClick={() => setSplitType("equal")}
              className={`flex-1 py-1 px-2 rounded text-micro transition-all duration-200 ${
                splitType === "equal"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              Equal
            </button>
            <button
              onClick={() => setSplitType("custom")}
              className={`flex-1 py-1 px-2 rounded text-micro transition-all duration-200 ${
                splitType === "custom"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              Custom %
            </button>
            <button
              onClick={() => setSplitType("shares")}
              className={`flex-1 py-1 px-2 rounded text-micro transition-all duration-200 ${
                splitType === "shares"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-secondary hover:text-foreground"
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
                    className="flex items-center gap-2 p-3 card rounded-lg cursor-pointer hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98]"
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() => toggleMember(member.id)}
                      className="w-3.5 h-3.5"
                    />
                    <span className="flex-1 text-label">{member.name}</span>
                    {isIncluded && (
                      <span className="text-label text-secondary tabular-nums">
                        {perPerson.toFixed(decimals)}
                      </span>
                    )}
                  </label>
                );
              })}
              {membersError && (
                <div className="flex items-center gap-1 mt-1 text-micro text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  <span>{membersError}</span>
                </div>
              )}
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
                  <div key={member.id} className="flex items-center gap-2 p-3 card rounded-lg transition-shadow duration-200">
                    <span className="flex-1 text-label">{member.name}</span>
                    <input
                      value={customPercents[member.id]}
                      onChange={(e) =>
                        setCustomPercents({ ...customPercents, [member.id]: e.target.value })
                      }
                      type="number"
                      placeholder="0"
                      className="w-14 px-1.5 py-0.5 bg-input-background border border-border rounded text-micro text-right tabular-nums"
                    />
                    <span className="text-micro text-secondary">%</span>
                    <span className="text-micro text-secondary tabular-nums w-14 text-right">
                      {memberAmount.toFixed(decimals)}
                    </span>
                  </div>
                );
              })}
              <div className="px-1.5">
                <p className={`text-micro ${isSplitValid ? "text-secondary" : "text-destructive"}`}>
                Total: {totalPercent.toFixed(1)}% {!isSplitValid && "(must equal 100%)"}
              </p>
                {splitError && (
                  <div className="flex items-center gap-1 mt-1 text-micro text-destructive">
                    <AlertCircle className="w-3 h-3" />
                    <span>{splitError}</span>
                  </div>
                )}
              </div>
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
                  <div key={member.id} className="flex items-center gap-2 p-3 card rounded-lg transition-shadow duration-200">
                    <span className="flex-1 text-label">{member.name}</span>
                    <input
                      value={shares[member.id]}
                      onChange={(e) => setShares({ ...shares, [member.id]: e.target.value })}
                      type="number"
                      placeholder="1"
                      className="w-14 px-1.5 py-0.5 bg-input-background border border-border rounded text-micro text-right tabular-nums"
                    />
                    <span className="text-micro text-secondary">shares</span>
                    <span className="text-micro text-secondary tabular-nums w-14 text-right">
                      {memberAmount.toFixed(decimals)}
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
            className={`w-full py-3 rounded-lg text-body font-medium transition-all duration-200 text-center flex items-center justify-center gap-2 ${
              isValid && !isSaving
                ? "bg-accent text-white hover:opacity-90 active:scale-[0.98]"
                : "bg-muted/30 text-secondary cursor-not-allowed"
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
              <h2 className="text-label">Receipt</h2>
              <button
                onClick={() => setShowReceiptSheet(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setIsUploadingReceipt(true);
                  setReceiptUploadError(null);

                  try {
                    const { gatewayUrl } = await uploadReceipt(file);
                    setReceiptUrl(gatewayUrl);
                    setHasReceipt(true);
                    setShowReceiptSheet(false);
                  } catch (error) {
                    console.error('[AddExpense] Receipt upload failed:', error);
                    setReceiptUploadError(error instanceof Error ? error.message : 'Failed to upload receipt');
                    setHasReceipt(false);
                    setReceiptUrl(undefined);
                  } finally {
                    setIsUploadingReceipt(false);
                    // Reset file input
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                }}
              />
              
              {!hasReceipt ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingReceipt}
                  className="w-full p-6 border-2 border-dashed border-border rounded-lg hover:bg-muted transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingReceipt ? (
                    <>
                      <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                      <p className="text-micro text-secondary">Uploading to IPFS...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-secondary" />
                      <p className="text-micro text-secondary">Tap to upload receipt</p>
                    </>
                  )}
                </button>
              ) : (
                <div className="relative p-2 bg-muted rounded-lg">
                  <button
                    onClick={() => {
                      setHasReceipt(false);
                      setReceiptUrl(undefined);
                    }}
                    className="absolute top-1 right-1 p-1 bg-background rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {receiptUrl ? (
                    <img
                      src={receiptUrl}
                      alt="Receipt"
                      className="w-full h-32 object-cover rounded"
                      onError={() => {
                        // If image fails to load, show placeholder
                        setReceiptUploadError('Failed to load receipt image');
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-secondary rounded flex items-center justify-center">
                      <p className="text-micro text-secondary">Receipt preview</p>
                    </div>
                  )}
                </div>
              )}
              
              {receiptUploadError && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-micro text-destructive">{receiptUploadError}</p>
                </div>
              )}
              
              <p className="text-micro text-secondary">
                Stored on IPFS via Crust Network
              </p>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}