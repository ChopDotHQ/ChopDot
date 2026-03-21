import { Loader2, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface WalletConnectQROverlayProps {
  qrCode: string;
  isConnecting: boolean;
  onClose: () => void;
}

export function WalletConnectQROverlay({ qrCode, isConnecting, onClose }: WalletConnectQROverlayProps) {
  const dismiss = () => { triggerHaptic('light'); onClose(); };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60] animate-fadeIn" onClick={dismiss} />
      <div className="fixed inset-x-0 bottom-0 z-[60] animate-slideUp">
        <div className="bg-card rounded-t-[24px] max-h-[90vh] flex flex-col" style={{ boxShadow: 'var(--shadow-elev)' }}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
            <h2 className="text-section">Scan QR Code</h2>
            <button onClick={dismiss} className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform">
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-body text-center text-secondary mb-2">Scan this QR code with your mobile wallet to connect</p>
              <div className="w-64 h-64 bg-white rounded-xl p-4 flex items-center justify-center shadow-lg">
                <img src={qrCode} alt="WalletConnect QR Code" className="w-full h-full" />
              </div>
              <p className="text-micro text-secondary text-center max-w-xs">Open Nova Wallet, MetaMask mobile, or another WalletConnect-compatible wallet and scan this code</p>
              {isConnecting && (
                <div className="flex items-center gap-2 text-caption text-secondary"><Loader2 className="w-4 h-4 animate-spin" /><span>Waiting for connection...</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
