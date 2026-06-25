import { copyWithToast } from '../../utils/clipboard';
import type { HandoffResult } from '../../services/capture/types/settlementAdapter';

type SettlementHandoffPanelProps = {
  handoff: HandoffResult;
  twintPhone?: string;
  onTwintPhoneChange?: (value: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
};

export function SettlementHandoffPanel({
  handoff,
  twintPhone = '',
  onTwintPhoneChange,
  onShowToast,
}: SettlementHandoffPanelProps) {
  const handleCopy = async () => {
    const ok = await copyWithToast(handoff.copyText, 'Payment details copied', (message) =>
      onShowToast?.(message, 'success'),
    );
    if (!ok) {
      onShowToast?.('Failed to copy', 'error');
    }
  };

  return (
    <div className="card p-4 space-y-3" data-testid={`handoff-panel-${handoff.railId}`}>
      <div>
        <p className="text-micro text-secondary">Payment app</p>
        <p className="text-body font-medium mt-1">{handoff.title}</p>
        <p className="text-caption text-secondary mt-1" data-testid="handoff-status-label">
          {handoff.statusLabel}
        </p>
      </div>
      <p className="text-caption text-secondary">
        Copy these details into your payment app. The receiver confirms what arrived.
      </p>

      {handoff.railId === 'twint' && onTwintPhoneChange && (
        <div>
          <label className="text-caption text-secondary block mb-1.5">TWINT phone number</label>
          <input
            type="tel"
            value={twintPhone}
            onChange={(event) => onTwintPhoneChange(event.target.value)}
            placeholder="+41 79 123 45 67"
            className="w-full px-3 py-2 input-field text-body"
            data-testid="handoff-twint-phone"
          />
        </div>
      )}

      {handoff.waitingMessage && (
        <p className="text-caption text-secondary" data-testid="handoff-waiting-message">
          {handoff.waitingMessage}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="px-3 py-2 rounded-lg bg-muted/20 text-caption hover:bg-muted/30 transition"
          data-testid="handoff-copy"
        >
          {handoff.primaryActionLabel ?? 'Copy details'}
        </button>
        {handoff.smsHref && (
          <a
            href={handoff.smsHref}
            className="px-3 py-2 rounded-lg bg-background border border-border text-caption hover:bg-muted/10 transition"
            data-testid="handoff-sms"
          >
            Open SMS
          </a>
        )}
        {handoff.deepLinkHref && (
          <a
            href={handoff.deepLinkHref}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg bg-background border border-border text-caption hover:bg-muted/10 transition"
            data-testid="handoff-deeplink"
          >
            {handoff.railId === 'firma' ? 'Open Firma' : 'Open payment app'}
          </a>
        )}
      </div>
    </div>
  );
}
