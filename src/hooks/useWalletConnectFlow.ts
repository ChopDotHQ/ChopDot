import { useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { copyWithToast } from '../utils/clipboard';
import { walletConnectLinks } from '../config/wallet-connect-links';

interface UseWalletConnectFlowOptions {
  connectWalletConnect: () => Promise<string>;
  accountStatus: string;
  isMobile: boolean;
  onConnectingChange: (connecting: boolean) => void;
}

export function useWalletConnectFlow({
  connectWalletConnect,
  accountStatus,
  isMobile,
  onConnectingChange,
}: UseWalletConnectFlowOptions) {
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);

  const startConnect = useCallback(async () => {
    onConnectingChange(true);
    try {
      const wcUri = await connectWalletConnect();
      if (!wcUri) {
        throw new Error('No URI received from WalletConnect');
      }

      if (isMobile) {
        setUri(wcUri);
        setShowQR(true);
        return;
      }

      const qrCodeDataUrl = await QRCode.toDataURL(wcUri, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
      });

      setUri(wcUri);
      setQRCode(qrCodeDataUrl);
      setShowQR(true);

      setTimeout(() => {
        if (accountStatus === 'connecting') {
          console.warn('[AccountMenu] WalletConnect connection timeout');
          toast.warning('WalletConnect is taking too long. Please retry.');
        }
      }, 60000);
    } catch (error: any) {
      console.error('[AccountMenu] WalletConnect setup error:', error);
      onConnectingChange(false);
      setShowQR(false);
      setQRCode(null);
      setUri(null);
      const errorMsg = error?.message || 'Failed to setup WalletConnect connection';
      toast.error(`Failed to setup WalletConnect connection: ${errorMsg}`);
    }
  }, [connectWalletConnect, isMobile, accountStatus, onConnectingChange]);

  const handleMobileWalletClick = useCallback(async (walletId: string, overrideUri?: string) => {
    const uriToUse = overrideUri || uri;
    if (!uriToUse) return;

    const link = walletConnectLinks.find(l => l.id === walletId);
    if (!link) return;

    const target = link.deepLink?.(uriToUse) ?? link.universalLink?.(uriToUse);
    if (!target) {
      toast.error('Unable to open this wallet. Please try another option.');
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
      const ok = await copyWithToast(
        uriToUse,
        'Could not open wallet directly. WalletConnect link copied\u2014paste it into your wallet app.',
        (msg: string) => (msg === 'Failed to copy' ? toast.error(msg) : toast.info(msg)),
      );
      if (!ok) {
        toast.error('Could not open the wallet link. Please try again.');
      }
    }
  }, [uri]);

  const closeQR = useCallback(() => {
    setShowQR(false);
    setQRCode(null);
    setUri(null);
    onConnectingChange(false);
  }, [onConnectingChange]);

  const reset = useCallback(() => {
    setShowQR(false);
    setQRCode(null);
    setUri(null);
  }, []);

  return {
    showQR,
    qrCode,
    uri,
    startConnect,
    handleMobileWalletClick,
    closeQR,
    reset,
  };
}
