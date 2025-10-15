/**
 * WalletConnectionSheet
 * 
 * Modal for connecting, viewing, and managing Polkadot wallet connections.
 * Supports multiple wallet providers (SubWallet, Talisman, Polkadot.js, Nova).
 */

import { Wallet, Copy, Check, X, ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";
import { triggerHaptic } from "../utils/haptics";

interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  installed?: boolean;
}

interface ConnectedWallet {
  provider: string;
  address: string;
  name?: string;
}

interface WalletConnectionSheetProps {
  isConnected: boolean;
  connectedWallet?: ConnectedWallet;
  onConnect: (provider: string) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

const WALLET_PROVIDERS: WalletProvider[] = [
  { id: "subwallet", name: "SubWallet", icon: "🟣", installed: true },
  { id: "talisman", name: "Talisman", icon: "🔮", installed: true },
  { id: "polkadot-js", name: "Polkadot.js", icon: "🔴", installed: true },
  { id: "nova", name: "Nova Wallet", icon: "⭐", installed: false },
];

export function WalletConnectionSheet({
  isConnected,
  connectedWallet,
  onConnect,
  onDisconnect,
  onClose,
}: WalletConnectionSheetProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = () => {
    if (!connectedWallet) return;
    
    navigator.clipboard.writeText(connectedWallet.address);
    setCopiedAddress(true);
    triggerHaptic('light');
    
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    onDisconnect();
    triggerHaptic('light');
  };

  const handleConnectWallet = (providerId: string) => {
    const provider = WALLET_PROVIDERS.find(w => w.id === providerId);
    if (!provider?.installed) {
      // Could show toast: "Please install {provider.name} extension"
      return;
    }
    
    onConnect(providerId);
    triggerHaptic('light');
  };

  return (
    <div className="fixed inset-0 z-50 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl animate-slideUp max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-pink-soft)' }}>
              <Wallet className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="text-screen-title">
              {isConnected ? "Wallet Connected" : "Connect Wallet"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isConnected && connectedWallet ? (
            <>
              {/* Connected Wallet Card */}
              <div className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">
                        {WALLET_PROVIDERS.find(w => w.id === connectedWallet.provider)?.icon || "🟣"}
                      </span>
                      <p className="text-body" style={{ fontWeight: 500 }}>
                        {WALLET_PROVIDERS.find(w => w.id === connectedWallet.provider)?.name || connectedWallet.provider}
                      </p>
                    </div>
                    {connectedWallet.name && (
                      <p className="text-caption text-secondary mb-2">
                        {connectedWallet.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <code className="text-label font-mono" style={{ color: 'var(--accent)' }}>
                        {shortenAddress(connectedWallet.address)}
                      </code>
                      <button
                        onClick={handleCopyAddress}
                        className="p-1 hover:bg-muted/50 rounded transition-all duration-200 active:scale-95"
                      >
                        {copiedAddress ? (
                          <Check className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-secondary" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--success)', opacity: 0.2 }}>
                    <Check className="w-5 h-5" style={{ color: 'var(--success)' }} />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="card p-3" style={{ background: 'var(--accent-pink-soft)' }}>
                <p className="text-caption text-secondary">
                  <span style={{ color: 'var(--accent)', fontWeight: 500 }}>✓ Connected</span> - You can now settle on-chain and attest expenses using Polkadot.
                </p>
              </div>

              {/* Switch Wallet */}
              <div>
                <p className="text-label text-secondary mb-2 px-1">Switch Wallet</p>
                <div className="space-y-2">
                  {WALLET_PROVIDERS.filter(w => w.installed && w.id !== connectedWallet.provider).map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => handleConnectWallet(wallet.id)}
                      className="w-full card p-3 flex items-center justify-between hover:bg-muted/50 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{wallet.icon}</span>
                        <div className="text-left">
                          <p className="text-body" style={{ fontWeight: 500 }}>
                            {wallet.name}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-secondary" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: 'var(--danger)',
                  color: '#fff',
                }}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-body" style={{ fontWeight: 500 }}>
                  Disconnect Wallet
                </span>
              </button>
            </>
          ) : (
            <>
              {/* Not Connected - Show Available Wallets */}
              <div className="card p-3" style={{ background: 'var(--accent-pink-soft)' }}>
                <p className="text-caption text-secondary">
                  Connect your Polkadot wallet to settle on-chain and attest expenses using blockchain verification.
                </p>
              </div>

              <div>
                <p className="text-label text-secondary mb-2 px-1">Available Wallets</p>
                <div className="space-y-2">
                  {WALLET_PROVIDERS.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => handleConnectWallet(wallet.id)}
                      disabled={!wallet.installed}
                      className="w-full card p-3 flex items-center justify-between hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{wallet.icon}</span>
                        <div className="text-left">
                          <p className="text-body" style={{ fontWeight: 500 }}>
                            {wallet.name}
                          </p>
                          {!wallet.installed && (
                            <p className="text-caption text-secondary">
                              Not installed
                            </p>
                          )}
                        </div>
                      </div>
                      {wallet.installed && (
                        <ChevronRight className="w-4 h-4 text-secondary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-3">
                <p className="text-caption text-secondary">
                  💡 Don't have a wallet? Install{" "}
                  <a
                    href="https://www.subwallet.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    SubWallet
                  </a>
                  {" "}or{" "}
                  <a
                    href="https://www.talisman.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Talisman
                  </a>
                  {" "}extension.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
