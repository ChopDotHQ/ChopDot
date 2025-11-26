/**
 * AccountMenu - Unified wallet connection button and dropdown
 * 
 * Displays in header:
 * - If disconnected: "Connect Wallet" button
 * - If connected: Shortened address, network badge, balance, dropdown menu
 */

import { useState, useEffect } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { Wallet, Copy, ExternalLink, ChevronDown, CheckCircle, QrCode } from 'lucide-react';
import Identicon from '@polkadot/react-identicon';
import QRCode from 'qrcode';
import { AddressDisplay } from './AddressDisplay';
import { getHyperbridgeUrl } from '../services/bridge/hyperbridge';
import { chain } from '../services/chain';
import { useIsMobile } from './ui/use-mobile';
import { walletConnectLinks } from '../config/wallet-connect-links';

// Helper component to auto-close QR modal after connection
function AutoCloseQR({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return null;
}

export function AccountMenu() {
  const account = useAccount();
  const isMobile = useIsMobile();
  const [showMenu, setShowMenu] = useState(false);
  const [showExtensionSelector, setShowExtensionSelector] = useState(false);
  const [showNovaQR, setShowNovaQR] = useState(false);
  const [novaQRCode, setNovaQRCode] = useState<string | null>(null);
  const [novaURI, setNovaURI] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Reset connecting state and close modals when account status changes
  useEffect(() => {
    if (account.status === 'connected' || account.status === 'disconnected') {
      setConnecting(false);
      // Close QR modal when disconnected
      if (account.status === 'disconnected') {
        setShowNovaQR(false);
        setNovaQRCode(null);
        setNovaURI(null);
        setShowExtensionSelector(false);
        setAvailableExtensions([]);
        setAvailableAccounts([]);
        setSelectedExtension(null);
      }
    }
  }, [account.status]);

  // Handle connection errors
  useEffect(() => {
    if (account.error && connecting) {
      setConnecting(false);
      // Close QR modal if there's an error
      if (showNovaQR) {
        setShowNovaQR(false);
        setNovaQRCode(null);
        setNovaURI(null);
      }
    }
  }, [account.error, connecting, showNovaQR]);
  const [availableExtensions, setAvailableExtensions] = useState<Array<{ name: string; source: string; accounts: Array<{ address: string; name?: string; source?: string }> }>>([]);
  const [, setAvailableAccounts] = useState<Array<{ address: string; name?: string; source?: string }>>([]);
  const [, setSelectedExtension] = useState<string | null>(null);
  const hasPositiveBalance = account.balanceHuman ? parseFloat(account.balanceHuman) > 0 : false;

  const handleConnectExtension = async () => {
    setShowMenu(false);
    setConnecting(true);
    
    try {
      // Show extension selector first
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      const extensions = await web3Enable('ChopDot');
      
      if (extensions.length === 0) {
        throw new Error('No wallet extension found. Install SubWallet, Talisman, or Polkadot.js.');
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in your wallet.');
      }

      // Group accounts by extension
      const accountsByExtension = new Map<string, Array<{ address: string; name?: string; source?: string }>>();
      
      accounts.forEach(acc => {
        const source = acc.meta.source || 'unknown';
        if (!accountsByExtension.has(source)) {
          accountsByExtension.set(source, []);
        }
        accountsByExtension.get(source)!.push({
          address: acc.address,
          name: acc.meta.name,
          source: acc.meta.source,
        });
      });

      // Map to extension list
      const walletNameMap: Record<string, string> = {
        'subwallet-js': 'SubWallet',
        'subwallet': 'SubWallet',
        'talisman': 'Talisman',
        'polkadot-js': 'Polkadot.js',
        'polkadot{.js}': 'Polkadot.js',
        'polkagate': 'PolkaGate',
        'polkagate-extension': 'PolkaGate',
        'metamask': 'MetaMask',
      };

      const extensionList = Array.from(accountsByExtension.entries())
        .map(([source, accs]) => ({
          name: walletNameMap[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1),
          source,
          accounts: accs,
        }));

      setAvailableExtensions(extensionList);
      setShowExtensionSelector(true);
    } catch (error) {
      // Error handled in context
      setConnecting(false);
    }
  };

  const handleSelectExtension = (source: string) => {
    const extension = availableExtensions.find(ext => ext.source === source);
    if (!extension) return;

    setSelectedExtension(source);
    setAvailableAccounts(extension.accounts);
    setShowExtensionSelector(false);

    // If only one account, connect directly
    if (extension.accounts.length === 1 && extension.accounts[0]) {
      handleSelectAccount(extension.accounts[0]);
      return;
    }

    // For multiple accounts, just use first one for now (can enhance later)
    if (extension.accounts.length > 0 && extension.accounts[0]) {
      handleSelectAccount(extension.accounts[0]);
    }
  };

  const handleSelectAccount = async (selectedAccount: { address: string; name?: string; source?: string }) => {
    try {
      // Connect using the selected account's address
      await account.connectExtension(selectedAccount.address);
      setAvailableAccounts([]);
      setAvailableExtensions([]);
      setSelectedExtension(null);
      setConnecting(false);
    } catch (error) {
      setConnecting(false);
    }
  };

  const handleConnectWalletConnect = async () => {
    setShowMenu(false);
    setConnecting(true);
    try {
      console.log('[AccountMenu] Starting WalletConnect connection...');
      const uri = await account.connectWalletConnect();
      console.log('[AccountMenu] WalletConnect URI received:', uri ? 'yes' : 'no');
      
      if (!uri) {
        throw new Error('No URI received from WalletConnect');
      }
      
      // On mobile, deep-link directly to wallet apps instead of showing QR
      if (isMobile) {
        // Mobile flow: show wallet selection, then deep-link
        setNovaURI(uri);
        setShowNovaQR(true); // Reuse this modal to show wallet options
        return;
      }
      
      // Desktop flow: generate QR code
      console.log('[AccountMenu] Generating QR code...');
      const qrCodeDataUrl = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
      });
      console.log('[AccountMenu] QR code generated, showing modal');
      
      setNovaURI(uri);
      setNovaQRCode(qrCodeDataUrl);
      setShowNovaQR(true);
      // Connection will complete asynchronously - QR modal stays open until connected
      // AccountContext will update state when connection completes
      // connecting state will be reset by useEffect when status changes
      
      // Set a timeout to reset connecting state if connection takes too long (60 seconds)
      setTimeout(() => {
        if (account.status === 'connecting') {
          console.warn('[AccountMenu] WalletConnect connection timeout');
          // Don't reset connecting state here - let the error handler do it
        }
      }, 60000);
    } catch (error: any) {
      console.error('[AccountMenu] WalletConnect setup error:', error);
      setConnecting(false);
      setShowNovaQR(false);
      setNovaQRCode(null);
      setNovaURI(null);
      // Show error to user
      const errorMsg = error?.message || 'Failed to setup WalletConnect connection';
      alert(`Failed to setup WalletConnect connection: ${errorMsg}`);
    }
  };

  const handleMobileWalletClick = async (walletId: string, uri?: string) => {
    const uriToUse = uri || novaURI;
    if (!uriToUse) return;
    
    const link = walletConnectLinks.find(l => l.id === walletId);
    if (!link) return;
    
    const target = link.deepLink?.(uriToUse) ?? link.universalLink?.(uriToUse);
    if (!target) {
      alert('Unable to open this wallet. Please try another option.');
      return;
    }
    
    try {
      const isHttpLink = target.startsWith('http');
      if (isHttpLink && typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(target, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = target;
      }
    } catch (err) {
      console.error('[AccountMenu] Failed to open wallet link', err);
      // Fallback: copy URI to clipboard
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(uriToUse);
        alert('Could not open wallet directly. WalletConnect link copied—paste it into your wallet app.');
      } else {
        alert('Could not open the wallet link. Please try again.');
      }
    }
  };

  const handleDisconnect = () => {
    // Close any open modals
    setShowNovaQR(false);
    setNovaQRCode(null);
    setNovaURI(null);
    setShowExtensionSelector(false);
    setAvailableExtensions([]);
    setAvailableAccounts([]);
    setSelectedExtension(null);
    setConnecting(false);
    setShowMenu(false);
    // Disconnect account
    account.disconnect();
  };

  const copyAddress = () => {
    if (account.address0) {
      navigator.clipboard.writeText(account.address0);
      setShowMenu(false);
    }
  };

  const formatBalance = (balance: string | null): string => {
    if (!balance) return '0';
    const num = parseFloat(balance);
    if (num >= 1000) return num.toFixed(2);
    if (num >= 1) return num.toFixed(6);
    return num.toFixed(6);
  };

  const getNetworkLabel = (network: string): string => {
    switch (network) {
      case 'asset-hub':
      case 'polkadot':
        return 'Asset Hub (Polkadot)';
      case 'westend': return 'Westend';
      default: return 'Unknown';
    }
  };

  if (account.status === 'connected') {
    return (
      <>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-muted transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <Identicon value={account.address0 || account.address || ''} size={20} theme="polkadot" />
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
                    <Identicon value={account.address0 || account.address || ''} size={40} theme="polkadot" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{account.walletName || 'Connected'}</div>
                      <AddressDisplay address={account.address0 || account.address || ''} className="text-xs opacity-70" />
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
                  {/* dev: show active RPC */}
                  {import.meta.env.DEV && chain.getCurrentRpc() && (
                    <div 
                      data-testid="dev-active-rpc" 
                      style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}
                      className="text-xs opacity-60"
                    >
                      RPC: {chain.getCurrentRpc()}
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
                    onClick={handleDisconnect}
                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors text-destructive"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 rounded-lg border bg-card hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
        style={{ borderColor: 'var(--border)' }}
        disabled={connecting || account.status === 'connecting'}
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-medium">
          {connecting || account.status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
        </span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-card shadow-lg z-50"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* dev: show active RPC (even when disconnected) */}
            {import.meta.env.DEV && chain.getCurrentRpc() && (
              <div 
                data-testid="dev-active-rpc" 
                className="p-3 border-b text-xs opacity-60"
                style={{ borderColor: 'var(--border)' }}
              >
                RPC: {chain.getCurrentRpc()}
              </div>
            )}
            <div className="p-2">
              {isMobile ? (
                // Mobile: Show mobile wallet options that start WalletConnect and open deep link
                <>
                  {walletConnectLinks
                    .filter(link => ['nova', 'subwallet', 'talisman'].includes(link.id))
                    .map((link) => (
                      <button
                        key={link.id}
                        onClick={async () => {
                          setShowMenu(false);
                          setConnecting(true);
                          try {
                            console.log(`[AccountMenu] Starting WalletConnect for ${link.label}...`);
                            const uri = await account.connectWalletConnect();
                            if (!uri) {
                              throw new Error('No URI received from WalletConnect');
                            }
                            console.log(`[AccountMenu] Opening ${link.label} with URI...`);
                            await handleMobileWalletClick(link.id, uri);
                            // Connection will complete asynchronously - don't reset connecting state here
                          } catch (error: any) {
                            console.error('[AccountMenu] Mobile wallet connection error:', error);
                            setConnecting(false);
                            alert(`Failed to connect: ${error?.message || 'Unknown error'}`);
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                        disabled={connecting}
                      >
                        <img src={link.icon} alt={link.label} className="w-4 h-4" />
                        {link.label}
                      </button>
                    ))}
                </>
              ) : (
                // Desktop: Show extension + WalletConnect
                <>
                  <button
                    onClick={handleConnectExtension}
                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                    disabled={connecting}
                  >
                    <Wallet className="w-4 h-4" />
                    Browser Extension
                  </button>
                  <button
                    onClick={handleConnectWalletConnect}
                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                    disabled={connecting}
                  >
                    <QrCode className="w-4 h-4" />
                    WalletConnect
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Extension Selector Modal */}
      {showExtensionSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowExtensionSelector(false);
          setAvailableExtensions([]);
          setConnecting(false);
        }}>
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
            <h2 className="text-lg font-semibold mb-4">Select Wallet Extension</h2>
            <p className="text-sm opacity-70 mb-4">Choose which wallet extension to connect:</p>
            <div className="flex flex-col gap-2">
              {availableExtensions.map((extension, idx) => (
                <button
                  key={extension.source + idx}
                  className="p-3 rounded-lg border text-left transition-all hover:bg-muted"
                  onClick={() => handleSelectExtension(extension.source)}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{extension.name}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {extension.accounts.length} account{extension.accounts.length !== 1 ? 's' : ''} available
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              className="mt-4 px-4 py-2 rounded-md border w-full"
              onClick={() => {
                setShowExtensionSelector(false);
                setAvailableExtensions([]);
                setConnecting(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* WalletConnect Modal - QR code on desktop, wallet selection on mobile */}
      {showNovaQR && account.status !== 'disconnected' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            // Allow closing if not actively connecting
            if (account.status !== 'connecting') {
              setShowNovaQR(false);
              setNovaQRCode(null);
              setNovaURI(null);
              setConnecting(false);
            }
          }}
        >
          <div
            className="bg-card rounded-xl p-6 max-w-sm w-full mx-4 border-2"
            onClick={(e) => e.stopPropagation()}
            style={{ borderColor: 'var(--border)' }}
          >
            {isMobile && !novaQRCode ? (
              // Mobile: Show wallet selection
              <>
                <h3 className="text-lg font-semibold mb-2">Choose Your Wallet</h3>
                <p className="text-sm opacity-70 mb-4">
                  Tap your wallet below. After approving the connection, stay inside your wallet until you confirm the signature.
                </p>
                <div className="space-y-2">
                  {walletConnectLinks
                    .filter(link => ['nova', 'subwallet', 'talisman'].includes(link.id))
                    .map((link) => (
                      <button
                        key={link.id}
                        onClick={() => handleMobileWalletClick(link.id, novaURI || undefined)}
                        className="w-full px-4 py-3 rounded-lg border hover:bg-muted transition-colors flex items-center gap-3"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <img src={link.icon} alt={link.label} className="w-8 h-8" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{link.label}</div>
                          {link.description && (
                            <div className="text-xs opacity-70">{link.description}</div>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
                <button
                  className="mt-4 w-full px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
                  onClick={() => {
                    setShowNovaQR(false);
                    setNovaQRCode(null);
                    setNovaURI(null);
                    setConnecting(false);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              // Desktop: Show QR code
              <>
                <h3 className="text-lg font-semibold mb-2">Connect via WalletConnect</h3>
                <p className="text-sm opacity-70 mb-4">
                  {account.status === 'connecting' 
                    ? 'Scan this QR code with Nova Wallet, SubWallet mobile, or Talisman mobile'
                    : account.status === 'connected'
                    ? 'Connected! Closing...'
                    : account.error
                    ? `Connection failed: ${account.error}`
                    : 'Waiting for connection...'}
                </p>
                {account.error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <span className="text-sm">{account.error}</span>
                    </div>
                  </div>
                )}
                {novaQRCode && (
                  <div className="flex justify-center mb-4 p-4 bg-white rounded-lg">
                    <img src={novaQRCode} alt="WalletConnect QR Code" className="w-64 h-64" />
                  </div>
                )}
                {(account.status as string) === 'connected' && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Successfully connected!</span>
                    </div>
                  </div>
                )}
                <button
                  className="w-full px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  onClick={() => {
                    setShowNovaQR(false);
                    setNovaQRCode(null);
                    setNovaURI(null);
                    setConnecting(false);
                  }}
                >
                  {(account.status as string) === 'connected' ? 'Close' : 'Cancel'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Auto-close QR modal when connected */}
      {showNovaQR && (account.status as string) === 'connected' && (
        <AutoCloseQR onClose={() => {
          setShowNovaQR(false);
          setNovaQRCode(null);
          setNovaURI(null);
          setConnecting(false);
        }} />
      )}
    </>
  );
}
