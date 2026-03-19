import { Wallet } from 'lucide-react';
import type { ExtensionInfo } from '../../hooks/useExtensionConnect';

interface ExtensionSelectorModalProps {
  extensions: ExtensionInfo[];
  onSelect: (source: string) => void;
  onCancel: () => void;
}

export function ExtensionSelectorModal({ extensions, onSelect, onCancel }: ExtensionSelectorModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onCancel}
      />
      <div
        className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-card shadow-lg z-50"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-sm font-semibold">Select Wallet Extension</div>
          <div className="text-xs opacity-70 mt-1">Choose which wallet to connect:</div>
        </div>
        <div className="p-2 flex flex-col gap-2">
          {extensions.map((extension, idx) => (
            <button
              key={extension.source + idx}
              className="p-3 rounded-lg border text-left transition-all hover:bg-muted"
              style={{ borderColor: 'var(--border)' }}
              onClick={() => onSelect(extension.source)}
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{extension.name}</div>
                  <div className="text-[11px] opacity-70 mt-1">
                    {extension.accounts.length} account{extension.accounts.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            className="w-full px-3 py-2 rounded-md border hover:bg-muted transition-colors"
            style={{ borderColor: 'var(--border)' }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
