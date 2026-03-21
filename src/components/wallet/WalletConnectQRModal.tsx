import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { walletConnectLinks } from '../../config/wallet-connect-links';

interface WalletConnectQRModalProps {
  qrCode: string | null;
  uri: string | null;
  accountStatus: string;
  accountError?: string | null;
  isMobile: boolean;
  onMobileWalletClick: (walletId: string, uri?: string) => Promise<void>;
  onClose: () => void;
}

function AutoCloseQR({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return null;
}

export function WalletConnectQRModal({
  qrCode,
  uri,
  accountStatus,
  accountError,
  isMobile,
  onMobileWalletClick,
  onClose,
}: WalletConnectQRModalProps) {
  const isConnected = accountStatus === 'connected';

  if (isMobile && !qrCode) {
    return (
      <>
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-40"
          onClick={() => {
            if (accountStatus !== 'connecting') onClose();
          }}
        >
          <div
            className="bg-card rounded-t-xl p-6 w-full mx-0 border-t"
            onClick={(e) => e.stopPropagation()}
            style={{ borderColor: 'var(--border)' }}
          >
            <h3 className="text-lg font-semibold mb-2">Choose Your Wallet</h3>
            <p className="text-sm opacity-70 mb-4">
              Tap your wallet below. After approving the connection, stay inside your wallet until you confirm the signature.
            </p>
            <div className="space-y-2">
              {walletConnectLinks
                .filter(link => ['nova', 'subwallet', 'talisman'].includes(link.id))
                .map((link) => (
                  <button
                    key={link.id}
                    onClick={() => onMobileWalletClick(link.id, uri || undefined)}
                    className="w-full px-4 py-3 rounded-lg border hover:bg-muted transition-colors flex items-center gap-3"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <img src={link.icon} alt={link.label} className="w-8 h-8" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{link.label}</div>
                      {link.description && (
                        <div className="text-xs opacity-70">{link.description}</div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
            <button
              className="mt-4 w-full px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
        {isConnected && <AutoCloseQR onClose={onClose} />}
      </>
    );
  }

  return (
    <>
      <BottomSheet isOpen onClose={onClose} title="Connect via WalletConnect">
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            {accountStatus === 'connecting'
              ? 'Scan with Nova, SubWallet, or Talisman.'
              : isConnected
              ? 'Connected. Closing...'
              : accountError
              ? `Connection failed: ${accountError}`
              : 'Waiting for connection...'}
          </p>
          {accountError && (
            <div className="card p-4 border border-red-200/70 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <span className="text-sm">{accountError}</span>
              </div>
            </div>
          )}
          {qrCode && (
            <div className="card p-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <img src={qrCode} alt="WalletConnect QR Code" className="mx-auto h-56 w-56 sm:h-64 sm:w-64" />
              </div>
              <p className="mt-3 text-center text-sm text-secondary">
                Open your wallet, scan the code, and approve the connection.
              </p>
            </div>
          )}
          {isConnected && (
            <div className="card p-4 border border-green-200/70 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Successfully connected.</span>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
      {isConnected && <AutoCloseQR onClose={onClose} />}
    </>
  );
}
