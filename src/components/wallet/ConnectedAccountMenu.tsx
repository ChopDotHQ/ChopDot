import Identicon from '@polkadot/react-identicon';
import { Copy, ExternalLink, ChevronDown } from 'lucide-react';
import { AddressDisplay } from '../AddressDisplay';
import { getHyperbridgeUrl } from '../../services/bridge/hyperbridge';
import type { AccountState } from '../../contexts/AccountContext';

interface ConnectedAccountMenuProps {
  account: AccountState & {
    refreshBalance: () => Promise<void>;
  };
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  currentRpc: string | null;
  hasPositiveBalance: boolean;
  copyAddress: () => Promise<void>;
  onDisconnect: () => void;
}

function formatBalance(balance: string | null): string {
  if (!balance) return '0';
  const num = parseFloat(balance);
  if (num >= 1000) return num.toFixed(2);
  if (num >= 1) return num.toFixed(6);
  return num.toFixed(6);
}

function getNetworkLabel(network: string): string {
  switch (network) {
    case 'asset-hub':
    case 'polkadot':
      return 'Asset Hub (Polkadot)';
    case 'westend': return 'Westend';
    default: return 'Unknown';
  }
}

export function ConnectedAccountMenu({
  account,
  showMenu,
  setShowMenu,
  currentRpc,
  hasPositiveBalance,
  copyAddress,
  onDisconnect,
}: ConnectedAccountMenuProps) {
  const displayAddress = account.address0 || account.address || '';

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-muted transition-colors"
        style={{ borderColor: 'var(--border)' }}
      >
        <Identicon value={displayAddress} size={20} theme="polkadot" />
        <div className="flex flex-col items-start">
          <div className="text-xs font-mono font-semibold">
            {account.address0?.slice(0, 6)}...{account.address0?.slice(-4)}
          </div>
          <div className="text-[10px] opacity-60">
            {formatBalance(account.balanceHuman)} DOT
          </div>
        </div>
        <ChevronDown className="w-4 h-4 opacity-60" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-0 top-full mt-2 w-72 rounded-lg border bg-card shadow-lg z-50"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Identicon value={displayAddress} size={40} theme="polkadot" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{account.walletName || 'Connected'}</div>
                  <AddressDisplay address={displayAddress} className="text-xs opacity-70" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60">Network:</span>
                <span className="font-semibold">{getNetworkLabel(account.network)}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="opacity-60">Balance:</span>
                <span className="font-semibold">{formatBalance(account.balanceHuman)} DOT</span>
              </div>
              {import.meta.env.DEV && currentRpc && (
                <div
                  data-testid="dev-active-rpc"
                  style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}
                  className="text-xs opacity-60"
                >
                  RPC: {currentRpc}
                </div>
              )}
            </div>

            <div className="p-2">
              <button
                onClick={copyAddress}
                className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
              <button
                onClick={async () => {
                  try {
                    await account.refreshBalance();
                  } catch (error) {
                    console.error('[AccountMenu] Refresh balance failed:', error);
                  }
                }}
                className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Refresh Balance
              </button>
              {hasPositiveBalance && (
                <button
                  onClick={() => {
                    const url = getHyperbridgeUrl({
                      src: 'Polkadot',
                      asset: 'DOT',
                      dest: 'Ethereum',
                      destAsset: 'USDC',
                    });
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Bridge out (DOT → USDC)
                </button>
              )}
              <div className="border-t my-2" style={{ borderColor: 'var(--border)' }} />
              <button
                onClick={onDisconnect}
                className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors text-destructive"
              >
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
