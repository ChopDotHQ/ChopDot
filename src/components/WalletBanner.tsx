import { useAccount } from "../contexts/AccountContext";
import { getHyperbridgeUrl } from "../services/bridge/hyperbridge";
import { triggerHaptic } from "../utils/haptics";
import { useState, useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { BalanceDisplay } from "./polkadot/BalanceDisplay";

const isFlagEnabled = (value?: string) =>
  value === '1' || value?.toLowerCase() === 'true';

const enablePolkadotBalanceUI = isFlagEnabled(import.meta.env.VITE_ENABLE_POLKADOT_BALANCE_UI);

/**
 * WalletBanner - Shows wallet balance when connected
 * 
 * Note: We removed the "Connect wallet" button from here since AccountMenu in the header
 * handles all wallet connection. This banner now only shows balance when connected.
 */
export function WalletBanner() {
  const account = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previousBalance, setPreviousBalance] = useState<string | null>(null);

  // Track balance changes to show update animation
  useEffect(() => {
    if (account.balanceHuman && account.balanceHuman !== previousBalance) {
      if (previousBalance !== null && isRefreshing) {
        // Balance changed after refresh - show success indicator
        setShowSuccess(true);
        setIsRefreshing(false);
        setTimeout(() => setShowSuccess(false), 2000);
      }
      setPreviousBalance(account.balanceHuman);
    }
  }, [account.balanceHuman, previousBalance, isRefreshing]);

  // Safety timeout: reset refreshing state after 10 seconds if it gets stuck
  useEffect(() => {
    if (isRefreshing) {
      const timeout = setTimeout(() => {
        console.warn('[WalletBanner] Refresh timeout - resetting state');
        setIsRefreshing(false);
        setShowSuccess(false);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isRefreshing]);

  const handleGetDot = () => {
    triggerHaptic('light');
    const url = getHyperbridgeUrl({ dest: 'Polkadot', asset: 'DOT' });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRefresh = async () => {
    triggerHaptic('light');
    setIsRefreshing(true);
    setShowSuccess(false);

    const timeout = setTimeout(() => {
      console.warn('[WalletBanner] Refresh timeout - resetting state');
      setIsRefreshing(false);
      setShowSuccess(false);
    }, 10000);

    try {
      await account.refreshBalance();
      clearTimeout(timeout);

      setTimeout(() => {
        setIsRefreshing((current) => {
          if (current) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
            return false;
          }
          return current;
        });
      }, 500);
    } catch (error: any) {
      console.error('[WalletBanner] Refresh error:', error);
      clearTimeout(timeout);
      setIsRefreshing(false);
      setShowSuccess(false);
      console.warn('[WalletBanner] Balance refresh failed. This might be due to RPC being slow or unavailable. The balance will update automatically when the RPC responds.');
    }
  };

  // Only show banner when wallet is connected - show balance prominently
  if (account.status === 'connected' && account.balanceHuman) {
    const balance = parseFloat(account.balanceHuman);

    if (enablePolkadotBalanceUI) {
      const networkLabel = account.network === 'asset-hub' || account.network === 'polkadot'
        ? 'Asset Hub (Polkadot)'
        : account.network;

      return (
        <BalanceDisplay
          amount={balance}
          networkLabel={networkLabel || undefined}
          isRefreshing={isRefreshing}
          showSuccess={showSuccess}
          onGetMore={handleGetDot}
          onRefresh={handleRefresh}
        />
      );
    }

    return (
      <div className={`p-3 glass-sm rounded-lg border transition-all duration-200 ${
        showSuccess ? 'ring-2 ring-success/50' : ''
      }`} style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-secondary uppercase tracking-wide">Wallet Balance</p>
              <div className="flex items-center gap-2">
                <p className={`text-base font-semibold tabular-nums transition-all duration-200 ${
                  showSuccess ? 'scale-105' : ''
                }`} style={{ color: 'var(--foreground)' }}>
                  {balance.toFixed(6)} DOT
                </p>
                {isRefreshing && (
                  <Loader2 className="w-3 h-3 animate-spin text-secondary" />
                )}
                {showSuccess && !isRefreshing && (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-secondary uppercase tracking-wide">Network</p>
            <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
              {account.network === 'asset-hub' || account.network === 'polkadot'
                ? 'Asset Hub (Polkadot)'
                : account.network}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleGetDot}
            className="px-3 py-1.5 rounded-[var(--r-lg)] text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Get DOT (Hyperbridge)
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs font-semibold underline hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            style={{ color: 'var(--accent)' }}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh balance'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Don't show anything when disconnected - AccountMenu handles connection
  return null;
}
