import { X, Camera } from "lucide-react";
import { SecondaryButton } from "../SecondaryButton";

interface ScanQRProps {
  onClose: () => void;
}

export function ScanQR({ onClose }: ScanQRProps) {
  return (
    <div className="absolute inset-0 z-50 bg-background animate-fadeIn">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 glass z-10 border-b-0">
        <h2 className="text-[17px]">Scan QR Code</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-all duration-200 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-[300px] aspect-square bg-muted rounded-xl flex items-center justify-center relative overflow-hidden">
          {/* Mock camera view */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-secondary opacity-50" />
          
          {/* Scanning frame */}
          <div className="relative z-10 w-48 h-48 border-4 border-primary rounded-xl">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
          </div>

          {/* Camera icon */}
          <Camera className="absolute w-12 h-12 text-muted-foreground opacity-20" />
        </div>

        <p className="text-[15px] text-muted-foreground mt-6 text-center">
          Point camera at QR code
        </p>

        <div className="mt-8 w-full max-w-[300px]">
          <SecondaryButton onClick={onClose} fullWidth>
            Cancel
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}