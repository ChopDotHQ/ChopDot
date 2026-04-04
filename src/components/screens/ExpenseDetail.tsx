import { TopBar } from "../TopBar";
import { BottomSheet } from "../BottomSheet";
import { ReceiptViewer } from "../ReceiptViewer";
import { Receipt } from "lucide-react";
import { useState } from "react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { Skeleton } from "../Skeleton";
import { formatCurrencyAmount, normalizeCurrency } from "../../utils/currencyFormat";
import { copyWithToast } from "../../utils/clipboard";
import { toast } from "sonner";

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
}

interface ExpenseDetailProps {
  expense?: Expense;
  members?: Member[];
  currentUserId: string;
  baseCurrency?: string; // Base currency for the pot (e.g., "DOT", "USD")
  onBack: () => void;
  isLoading?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopyReceiptLink?: () => void;
}

export function ExpenseDetail({
  expense,
  members,
  currentUserId: _currentUserId,
  baseCurrency = 'USD',
  onBack,
  isLoading = false,
  onEdit,
  onDelete,
  onCopyReceiptLink,
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
  const displayCurrency = expense.currency || normalizedBaseCurrency;
  const formatAmount = (amt: number) => formatCurrencyAmount(amt, displayCurrency);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const paidByMember = safeMembers.find(m => m.id === expense.paidBy);

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };
  void handleDelete;

  const handleShareReceipt = () => {};

  const handleCopyReceiptLink = async () => {
    const ok = await copyWithToast(
      `https://chopdot.app/receipt/${expense.id}`,
      'Receipt link copied',
      (msg) => toast.success(msg)
    );
    if (ok) onCopyReceiptLink?.();
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

          {/* Split breakdown */}
          <div className="space-y-1.5">
            <p className="text-micro text-secondary">Split breakdown</p>
            {expense.split.map(({ memberId, amount }) => {
              const member = members?.find(m => m.id === memberId);
              return (
                <div
                  key={memberId}
                  className="flex items-center gap-2 p-3 card rounded-lg card-hover-lift transition-shadow duration-200"
                >
                  <span className="flex-1 text-label">{member?.name}</span>
                  <span className="text-label tabular-nums" style={{ fontWeight: 600 }}>
                    {formatAmount(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compact Footer */}
        <div className="p-3 border-t border-border space-y-2">
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
