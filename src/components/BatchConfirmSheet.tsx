import { X, CheckCircle } from "lucide-react";
import { triggerHaptic } from "../utils/haptics";

interface PendingExpense {
  id: string;
  memo: string;
  amount: number;
  paidBy: string;
  potName: string;
}

interface BatchConfirmSheetProps {
  expenses: PendingExpense[];
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchConfirmSheet({ expenses, onClose, onConfirm }: BatchConfirmSheetProps) {
  const handleConfirm = () => {
    triggerHaptic('light');
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-card rounded-t-[24px] z-50 animate-slideUp max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(25, 195, 125, 0.1)' }}
            >
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <h2 className="text-section" style={{ fontWeight: 600 }}>
                Confirm {expenses.length} expense{expenses.length > 1 ? 's' : ''}?
              </h2>
              <p className="text-caption text-muted">
                Review before confirming
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/10 rounded-lg transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Scrollable expense list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                style={{ background: 'var(--secondary)' }}
              >
                {/* Checkmark icon (always checked in v1) */}
                <div className="mt-0.5 shrink-0">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)' }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                </div>

                {/* Expense details */}
                <div className="flex-1 min-w-0">
                  <p className="text-body" style={{ fontWeight: 500 }}>
                    {expense.memo}
                  </p>
                  <p className="text-caption text-secondary mt-0.5">
                    {expense.potName} • Paid by {expense.paidBy}
                  </p>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  <p className="text-body tabular-nums" style={{ fontWeight: 600 }}>
                    ${expense.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="p-4 border-t border-border shrink-0 space-y-2">
          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-98"
            style={{ 
              background: 'var(--success)',
              color: '#FFFFFF',
              fontWeight: 600,
            }}
          >
            Confirm All ({expenses.length})
          </button>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl transition-all duration-200 active:scale-98"
            style={{ 
              background: 'var(--secondary)',
              color: 'var(--foreground)',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
