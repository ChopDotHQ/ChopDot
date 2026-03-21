import { QrCode, Scan, User as UserIcon } from 'lucide-react';

interface ProfileCardProps {
  userName: string;
  isGuest: boolean;
  walletConnected?: boolean;
  onShowQR: () => void;
  onScanQR: () => void;
  onReceive: () => void;
  isPSA: boolean;
  psaCardClass: string;
  psaCardStyle?: React.CSSProperties;
}

export function ProfileCard({
  userName,
  isGuest,
  walletConnected,
  onShowQR,
  onScanQR,
  onReceive,
  isPSA,
  psaCardClass,
  psaCardStyle,
}: ProfileCardProps) {
  return (
    <div
      className={isPSA ? psaCardClass : 'card'}
      style={isPSA ? psaCardStyle : undefined}
    >
      <div className="flex flex-col items-center mb-4">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-3">
          <UserIcon className="w-8 h-8 text-secondary" />
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-label" style={{ fontWeight: 600 }}>{userName}</p>
            {isGuest && (
              <span className="px-2 py-0.5 rounded-full text-micro bg-muted/20 text-secondary">
                Guest
              </span>
            )}
          </div>
          <p className="text-micro text-secondary">
            {isGuest ? 'Preview mode • No data saved' : '@your_handle'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onShowQR}
          className="p-3 bg-muted/10 hover:bg-muted/20 rounded-xl transition-all duration-200 active:scale-95"
        >
          <QrCode className="w-5 h-5 mx-auto mb-1" />
          <p className="text-micro text-center">My QR</p>
        </button>
        <button
          onClick={onScanQR}
          className="p-3 bg-muted/10 hover:bg-muted/20 rounded-xl transition-all duration-200 active:scale-95"
        >
          <Scan className="w-5 h-5 mx-auto mb-1" />
          <p className="text-micro text-center">Scan</p>
        </button>
        <button
          onClick={onReceive}
          disabled={!walletConnected}
          className="p-3 bg-muted/10 hover:bg-muted/20 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <QrCode className="w-5 h-5 mx-auto mb-1" />
          <p className="text-micro text-center">Receive</p>
        </button>
      </div>
    </div>
  );
}
