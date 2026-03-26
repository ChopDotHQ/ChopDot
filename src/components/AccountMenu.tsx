/**
 * AccountMenu - Unified wallet connection entry point
 *
 * Displays in header:
 * - If disconnected: "Connect Wallet" button + full modal chooser
 * - If connected: Shortened address, network badge, balance, dropdown menu
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from './ui/use-mobile';
import { copyWithToast } from '../utils/clipboard';
import { useExtensionConnect } from '../hooks/useExtensionConnect';
import { useWalletConnectFlow } from '../hooks/useWalletConnectFlow';
import { ConnectedAccountMenu } from './wallet/ConnectedAccountMenu';
import { ConnectWalletSheet } from './wallet/ConnectWalletSheet';

export function AccountMenu() {
  const account = useAccount();
  const isMobile = useIsMobile();
  const [showMenu, setShowMenu] = useState(false);
  const [connecting, setConnecting] = useState(false);

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

  const {
    availableExtensions,
    availableAccounts,
    selectedExtensionSource,
    discoverExtensions,
    connectToExtensionSource,
    connectToExtensionAccount,
    backToExtensionList,
    reset: resetExtensionConnect,
  } = extension;

  const {
    showQR,
    qrCode,
    uri,
    startConnect: startWalletConnect,
    handleMobileWalletClick,
    closeQR,
    reset: resetWalletConnect,
  } = walletConnect;

  useEffect(() => {
    if (!showMenu || account.status === 'connected' || isMobile) return;
    void discoverExtensions();
  }, [account.status, discoverExtensions, isMobile, showMenu]);

  useEffect(() => {
    if (account.status === 'connected' || account.status === 'disconnected') {
      setConnecting(false);
      if (account.status === 'disconnected') {
        resetWalletConnect();
        resetExtensionConnect();
      }
    }
  }, [account.status, resetExtensionConnect, resetWalletConnect]);

  useEffect(() => {
    if (account.error && connecting) {
      setConnecting(false);
    }
  }, [account.error, connecting]);

  useEffect(() => {
    if (!showQR || account.status !== 'connected') return;
    const timeout = window.setTimeout(() => {
      closeQR();
      setShowMenu(false);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [account.status, closeQR, showQR]);

  const hasPositiveBalance = account.balanceHuman ? parseFloat(account.balanceHuman) > 0 : false;

  const handleDisconnect = useCallback(() => {
    resetWalletConnect();
    resetExtensionConnect();
    setConnecting(false);
    setShowMenu(false);
    account.disconnect();
  }, [account, resetExtensionConnect, resetWalletConnect]);

  const copyAddress = useCallback(async () => {
    if (account.address0) {
      const ok = await copyWithToast(account.address0, 'Address copied', (msg) => toast.success(msg));
      if (ok) setShowMenu(false);
    }
  }, [account.address0]);

  const handleStartWC = useCallback(async () => {
    setShowMenu(true);
    await startWalletConnect();
  }, [startWalletConnect]);

  const handleConnectExtension = useCallback(
    async (source: string) => {
      await connectToExtensionSource(source);
    },
    [connectToExtensionSource],
  );

  const handleCloseSheet = useCallback(() => {
    closeQR();
    setShowMenu(false);
  }, [closeQR]);

  const handleBackFromWalletConnect = useCallback(() => {
    closeQR();
  }, [closeQR]);

  if (account.status === 'connected') {
    return (
      <ConnectedAccountMenu
        account={account}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        currentRpc={null}
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
        className="px-2.5 py-2 sm:px-4 rounded-lg border bg-card hover:bg-muted transition-colors flex items-center gap-1.5 sm:gap-2 disabled:opacity-50"
        style={{ borderColor: 'var(--border)' }}
        disabled={connecting || account.status === 'connecting'}
        aria-label={connecting || account.status === 'connecting' ? 'Connecting wallet' : 'Connect Wallet'}
      >
        <Wallet className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium truncate max-w-[90px]">
          {connecting || account.status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
        </span>
      </button>

      <ConnectWalletSheet
        isOpen={showMenu}
        isMobile={isMobile}
        connecting={connecting}
        availableExtensions={availableExtensions.map(({ name, source }) => ({ name, source }))}
        availableExtensionAccounts={availableAccounts}
        selectedExtensionName={
          selectedExtensionSource
            ? availableExtensions.find(({ source }) => source === selectedExtensionSource)?.name || selectedExtensionSource
            : null
        }
        showWalletConnect={showQR}
        walletConnectQRCode={qrCode}
        walletConnectUri={uri}
        accountStatus={account.status}
        accountError={account.error}
        onClose={handleCloseSheet}
        onConnectExtension={handleConnectExtension}
        onConnectExtensionAccount={connectToExtensionAccount}
        onConnectWalletConnect={handleStartWC}
        onBackFromExtensionAccounts={backToExtensionList}
        onBackFromWalletConnect={handleBackFromWalletConnect}
        onOpenWalletConnectMobileWallet={handleMobileWalletClick}
      />
    </div>
  );
}
