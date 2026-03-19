import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
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
      <div
        className="fixed inset-0 z-40"
        onClick={() => {
          if (accountStatus !== 'connecting') onClose();
        }}
      />
      <div
        className="absolute right-0 top-full mt-2 w-[22rem] rounded-lg border bg-card shadow-lg z-50"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-sm font-semibold">Connect via WalletConnect</div>
          <div className="text-[11px] opacity-70 mt-1">
            {accountStatus === 'connecting'
              ? 'Scan with Nova, SubWallet, or Talisman'
              : isConnected
              ? 'Connected! Closing...'
              : accountError
              ? `Connection failed: ${accountError}`
              : 'Waiting for connection...'}
          </div>
        </div>
        <div className="p-3">
          {accountError && (
            <div className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <span className="text-xs">{accountError}</span>
              </div>
            </div>
          )}
          {qrCode && (
            <div className="flex justify-center mb-3 p-2 bg-white rounded-lg">
              <img src={qrCode} alt="WalletConnect QR Code" className="w-56 h-56" />
            </div>
          )}
          {isConnected && (
            <div className="mb-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Successfully connected!</span>
              </div>
            </div>
          )}
          <button
            className="w-full px-3 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            onClick={onClose}
          >
            {isConnected ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
      {isConnected && <AutoCloseQR onClose={onClose} />}
    </>
  );
}
