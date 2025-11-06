import { useAccount } from "../contexts/AccountContext";

/**
 * WalletBanner - Shows wallet balance when connected
 * 
 * Note: We removed the "Connect wallet" button from here since AccountMenu in the header
 * handles all wallet connection. This banner now only shows balance when connected.
 */
export function WalletBanner() {
  const account = useAccount();

  // Only show banner when wallet is connected - show balance prominently
  if (account.status === 'connected' && account.balanceHuman) {
    const balance = parseFloat(account.balanceHuman);
    return (
      <div className="p-3 glass-sm rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-secondary uppercase tracking-wide">Wallet Balance</p>
              <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                      {balance.toFixed(6)} DOT
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-secondary uppercase tracking-wide">Network</p>
            <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
              {account.network === 'asset-hub' ? 'Asset Hub' : 
               account.network === 'polkadot' ? 'Relay Chain' : 
               account.network}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything when disconnected - AccountMenu handles connection
  return null;
}