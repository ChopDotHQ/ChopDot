import { memo } from 'react';
import { copyWithToast } from '../../utils/clipboard';

interface PayPalFormProps {
  paypalEmail: string;
  onPaypalEmailChange: (value: string) => void;
  totalAmount: number;
  counterparty: string;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PayPalForm = memo(function PayPalForm({
  paypalEmail,
  onPaypalEmailChange,
  totalAmount,
  counterparty,
  onShowToast,
}: PayPalFormProps) {
  const handleCopy = () => {
    const amountStr = `$${Math.abs(totalAmount).toFixed(2)}`;
    const text = `Pay ${amountStr} to ${counterparty} via PayPal (${paypalEmail || 'email'})`;
    copyWithToast(text, 'PayPal details copied', (msg) => onShowToast(msg, 'success'));
  };

  return (
    <div className="card p-4 space-y-3">
      <div>
        <label className="text-caption text-secondary block mb-1.5">
          PayPal Email
        </label>
        <input
          type="email"
          value={paypalEmail}
          onChange={(e) => onPaypalEmailChange(e.target.value)}
          placeholder="recipient@example.com"
          className="w-full px-3 py-2 input-field text-body"
        />
      </div>
      <p className="text-caption text-secondary">
        Send payment via PayPal to the recipient's email address.
      </p>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCopy}
          className="px-3 py-2 rounded-lg bg-muted/20 text-caption hover:bg-muted/30 transition"
        >
          Copy email + amount
        </button>
        {paypalEmail && (
          <a
            href={`mailto:${encodeURIComponent(paypalEmail)}?subject=${encodeURIComponent('Payment via PayPal')}&body=${encodeURIComponent('Amount: $' + Math.abs(totalAmount).toFixed(2))}`}
            className="px-3 py-2 rounded-lg bg-background border border-border text-caption hover:bg-muted/10 transition"
          >
            Open mail
          </a>
        )}
      </div>
    </div>
  );
});
