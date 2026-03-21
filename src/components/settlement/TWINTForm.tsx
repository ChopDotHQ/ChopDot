import { memo } from 'react';
import { copyWithToast } from '../../utils/clipboard';

interface TWINTFormProps {
  twintPhone: string;
  onTwintPhoneChange: (value: string) => void;
  totalAmount: number;
  counterparty: string;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TWINTForm = memo(function TWINTForm({
  twintPhone,
  onTwintPhoneChange,
  totalAmount,
  counterparty,
  onShowToast,
}: TWINTFormProps) {
  const handleCopy = () => {
    const amountStr = `$${Math.abs(totalAmount).toFixed(2)}`;
    const text = `TWINT payment: ${amountStr} to ${twintPhone || 'phone'} (${counterparty})`;
    copyWithToast(text, 'TWINT details copied', (msg) => onShowToast(msg, 'success'));
  };

  return (
    <div className="card p-4 space-y-3">
      <div>
        <label className="text-caption text-secondary block mb-1.5">
          TWINT Phone Number
        </label>
        <input
          type="tel"
          value={twintPhone}
          onChange={(e) => onTwintPhoneChange(e.target.value)}
          placeholder="+41 79 123 45 67"
          className="w-full px-3 py-2 input-field text-body"
        />
      </div>
      <p className="text-caption text-secondary">
        Send payment via TWINT to the recipient's mobile number.
      </p>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCopy}
          className="px-3 py-2 rounded-lg bg-muted/20 text-caption hover:bg-muted/30 transition"
        >
          Copy phone + amount
        </button>
        {twintPhone && (
          <a
            href={`sms:${encodeURIComponent(twintPhone)}?&body=${encodeURIComponent('Amount: $' + Math.abs(totalAmount).toFixed(2))}`}
            className="px-3 py-2 rounded-lg bg-background border border-border text-caption hover:bg-muted/10 transition"
          >
            Open SMS
          </a>
        )}
      </div>
    </div>
  );
});
