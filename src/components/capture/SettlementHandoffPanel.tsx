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
    <div className="rounded-[24px] bg-white/[0.055] p-5 space-y-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" data-testid={`handoff-panel-${handoff.railId}`}>
      <div>
        <p className="text-caption text-secondary">Payment app</p>
        <p className="text-screen-title font-semibold mt-1">{handoff.title}</p>
        {handoff.statusLabel && !/ready to pay/i.test(handoff.statusLabel) && (
          <p className="text-caption text-secondary mt-1" data-testid="handoff-status-label">
            {handoff.statusLabel}
          </p>
        )}
      </div>

      {handoff.railId === 'twint' && onTwintPhoneChange && (
        <div>
          <label className="text-caption text-secondary block mb-1.5">TWINT phone number</label>
          <input
            type="tel"
            value={twintPhone}
            onChange={(event) => onTwintPhoneChange(event.target.value)}
            placeholder="+41 79 123 45 67"
            className="w-full px-4 py-4 rounded-2xl bg-black/20 text-body outline-none focus-ring-pink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            data-testid="handoff-twint-phone"
          />
        </div>
      )}

      {handoff.waitingMessage && (
        <p className="text-caption text-secondary" data-testid="handoff-waiting-message">
          {handoff.waitingMessage}
        </p>
      )}

      {(handoff.railId === 'dot' || handoff.railId === 'usdc' || handoff.railId === 'pas') && (
        <div className="rounded-2xl bg-black/20 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[11px] font-semibold">1</span>
            <p className="text-caption text-secondary">Open your wallet and approve this payment.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white text-[11px] font-semibold">2</span>
            <p className="text-caption text-secondary">Return here and check that it arrived.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="px-3 py-2 rounded-xl bg-white/10 text-caption hover:bg-white/15 transition"
          data-testid="handoff-copy"
        >
          {handoff.primaryActionLabel ?? 'Copy details'}
        </button>
        {handoff.smsHref && (
          <a
            href={handoff.smsHref}
            className="px-3 py-2 rounded-xl bg-white/10 text-caption hover:bg-white/15 transition"
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
            className="px-3 py-2 rounded-xl bg-white/10 text-caption hover:bg-white/15 transition"
            data-testid="handoff-deeplink"
          >
            {handoff.railId === 'firma' ? 'Open Firma' : 'Open payment app'}
          </a>
        )}
      </div>
    </div>
  );
}
