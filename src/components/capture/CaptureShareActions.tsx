import { useState } from 'react';
import { deliverText } from '../../utils/delivery';
import { encodeCaptureUrl, type CaptureLinkPath } from '../../services/capture/QRPayloadCodec';
import { CaptureQRModal } from './CaptureQRModal';
import { copyWithToast } from '../../utils/clipboard';

type CaptureShareActionsProps = {
  path: CaptureLinkPath;
  token: string;
  shareText: string;
  variant?: 'default' | 'compact';
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
};

export function CaptureShareActions({
  path,
  token,
  shareText,
  variant = 'default',
  onShowToast,
}: CaptureShareActionsProps) {
  const [showQr, setShowQr] = useState(false);
  const url = encodeCaptureUrl(path, token);

  const handleShare = async () => {
    try {
      const mode = await deliverText({ title: 'ChopDot', text: shareText });
      if (mode === 'clipboard') {
        onShowToast?.('Link copied to clipboard', 'success');
      } else if (mode === 'none') {
        onShowToast?.('Could not share — try copy link', 'info');
      }
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Share cancelled', 'info');
    }
  };

  const handleCopy = async () => {
    const ok = await copyWithToast(url, 'Link copied', (message) =>
      onShowToast?.(message, 'success'),
    );
    if (!ok) {
      onShowToast?.('Could not copy link', 'error');
    }
  };

  return (
    <>
      <div className={variant === 'compact' ? 'grid grid-cols-[1fr_auto_auto] gap-2' : 'flex flex-wrap gap-2'}>
        <button
          type="button"
          className={variant === 'compact'
            ? 'btn-primary px-3 py-2 text-caption'
            : 'px-3 py-2 rounded-lg border border-border text-caption'}
          data-testid="capture-share-link"
          onClick={() => void handleShare()}
        >
          {variant === 'compact' ? 'Share' : 'Share link'}
        </button>
        <button
          type="button"
          className={variant === 'compact'
            ? 'px-3 py-2 rounded-xl text-caption bg-white border border-border'
            : 'px-3 py-2 rounded-lg border border-border text-caption'}
          data-testid="capture-copy-link"
          onClick={() => void handleCopy()}
        >
          Copy
        </button>
        <button
          type="button"
          className={variant === 'compact'
            ? 'px-3 py-2 rounded-xl text-caption bg-white border border-border'
            : 'px-3 py-2 rounded-lg border border-border text-caption'}
          data-testid="capture-show-qr"
          onClick={() => setShowQr(true)}
        >
          QR
        </button>
      </div>
      {showQr && (
        <CaptureQRModal
          path={path}
          token={token}
          title="Scan to open"
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  );
}
