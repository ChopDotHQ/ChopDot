import { useState } from "react";
import { Wallet, Check, AlertCircle } from "lucide-react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { triggerHaptic } from "../../utils/haptics";

/**
 * Polkadot ConnectWallet Component
 * 
 * States: Idle → Connecting → Connected → Error
 * Styled to match ChopDot's compact iOS design language
 */

interface WalletOption {
  id: string;
  name: string;
  icon: "dot" | "subwallet" | "talisman" | "polkadotjs";
  installed?: boolean;
}

interface ConnectWalletProps {
  /** Current connection state */
  state?: "idle" | "connecting" | "connected" | "error";
  
  /** Connected wallet address (shortened) */
  address?: string;
  
  /** Connected wallet network */
  network?: string;
  
  /** DOT balance */
  balance?: number;
  
  /** Error message */
  errorMessage?: string;
  
  /** Callback when user clicks connect */
  onConnect?: (walletId: string) => void;
  
  /** Callback when user disconnects */
  onDisconnect?: () => void;
  
  /** Variant: inline banner or full sheet */
  variant?: "banner" | "sheet";
}

const WALLET_OPTIONS: WalletOption[] = [
  { id: "subwallet", name: "SubWallet", icon: "subwallet", installed: true },
  { id: "talisman", name: "Talisman", icon: "talisman", installed: true },
  { id: "polkadotjs", name: "Polkadot.js", icon: "polkadotjs", installed: false },
];

export function ConnectWallet({
  state = "idle",
  address,
  network = "Polkadot",
  balance,
  errorMessage,
  onConnect,
  onDisconnect,
  variant = "banner",
}: ConnectWalletProps) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  // === CONNECTED STATE ===
  if (state === "connected" && address) {
    return (
      <div className="card p-4 space-y-3">
        {/* Header with Identicon */}
        <div className="flex items-center gap-3">
          {/* Mock Polkadot Identicon (colorful circle) */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <p className="text-label text-muted truncate">Connected Wallet</p>
            <p className="text-body font-medium truncate">{address}</p>
          </div>
          
          {/* Network Badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-pink-soft">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-micro font-medium text-accent">{network}</span>
          </div>
        </div>

        {/* Balance Display */}
        {balance !== undefined && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50">
            <span className="text-label text-muted">Balance</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
              <span className="text-body font-medium">{balance.toFixed(4)} DOT</span>
            </div>
          </div>
        )}

        {/* Disconnect Button */}
        <SecondaryButton
          onClick={() => {
            triggerHaptic("light");
            onDisconnect?.();
          }}
          fullWidth
        >
          Disconnect
        </SecondaryButton>
      </div>
    );
  }

  // === ERROR STATE ===
  if (state === "error") {
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-danger" />
          </div>
          <div className="flex-1">
            <p className="text-body font-medium text-danger">Connection failed</p>
            <p className="text-caption text-muted">{errorMessage || "Please try again"}</p>
          </div>
        </div>
        <PrimaryButton
          onClick={() => {
            triggerHaptic("light");
            onConnect?.(selectedWallet || "subwallet");
          }}
          fullWidth
        >
          Retry
        </PrimaryButton>
      </div>
    );
  }

  // === CONNECTING STATE ===
  if (state === "connecting") {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-pink-soft flex items-center justify-center animate-pulse flex-shrink-0">
            <Wallet className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-body font-medium">Connecting...</p>
            <p className="text-caption text-muted">Approve connection in your wallet</p>
          </div>
        </div>
      </div>
    );
  }

  // === IDLE STATE (Banner Variant) ===
  if (variant === "banner") {
    return (
      <div className="card p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-pink-soft flex items-center justify-center flex-shrink-0">
            <Wallet className="w-4 h-4 text-accent" />
          </div>
          <p className="text-label text-muted flex-1">Connect wallet to settle on-chain</p>
          <PrimaryButton
            onClick={() => {
              triggerHaptic("light");
              onConnect?.("subwallet");
            }}
          >
            Connect
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // === IDLE STATE (Sheet Variant) - Full wallet selection ===
  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-section font-medium mb-1">Connect Wallet</h3>
        <p className="text-caption text-muted">Choose a wallet to connect to Polkadot</p>
      </div>

      {/* Wallet Options */}
      <div className="space-y-2">
        {WALLET_OPTIONS.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => {
              triggerHaptic("light");
              setSelectedWallet(wallet.id);
            }}
            disabled={!wallet.installed}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg transition-all
              ${
                selectedWallet === wallet.id
                  ? "bg-accent-pink-soft border-2 border-accent"
                  : "bg-background border border-border hover:bg-background/50"
              }
              ${!wallet.installed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {/* Wallet Icon */}
            <WalletIcon type={wallet.icon} selected={selectedWallet === wallet.id} />
            
            {/* Wallet Name */}
            <div className="flex-1 text-left">
              <p className="text-body font-medium">{wallet.name}</p>
              {!wallet.installed && (
                <p className="text-caption text-muted">Not installed</p>
              )}
            </div>

            {/* Selection Indicator */}
            {selectedWallet === wallet.id && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Network Badge */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-caption text-muted">Polkadot mainnet</span>
        <span className="text-caption text-success ml-auto">Active</span>
      </div>

      {/* Connect Button */}
      <PrimaryButton
        onClick={() => {
          triggerHaptic("medium");
          onConnect?.(selectedWallet ?? WALLET_OPTIONS[0]!.id);
        }}
        disabled={!selectedWallet}
        fullWidth
      >
        Continue
      </PrimaryButton>
    </div>
  );
}

// Wallet Icon Component (simplified - in real app would use actual wallet logos)
function WalletIcon({ type, selected }: { type: string; selected: boolean }) {
  const gradients = {
    dot: "from-pink-400 to-purple-500",
    subwallet: "from-purple-500 to-blue-500",
    talisman: "from-red-400 to-pink-500",
    polkadotjs: "from-orange-400 to-pink-500",
  };

  return (
    <div
      className={`
        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
        ${selected ? "bg-gradient-to-br" : "bg-gradient-to-br opacity-70"}
        ${gradients[type as keyof typeof gradients]}
      `}
    >
      <Wallet className="w-5 h-5 text-white" />
    </div>
  );
}
