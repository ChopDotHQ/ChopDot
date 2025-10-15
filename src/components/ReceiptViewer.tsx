import { X, Share2, Link2 } from "lucide-react";
import { useState } from "react";
import { SecondaryButton } from "./SecondaryButton";

interface ReceiptViewerProps {
  receiptUrl?: string;
  onClose: () => void;
  onShare: () => void;
  onCopyLink: () => void;
}

export function ReceiptViewer({
  receiptUrl,
  onClose,
  onShare,
  onCopyLink,
}: ReceiptViewerProps) {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.25, 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between p-4 glass border-b-0">
        <h3 className="text-[15px]">Receipt</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Receipt Image */}
      <div className="flex-1 overflow-auto bg-muted flex items-center justify-center p-4">
        <div
          className="transition-transform origin-center"
          style={{ transform: `scale(${scale})` }}
        >
          {receiptUrl ? (
            <img
              src={receiptUrl}
              alt="Receipt"
              className="max-w-full h-auto bg-card rounded-xl shadow-lg"
            />
          ) : (
            <div className="w-64 h-80 bg-card rounded-xl shadow-lg flex items-center justify-center text-muted-foreground">
              <p className="text-[13px]">Receipt preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center justify-center gap-2 py-2 border-t border-border/30 glass">
        <button
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="px-3 py-1.5 text-[13px] glass-sm rounded-lg hover:bg-muted/50 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          −
        </button>
        <span className="text-[13px] text-muted-foreground min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="px-3 py-1.5 text-[13px] glass-sm rounded-lg hover:bg-muted/50 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          +
        </button>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border/30 space-y-2 glass">
        <div className="flex gap-2">
          <SecondaryButton onClick={onShare} fullWidth>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </SecondaryButton>
          <SecondaryButton onClick={onCopyLink} fullWidth>
            <Link2 className="w-4 h-4 mr-2" />
            Copy Link
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}