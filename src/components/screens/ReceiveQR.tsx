import { X, Copy, Download } from "lucide-react";
import { useState, useEffect } from "react";
import QRCodeLib from 'qrcode';
import { triggerHaptic } from "../../utils/haptics";

interface ReceiveQRProps {
  onClose: () => void;
  walletAddress: string;
}

export function ReceiveQR({ onClose, walletAddress }: ReceiveQRProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      QRCodeLib.toDataURL(walletAddress, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).then(setQrCode).catch(console.error);
    }
  }, [walletAddress]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      triggerHaptic('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.download = `receive-${walletAddress.slice(0, 8)}.png`;
    link.href = qrCode;
    link.click();
    triggerHaptic('light');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-[420px] bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
          <h2 className="text-body font-medium">Receive DOT</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center space-y-4">
          {qrCode ? (
            <div className="w-64 h-64 bg-white rounded-xl p-4 shadow-lg">
              <img src={qrCode} alt="Receive QR Code" className="w-full h-full" />
            </div>
          ) : (
            <div className="w-64 h-64 bg-muted/20 rounded-xl flex items-center justify-center">
              <p className="text-micro text-secondary">Generating QR...</p>
            </div>
          )}

          <div className="w-full">
            <p className="text-caption text-secondary text-center mb-2">Your wallet address</p>
            <div className="p-3 bg-muted/20 rounded-lg border border-border">
              <p className="text-xs font-mono text-center break-all">{walletAddress}</p>
            </div>
          </div>

          <div className="w-full flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 px-4 py-3 bg-accent text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy address'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!qrCode}
              className="px-4 py-3 border border-border rounded-lg hover:bg-muted/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <p className="text-micro text-secondary text-center">
            Share this QR code or address to receive DOT tokens
          </p>
        </div>
      </div>
    </div>
  );
}
