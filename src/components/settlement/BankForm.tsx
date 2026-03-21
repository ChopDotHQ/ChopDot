import { memo } from 'react';
import { copyWithToast } from '../../utils/clipboard';

interface BankFormProps {
  bankReference: string;
  onBankReferenceChange: (value: string) => void;
  totalAmount: number;
  counterparty: string;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BankForm = memo(function BankForm({
  bankReference,
  onBankReferenceChange,
  totalAmount,
  counterparty,
  onShowToast,
}: BankFormProps) {
  const handleCopy = () => {
    const amountStr = `$${Math.abs(totalAmount).toFixed(2)}`;
    const details = `Bank transfer details\nAmount: ${amountStr}\nReference: ${bankReference || '(none)'}\nCounterparty: ${counterparty}`;
    copyWithToast(details, 'Bank details copied', (msg) => onShowToast(msg, 'success'));
  };

  return (
    <div className="card p-4 space-y-3">
      <div>
        <label className="text-caption text-secondary block mb-1.5">
          Payment Reference (Optional)
        </label>
        <input
          type="text"
          value={bankReference}
          onChange={(e) => onBankReferenceChange(e.target.value)}
          placeholder="e.g., Invoice #123"
          className="w-full px-3 py-2 input-field text-body"
        />
      </div>
      <p className="text-caption text-secondary">
        Bank transfer. Add a reference to help track this payment.
      </p>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCopy}
          className="px-3 py-2 rounded-lg bg-muted/20 text-caption hover:bg-muted/30 transition"
        >
          Copy bank details
        </button>
      </div>
    </div>
  );
});
