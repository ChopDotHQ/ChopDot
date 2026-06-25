import { useState } from 'react';
import { walletPassService } from '../../services/capture/WalletPassService';
import { CaptureQRModal } from './CaptureQRModal';
import { copyWithToast } from '../../utils/clipboard';

type AddToWalletButtonProps = {
  potId: string;
  chapterId: string;
  spendCardId: string;
  payerId: string;
  label: string;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
};

export function AddToWalletButton({
  potId,
  chapterId,
  spendCardId,
  payerId,
  label,
  onShowToast,
}: AddToWalletButtonProps) {
  const [loading, setLoading] = useState(false);
  const [spendToken, setSpendToken] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const result = await walletPassService.requestRemotePass({
        potId,
        chapterId,
        spendCardId,
        payerId,
        label,
      });
      setSpendToken(result.token);
      const copied = await copyWithToast(result.spendUrl, 'Spend link copied', (message) =>
        onShowToast?.(message, 'success'),
      );
      if (!copied) {
        onShowToast?.(result.message, 'info');
      } else {
        onShowToast?.(`${result.message} Link copied — scan QR or save to Home Screen.`, 'success');
      }
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Could not create wallet pass', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-border text-caption disabled:opacity-50"
          data-testid="capture-add-to-wallet"
          onClick={() => void handleAdd()}
        >
          Add to Wallet
        </button>
        {spendToken && (
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-border text-caption"
            data-testid="capture-wallet-qr"
            onClick={() => setShowQr(true)}
          >
            Wallet QR
          </button>
        )}
      </div>
      <p className="text-caption text-secondary">Launcher pass — not a bank card.</p>
      {showQr && spendToken && (
        <CaptureQRModal
          path="spend"
          token={spendToken}
          title="Scan to open spend card"
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  );
}
