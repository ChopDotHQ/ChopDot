import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { encodeCaptureQrDataUrl, type CaptureLinkPath } from '../../services/capture/QRPayloadCodec';

type CaptureQRModalProps = {
  path: CaptureLinkPath;
  token: string;
  title: string;
  onClose: () => void;
};

export function CaptureQRModal({ path, token, title, onClose }: CaptureQRModalProps) {
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    void encodeCaptureQrDataUrl(path, token)
      .then(setQrCode)
      .catch(() => setQrCode(''));
  }, [path, token]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="capture-qr-modal"
    >
      <div className="w-full max-w-[420px] bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
          <h2 className="text-body font-medium">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center space-y-4">
          {qrCode ? (
            <div className="w-64 h-64 bg-white rounded-xl p-4 shadow-lg">
              <img src={qrCode} alt="Capture QR code" className="w-full h-full" />
            </div>
          ) : (
            <div className="w-64 h-64 bg-muted/20 rounded-xl flex items-center justify-center">
              <p className="text-micro text-secondary">Generating QR…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
