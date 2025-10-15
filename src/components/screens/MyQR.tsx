import { X, Copy } from "lucide-react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";

interface MyQRProps {
  onClose: () => void;
  onCopyHandle: () => void;
}

export function MyQR({ onClose, onCopyHandle }: MyQRProps) {
  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-x-0 bottom-0 glass rounded-t-xl max-h-[80vh] flex flex-col animate-slideUp border-t-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-screen-title">My QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex-1 overflow-auto p-8">
          <div className="flex flex-col items-center space-y-4">
            {/* Large QR Code */}
            <div className="w-64 h-64 bg-white rounded-xl p-4 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0wIDBoN3Y3SDB6bTkgMGg3djdIOXptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3pNMCA5aDd2N0gwem05IDBoN3Y3SDl6bTkgMGg3djdoLTd6bTkgMGg3djdoLTd6bTkgMGg3djdoLTd6bTkgMGg3djdoLTd6bTkgMGg3djdoLTd6bTkgMGg3djdoLTd6TTAgMThoN3Y3SDB6bTkgMGg3djdIOXptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3ptOSAwaDd2N2gtN3oiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')] bg-contain bg-no-repeat bg-center" />
            </div>

            {/* Handle */}
            <div className="text-center">
              <p className="text-label text-secondary mb-1">Your handle</p>
              <p className="text-screen-title text-foreground">@you</p>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2 pt-4">
              <PrimaryButton onClick={onCopyHandle} fullWidth>
                <Copy className="w-4 h-4 mr-2" />
                Copy handle
              </PrimaryButton>
              <SecondaryButton onClick={onClose} fullWidth>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}