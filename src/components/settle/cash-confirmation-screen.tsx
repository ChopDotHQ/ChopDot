import { Banknote } from 'lucide-react';

interface CashConfirmationScreenProps {
  isPaying: boolean;
  formattedAmount: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CashConfirmationScreen({
  isPaying,
  formattedAmount,
  onConfirm,
  onCancel,
}: CashConfirmationScreenProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
          <Banknote className="w-8 h-8" style={{ color: 'var(--success)' }} />
        </div>
        <div className="space-y-2">
          <h2 className="text-heading font-semibold">
            {isPaying ? 'Confirm cash payment' : 'Confirm cash collected'}
          </h2>
          <p className="text-[32px] font-bold tabular-nums">{formattedAmount}</p>
          <p className="text-caption text-secondary">
            {isPaying
              ? 'Mark that you paid this amount in cash.'
              : 'Mark that you received this amount in cash.'}
          </p>
        </div>
      </div>
      <div className="p-4 space-y-2 border-t border-border">
        <button
          onClick={onConfirm}
          className="w-full py-3 rounded-xl bg-[var(--success)] text-white text-body font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {isPaying ? 'Yes, I paid cash' : 'Yes, I collected cash'}
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-xl border border-border text-body text-secondary hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
