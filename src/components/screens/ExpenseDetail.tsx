import { TopBar } from "../TopBar";
import { BottomSheet } from "../BottomSheet";
import { ReceiptViewer } from "../ReceiptViewer";
import { Receipt, Check } from "lucide-react";
import { useState } from "react";
import { pushTxToast, updateTxToast } from "../../hooks/useTxToasts";

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
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[];
  hasReceipt: boolean;
  receiptUrl?: string;
  attestationTxHash?: string;
  attestationTimestamp?: string;
}

interface ExpenseDetailProps {
  expense: Expense;
  members: Member[];
  currentUserId: string;
  walletConnected?: boolean;
  onBack: () => void;
  onAttest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSettle?: () => void;
  onCopyReceiptLink?: () => void;
  onUpdateExpense?: (updates: Partial<Expense>) => void;
  onConnectWallet?: () => void;
}

export function ExpenseDetail({
  expense,
  members,
  currentUserId,
  walletConnected = false,
  onBack,
  onAttest,
  onEdit,
  onDelete,
  onSettle: _onSettle,
  onCopyReceiptLink,
  onUpdateExpense,
  onConnectWallet,
}: ExpenseDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const [showAttestationDetail, setShowAttestationDetail] = useState(false);
  void showAttestationDetail;
  const [isAttesting, setIsAttesting] = useState(false);
  const paidByMember = members.find(m => m.id === expense.paidBy);
  const hasAttested = expense.attestations.includes(currentUserId);
  const allAttested = expense.attestations.length === members.length;

  // Handle attestation with on-chain flow if wallet connected
  const handleAttest = async () => {
    setIsAttesting(true);
    // If wallet connected and expense was paid by someone else → on-chain attestation
    if (walletConnected && expense.paidBy !== currentUserId) {
      // State 1: Signing
      pushTxToast('signing', {
        amount: expense.amount,
        currency: expense.currency,
      });

      // Simulate signing delay (400ms)
      await new Promise(resolve => setTimeout(resolve, 400));

      // State 2: Broadcasting
      updateTxToast('broadcast', {
        amount: expense.amount,
        currency: expense.currency,
      });

      // Simulate broadcast delay (600ms)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Generate mock tx hash
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // State 3: In block
      updateTxToast('inBlock', {
        amount: expense.amount,
        currency: expense.currency,
        txHash: mockTxHash,
        fee: 0.0018,
        feeCurrency: 'DOT',
      });

      // Simulate in-block delay (1000ms)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // State 4: Finalized (auto-dismiss after 1.5s)
      const mockBlockNumber = Math.floor(Math.random() * 1000000) + 18000000;
      updateTxToast('finalized', {
        amount: expense.amount,
        currency: expense.currency,
        txHash: mockTxHash,
        fee: 0.0018,
        feeCurrency: 'DOT',
        blockNumber: mockBlockNumber,
      });

      // Wait for auto-dismiss, then call onAttest
      setTimeout(() => {
        onAttest();
        setIsAttesting(false);
      }, 1500);

      return;
    }

    // Off-chain attestation (wallet not connected or you paid)
    // Simulate a brief delay for off-chain attestation
    await new Promise(resolve => setTimeout(resolve, 600));
    onAttest();
    setIsAttesting(false);
  };

  // Handle anchoring expense to blockchain
  const _handleAnchorNow = async () => {
    if (!walletConnected) {
      onConnectWallet?.();
      return;
    }

    // Close attestation detail overlay
    setShowAttestationDetail(false);

    // Build expense hash (mock - in production would use actual crypto library)
    // const expenseHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    // State 1: Signing
    pushTxToast('signing', {
      amount: expense.amount,
      currency: expense.currency,
    });

    // Simulate signing delay (400ms)
    await new Promise(resolve => setTimeout(resolve, 400));

    // State 2: Broadcasting
    updateTxToast('broadcast', {
      amount: expense.amount,
      currency: expense.currency,
    });

    // Simulate broadcast delay (600ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Generate mock tx hash
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // State 3: In block
    updateTxToast('inBlock', {
      amount: expense.amount,
      currency: expense.currency,
      txHash: mockTxHash,
      fee: 0.0018,
      feeCurrency: 'DOT',
    });

    // Simulate in-block delay (1000ms)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // State 4: Finalized (auto-dismiss after 1.5s)
    const mockBlockNumber = Math.floor(Math.random() * 1000000) + 18000000;
    updateTxToast('finalized', {
      amount: expense.amount,
      currency: expense.currency,
      txHash: mockTxHash,
      fee: 0.0018,
      feeCurrency: 'DOT',
      blockNumber: mockBlockNumber,
    });

    // Wait for auto-dismiss, then update expense with attestation data
    setTimeout(() => {
      onUpdateExpense?.({
        attestationTxHash: mockTxHash,
        attestationTimestamp: new Date().toISOString(),
      });
      
      // Reopen attestation detail in anchored state
      setTimeout(() => {
        setShowAttestationDetail(true);
      }, 200);
    }, 1500);
  };
  void _handleAnchorNow;

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };
  void handleDelete;

  const handleShareReceipt = () => {};

  const handleCopyReceiptLink = () => {
    navigator.clipboard.writeText(`https://chopdot.app/receipt/${expense.id}`);
    onCopyReceiptLink?.();
  };

  return (
    <>
      <div className="flex flex-col h-full pb-[68px] bg-background">
        <TopBar title="Expense" onBack={onBack} />
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Main Info - Two column layout like Tricount */}
          <div className="p-2 glass-sm rounded-lg space-y-2">
            {/* Amount - Prominent */}
            <div>
              <p className="text-xs text-secondary">Amount</p>
              <p className="text-base mt-0.5" style={{ fontWeight: 500 }}>
                ${expense.amount.toFixed(2)}
              </p>
            </div>
            
            {/* Title/Memo */}
            {expense.memo && (
              <div>
                <p className="text-xs text-secondary">Title</p>
                <p className="text-sm mt-0.5">{expense.memo}</p>
              </div>
            )}
            
            {/* Two-column: Paid By + Date */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-xs text-secondary">Paid by</p>
                <p className="text-sm mt-0.5">{paidByMember?.name}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Date</p>
                <p className="text-sm mt-0.5">
                  {new Date(expense.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt - Compact */}
          {expense.hasReceipt && (
            <button
              onClick={() => setShowReceiptViewer(true)}
              className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors w-full"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Receipt className="w-3.5 h-3.5" />
                <p className="text-xs">Receipt</p>
              </div>
              <div className="w-full h-24 bg-secondary rounded flex items-center justify-center">
                <p className="text-xs text-secondary">Tap to view</p>
              </div>
            </button>
          )}

          {/* Split Breakdown - Checkboxes style */}
          <div className="space-y-1.5">
            <p className="text-xs text-secondary">Split breakdown</p>
            {expense.split.map(({ memberId, amount }) => {
              const member = members.find(m => m.id === memberId);
              const isAttested = expense.attestations.includes(memberId);
              return (
                <div
                  key={memberId}
                  className="flex items-center gap-2 p-1.5 glass-sm rounded-lg"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    isAttested ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {isAttested && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <span className="flex-1 text-xs">{member?.name}</span>
                  <span className="text-xs tabular-nums" style={{ fontWeight: 500 }}>
                    ${amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-secondary px-1.5 pt-0.5">
              {expense.attestations.length}/{members.length} confirmed
            </p>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="p-3 border-t border-border space-y-2">
          {!hasAttested && (
            <button
              onClick={handleAttest}
              disabled={isAttesting}
              className={`w-full py-2 glass-sm rounded-lg border-2 border-border text-sm transition-all duration-200 text-center flex items-center justify-center gap-2 ${
                isAttesting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-muted/50 active:scale-[0.98]'
              }`}
            >
              {isAttesting && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              )}
              <span style={{ opacity: isAttesting ? 0.9 : 1 }}>Confirm</span>
            </button>
          )}
          {allAttested && (
            <div className="p-1.5 bg-muted rounded-lg text-center">
              <p className="text-xs text-secondary">All confirmed ✓</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 py-2 glass-sm rounded-lg border-2 border-border text-sm hover:bg-muted/50 transition-all duration-200 active:scale-95 text-center"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 py-2 glass-sm rounded-lg border-2 border-border text-sm hover:bg-muted/50 transition-all duration-200 active:scale-95 text-center"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        <BottomSheet
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete expense?"
        >
          <div className="p-3 space-y-3">
            <p className="text-xs text-secondary">
              This will remove the expense and recompute all balances. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                className="w-full py-2 glass-sm rounded-lg border-2 border-border text-sm hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] text-center"
              >
                Delete Expense
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-2 glass-sm rounded-lg border-2 border-border text-sm hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </BottomSheet>
      </div>

      {/* Receipt Viewer */}
      {showReceiptViewer && (
        <ReceiptViewer
          receiptUrl={expense.receiptUrl}
          onClose={() => setShowReceiptViewer(false)}
          onShare={handleShareReceipt}
          onCopyLink={handleCopyReceiptLink}
        />
      )}
    </>
  );
}