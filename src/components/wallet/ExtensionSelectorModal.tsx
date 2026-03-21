import { Wallet } from 'lucide-react';
import type { ExtensionInfo } from '../../hooks/useExtensionConnect';
import { normalizeWalletSource } from '../../services/wallet/capabilities';

interface ExtensionSelectorModalProps {
  extensions: ExtensionInfo[];
  onSelect: (source: string) => void;
  onCancel: () => void;
}

export function ExtensionSelectorModal({ extensions, onSelect, onCancel }: ExtensionSelectorModalProps) {
  const getSupportHint = (source: string) => {
    const normalized = normalizeWalletSource(source);
    if (normalized === 'talisman' || normalized === 'subwallet') {
      return 'Settlement supported. Closeout works when the same wallet exposes its EVM provider.';
    }
    if (normalized === 'polkadot-js') {
      return 'Settlement supported. Closeout is not available with Polkadot.js alone.';
    }
    return 'Settlement support depends on the accounts exposed by this wallet.';
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-md rounded-3xl border bg-card shadow-2xl overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xl font-semibold">Select wallet extension</div>
            <div className="text-sm text-secondary mt-1">Choose which wallet to connect.</div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {extensions.map((extension, idx) => (
              <button
                key={extension.source + idx}
                className="p-4 rounded-2xl border text-left transition-all hover:bg-muted/20"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => onSelect(extension.source)}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-border/40 p-2">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{extension.name}</div>
                    <div className="text-sm text-secondary mt-1">
                      Tap to connect this wallet.
                    </div>
                    <div className="text-sm text-secondary mt-2">
                      {getSupportHint(extension.source)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              className="w-full px-4 py-3 rounded-2xl border hover:bg-muted/20 transition-colors"
              style={{ borderColor: 'var(--border)' }}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
