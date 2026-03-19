/**
 * AccountMenu - Unified wallet connection button and dropdown
 *
 * Displays in header:
 * - If disconnected: "Connect Wallet" button
 * - If connected: Shortened address, network badge, balance, dropdown menu
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { Wallet, QrCode } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';
import { walletConnectLinks } from '../config/wallet-connect-links';
import { toast } from 'sonner';
import { copyWithToast } from '../utils/clipboard';
import { useExtensionConnect } from '../hooks/useExtensionConnect';
import { useWalletConnectFlow } from '../hooks/useWalletConnectFlow';
import { ConnectedAccountMenu } from './wallet/ConnectedAccountMenu';
import { ExtensionSelectorModal } from './wallet/ExtensionSelectorModal';
import { WalletConnectQRModal } from './wallet/WalletConnectQRModal';
import { getChain } from '../services/chain';

export function AccountMenu() {
  const account = useAccount();
  const isMobile = useIsMobile();
  const [showMenu, setShowMenu] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [currentRpc, setCurrentRpc] = useState<string | null>(null);

  const onConnectingChange = useCallback((value: boolean) => setConnecting(value), []);

  const extension = useExtensionConnect({
    connectExtension: account.connectExtension,
    onConnectingChange,
  });

  const walletConnect = useWalletConnectFlow({
    connectWalletConnect: account.connectWalletConnect,
    accountStatus: account.status,
    isMobile,
    onConnectingChange,
  });

  useEffect(() => {
    if (!import.meta.env.DEV || !showMenu) return;
    let active = true;
    (async () => {
      try {
        const chainService = await getChain();
        if (active) setCurrentRpc(chainService.getCurrentRpc());
      } catch (error) {
        console.warn('[AccountMenu] Failed to read current RPC:', error);
      }
    })();
    return () => { active = false; };
  }, [showMenu, account.status]);

  useEffect(() => {
    if (account.status === 'connected' || account.status === 'disconnected') {
      setConnecting(false);
      if (account.status === 'disconnected') {
        walletConnect.reset();
        extension.reset();
      }
    }
  }, [account.status, walletConnect, extension]);

  useEffect(() => {
    if (account.error && connecting) {
      setConnecting(false);
      if (walletConnect.showQR) {
        walletConnect.closeQR();
      }
    }
  }, [account.error, connecting, walletConnect]);

  const hasPositiveBalance = account.balanceHuman ? parseFloat(account.balanceHuman) > 0 : false;

  const handleDisconnect = useCallback(() => {
    walletConnect.reset();
    extension.reset();
    setConnecting(false);
    setShowMenu(false);
    account.disconnect();
  }, [walletConnect, extension, account]);

  const copyAddress = useCallback(async () => {
    if (account.address0) {
      const ok = await copyWithToast(account.address0, 'Address copied', (msg) => toast.success(msg));
      if (ok) setShowMenu(false);
    }
  }, [account.address0]);

  const handleStartExtension = useCallback(async () => {
    setShowMenu(false);
    await extension.startConnect();
  }, [extension]);

  const handleStartWC = useCallback(async () => {
    setShowMenu(false);
    await walletConnect.startConnect();
  }, [walletConnect]);

  if (account.status === 'connected') {
    return (
      <ConnectedAccountMenu
        account={account}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        currentRpc={currentRpc}
        hasPositiveBalance={hasPositiveBalance}
        copyAddress={copyAddress}
        onDisconnect={handleDisconnect}
      />
    );
  }

  return (
    <div className="relative inline-block">
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
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-card shadow-lg z-50"
            style={{ borderColor: 'var(--border)' }}
          >
            {import.meta.env.DEV && currentRpc && (
              <div
                data-testid="dev-active-rpc"
                className="p-3 border-b text-xs opacity-60"
                style={{ borderColor: 'var(--border)' }}
              >
                RPC: {currentRpc}
              </div>
            )}
            <div className="p-2">
              {isMobile ? (
                walletConnectLinks
                  .filter(link => ['nova', 'subwallet', 'talisman'].includes(link.id))
                  .map((link) => (
                    <button
                      key={link.id}
                      onClick={async () => {
                        setShowMenu(false);
                        setConnecting(true);
                        try {
                          const uri = await account.connectWalletConnect();
                          if (!uri) throw new Error('No URI received from WalletConnect');
                          await walletConnect.handleMobileWalletClick(link.id, uri);
                        } catch (error: any) {
                          console.error('[AccountMenu] Mobile wallet connection error:', error);
                          setConnecting(false);
                          toast.error(`Failed to connect: ${error?.message || 'Unknown error'}`);
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                      disabled={connecting}
                    >
                      <img src={link.icon} alt={link.label} className="w-4 h-4" />
                      {link.label}
                    </button>
                  ))
              ) : (
                <>
                  <button
                    onClick={handleStartExtension}
                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                    disabled={connecting}
                  >
                    <Wallet className="w-4 h-4" />
                    Browser Extension
                  </button>
                  <button
                    onClick={handleStartWC}
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

      {extension.showSelector && (
        <ExtensionSelectorModal
          extensions={extension.availableExtensions}
          onSelect={extension.selectExtension}
          onCancel={extension.closeSelector}
        />
      )}

      {walletConnect.showQR && account.status !== 'disconnected' && (
        <WalletConnectQRModal
          qrCode={walletConnect.qrCode}
          uri={walletConnect.uri}
          accountStatus={account.status}
          accountError={account.error}
          isMobile={isMobile}
          onMobileWalletClick={walletConnect.handleMobileWalletClick}
          onClose={walletConnect.closeQR}
        />
      )}
    </div>
  );
}
