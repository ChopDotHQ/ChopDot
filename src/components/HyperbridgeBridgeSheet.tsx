import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';
import { getHyperbridgeUrl } from '../services/bridge/hyperbridge';
import { triggerHaptic } from '../utils/haptics';

interface HyperbridgeBridgeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBridgeComplete?: () => void; // Callback when bridging completes
  dest?: string;
  asset?: string;
}

/**
 * Embedded Hyperbridge bridge interface component.
 * Displays Hyperbridge's bridge app in an iframe for seamless in-app experience.
 */
export function HyperbridgeBridgeSheet({
  isOpen,
  onClose,
  onBridgeComplete,
  dest = 'Polkadot',
  asset = 'DOT',
}: HyperbridgeBridgeSheetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const account = useAccount();

  // Build Hyperbridge URL with parameters
  const bridgeUrl = getHyperbridgeUrl({ dest, asset });

  // Debug logging (only in development)
  useEffect(() => {
    if (isOpen && process.env.NODE_ENV === 'development') {
      console.log('[HyperbridgeBridgeSheet] Opening with URL:', bridgeUrl);
    }
  }, [isOpen, bridgeUrl]);

  // Listen for postMessage events from Hyperbridge iframe
  // NOTE: Hyperbridge's postMessage format is undocumented. This listener attempts
  // common event patterns, but may need adjustment based on actual Hyperbridge API.
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from Hyperbridge domain
      if (!event.origin.includes('hyperbridge.network')) {
        return;
      }

      // Log all messages for debugging (remove in production if too verbose)
      if (process.env.NODE_ENV === 'development') {
        console.log('[HyperbridgeBridgeSheet] Received postMessage:', event.data);
      }

      // Handle bridge completion events
      // Try multiple possible event formats:
      const data = event.data;
      const isComplete = 
        data?.type === 'bridge-complete' ||
        data?.type === 'transaction-complete' ||
        data?.type === 'bridge:complete' ||
        data?.event === 'bridge-complete' ||
        data?.status === 'complete' ||
        data?.status === 'success';

      if (isComplete) {
        triggerHaptic('success');
        onBridgeComplete?.();
        // Optionally close the sheet after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, onBridgeComplete, onClose]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Handle iframe errors
  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Open in new tab as fallback
  const handleOpenInNewTab = () => {
    triggerHaptic('light');
    window.open(bridgeUrl, '_blank', 'noopener,noreferrer');
  };

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-background rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Bridge with Hyperbridge</h2>
              <p className="text-xs text-secondary">
                {asset} to {dest}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInNewTab}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Unable to load bridge</h3>
              <p className="text-sm text-secondary mb-4">
                There was an error loading the Hyperbridge interface.
              </p>
              <button
                onClick={handleOpenInNewTab}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
              >
                Open in new tab instead
              </button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-secondary">Loading bridge interface...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={bridgeUrl}
                className="w-full h-full border-0"
                title="Hyperbridge Bridge"
                allow="clipboard-read; clipboard-write; payment; camera; microphone"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                onLoad={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[HyperbridgeBridgeSheet] Iframe loaded');
                  }
                  handleIframeLoad();
                }}
                onError={(e) => {
                  console.error('[HyperbridgeBridgeSheet] Iframe error:', e);
                  handleIframeError();
                }}
                style={{ display: isLoading ? 'none' : 'block' }}
              />
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border bg-muted/30">
          <p className="text-xs text-secondary text-center">
            {account.status === 'connected' ? (
              <>Wallet connected: {account.address0?.slice(0, 8)}...{account.address0?.slice(-6)}</>
            ) : (
              <>Connect your wallet in the bridge interface to proceed</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
