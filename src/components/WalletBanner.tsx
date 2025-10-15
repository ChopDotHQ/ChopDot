import { PrimaryButton } from "./PrimaryButton";

interface WalletBannerProps {
  isConnected: boolean;
  dotBalance?: number;
  usdtBalance?: number;
  onConnect: () => void;
}

export function WalletBanner({
  isConnected,
  dotBalance = 245.8,
  usdtBalance = 1204,
  onConnect,
}: WalletBannerProps) {
  if (isConnected) {
    return (
      <div className="p-2 glass-sm rounded-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
            <span>{dotBalance} DOT</span>
          </div>
          <span style={{ color: 'var(--text-secondary)' }}>•</span>
          <div className="flex items-center gap-1 text-[11px] text-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex-shrink-0" />
            <span>{usdtBalance.toLocaleString()} USDT</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 glass-sm rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] flex-1" style={{ color: "var(--text-secondary)" }}>
          Connect wallet to settle on-chain
        </p>
        <PrimaryButton onClick={onConnect}>Connect wallet</PrimaryButton>
      </div>
    </div>
  );
}