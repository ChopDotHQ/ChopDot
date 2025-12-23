import { TopBar } from "../TopBar";
import { BottomSheet } from "../BottomSheet";
import { ReceiptViewer } from "../ReceiptViewer";
import { Receipt, Check } from "lucide-react";
import { useState } from "react";
import { pushTxToast, updateTxToast } from "../../hooks/useTxToasts";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { Skeleton } from "../Skeleton";
import { formatCurrencyAmount, normalizeCurrency } from "../../utils/currencyFormat";

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
  expense?: Expense;
  members?: Member[];
  currentUserId: string;
  baseCurrency?: string; // Base currency for the pot (e.g., "DOT", "USD")
  walletConnected?: boolean;
  onBack: () => void;
  isLoading?: boolean;
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
  baseCurrency = 'USD',
  walletConnected = false,
  onBack,
  isLoading = false,
  onAttest,
  onEdit,
  onDelete,
  onSettle: _onSettle,
  onCopyReceiptLink,
  onUpdateExpense,
  onConnectWallet,
}: ExpenseDetailProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full pb-[68px] bg-background">
        <TopBar title="Expense" onBack={onBack} />
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="p-4 card space-y-3">
            <Skeleton height={12} width="25%" />
            <Skeleton height={26} width="40%" />
          </div>
          <div className="p-4 card space-y-3">
            <Skeleton height={14} width="50%" />
            <Skeleton height={14} width="70%" />
            <Skeleton height={14} width="35%" />
          </div>
          <div className="p-4 card space-y-3">
            <Skeleton height={12} width="30%" />
            <Skeleton height={16} width="60%" />
          </div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return null;
  }

  const safeMembers = members ?? [];
  const normalizedBaseCurrency = normalizeCurrency(baseCurrency);
  const isDotPot = normalizedBaseCurrency === 'DOT';
  // For DOT pots, always use baseCurrency; for others, use expense.currency if available
  const displayCurrency = isDotPot ? normalizedBaseCurrency : (expense.currency || normalizedBaseCurrency);
  const formatAmount = (amt: number) => formatCurrencyAmount(amt, displayCurrency);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const [showAttestationDetail, setShowAttestationDetail] = useState(false);
  void showAttestationDetail;
  const [isAttesting, setIsAttesting] = useState(false);
  const paidByMember = safeMembers.find(m => m.id === expense.paidBy);
  const hasAttested = expense.attestations.includes(currentUserId);
  const allAttested = expense.attestations.length === safeMembers.length;

  // Handle attestation with on-chain flow if wallet connected
  const handleAttest = async () => {
    setIsAttesting(true);
    // If wallet connected and expense was paid by someone else → on-chain attestation
    if (walletConnected && expense.paidBy !== currentUserId) {
      // State 1: Signing
      pushTxToast('signing', {
        amount: expense.amount,
        currency: displayCurrency, // Use displayCurrency for consistency
      });

      // Simulate signing delay (400ms)
      await new Promise(resolve => setTimeout(resolve, 400));

      // State 2: Broadcasting
      updateTxToast('broadcast', {
        amount: expense.amount,
        currency: displayCurrency, // Use displayCurrency for consistency
      });

      // Simulate broadcast delay (600ms)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Generate mock tx hash
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // State 3: In block
      updateTxToast('inBlock', {
        amount: expense.amount,
        currency: displayCurrency, // Use displayCurrency for consistency
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
        currency: displayCurrency, // Use displayCurrency for consistency
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
      currency: displayCurrency, // Use displayCurrency for consistency
    });

    // Simulate signing delay (400ms)
    await new Promise(resolve => setTimeout(resolve, 400));

    // State 2: Broadcasting
    updateTxToast('broadcast', {
      amount: expense.amount,
      currency: displayCurrency, // Use displayCurrency for consistency
    });

    // Simulate broadcast delay (600ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Generate mock tx hash
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // State 3: In block
    updateTxToast('inBlock', {
      amount: expense.amount,
      currency: displayCurrency, // Use displayCurrency for consistency
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
      currency: displayCurrency, // Use displayCurrency for consistency
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
          <div className="p-4 card space-y-2 transition-shadow duration-200">
            {/* Amount - Prominent */}
            <div>
              <p className="text-micro text-secondary mb-0.5">Amount</p>
              <p className="text-[22px] tabular-nums mt-0.5" style={{ fontWeight: 700 }}>
                {formatAmount(expense.amount)}
              </p>
            </div>
            
            {/* Title/Memo */}
            {expense.memo && (
              <div>
                <p className="text-micro text-secondary mb-0.5">Title</p>
                <p className="text-body mt-0.5">{expense.memo}</p>
              </div>
            )}
            
            {/* Two-column: Paid By + Date */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-micro text-secondary mb-0.5">Paid by</p>
                <p className="text-body mt-0.5">{paidByMember?.name}</p>
              </div>
              <div>
                <p className="text-micro text-secondary mb-0.5">Date</p>
                <p className="text-body mt-0.5">
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
                <p className="text-micro">Receipt</p>
              </div>
              <div className="w-full h-24 bg-secondary rounded flex items-center justify-center">
                <p className="text-micro text-secondary">Tap to view</p>
              </div>
            </button>
          )}

          {/* Split Breakdown - Checkboxes style */}
          <div className="space-y-1.5">
            <p className="text-micro text-secondary">Split breakdown</p>
            {expense.split.map(({ memberId, amount }) => {
              const member = members?.find(m => m.id === memberId);
              const isAttested = expense.attestations.includes(memberId);
              return (
                <div
                  key={memberId}
                  className="flex items-center gap-2 p-3 card rounded-lg card-hover-lift transition-shadow duration-200"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    isAttested ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {isAttested && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <span className="flex-1 text-label">{member?.name}</span>
                  <span className="text-label tabular-nums" style={{ fontWeight: 600 }}>
                    {formatAmount(amount)}
                  </span>
                </div>
              );
            })}
            <p className="text-micro text-secondary px-1.5 pt-0.5">
              {expense.attestations.length}/{members?.length || 0} confirmed
            </p>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="p-3 border-t border-border space-y-2">
          {!hasAttested && (
            <PrimaryButton
              onClick={handleAttest}
              disabled={isAttesting}
              loading={isAttesting}
              fullWidth
            >
              Confirm
            </PrimaryButton>
          )}
          {allAttested && (
            <div className="p-3 card text-center transition-shadow duration-200">
              <p className="text-micro text-secondary">All confirmed ✓</p>
            </div>
          )}
          <div className="flex gap-2">
            <SecondaryButton
              onClick={onEdit}
              fullWidth
            >
              Edit
            </SecondaryButton>
            <SecondaryButton
              onClick={() => setShowDeleteConfirm(true)}
              fullWidth
            >
              Delete
            </SecondaryButton>
          </div>
        </div>

        {/* Delete Confirmation */}
        <BottomSheet
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete expense?"
        >
          <div className="p-3 space-y-3">
            <p className="text-micro text-secondary">
              This will remove the expense and recompute all balances. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <PrimaryButton
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                fullWidth
                variant="gradient"
              >
                Delete Expense
              </PrimaryButton>
              <SecondaryButton
                onClick={() => setShowDeleteConfirm(false)}
                fullWidth
              >
                Cancel
              </SecondaryButton>
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
