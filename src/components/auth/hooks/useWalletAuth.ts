import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { useAccount } from '../../../contexts/AccountContext';
import { requestWalletNonce, buildWalletAuthMessage } from '../../../utils/walletAuth';
import { triggerHaptic } from '../../../utils/haptics';
import QRCodeLib from 'qrcode'; // Add QRCodeLib import

interface UseWalletAuthProps {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    onLoginSuccess?: () => void;
    isMobileWalletFlow: boolean;
    enableWcModal: boolean; // Add prop
}

export const useWalletAuth = ({
    setLoading,
    setError,
    onLoginSuccess,
    isMobileWalletFlow,
    enableWcModal, // Destructure
}: UseWalletAuthProps) => {
    const { login } = useAuth();
    const account = useAccount();

    // State
    const [showWalletConnectQR, setShowWalletConnectQR] = useState(false);
    const [walletConnectQRCode, setWalletConnectQRCode] = useState<string | null>(null);
    const [isWaitingForWalletConnect, setIsWaitingForWalletConnect] = useState(false);
    const [isWaitingForSignature, setIsWaitingForSignature] = useState(false);
    const walletConnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper
    const getWalletAuthMessage = async (addr: string) => {
        const nonce = await requestWalletNonce(addr);
        return buildWalletAuthMessage(nonce);
    };

    // Start WalletConnect Session
    const startWalletConnectSession = async (
        handleWalletConnectModal: () => Promise<void>,
        openQrModal: boolean = true
        // source param removed as it was unused
    ) => {
        try {
            setLoading(true);
            setError(null);

            // Use WC Modal v2 if enabled
            if (enableWcModal) {
                console.log('[useWalletAuth] Using WC Modal v2');
                await handleWalletConnectModal();
                return null;
            }

            // Legacy WalletConnect flow
            const result = (await account.connectWalletConnect()) as { uri?: string } | string | null | undefined;
            const uri = typeof result === 'string' ? result : result?.uri;

            if (!uri) {
                throw new Error('Failed to generate WalletConnect QR code');
            }

            const qrCodeDataUrl = await QRCodeLib.toDataURL(uri, {
                errorCorrectionLevel: 'M',
                width: 300,
                margin: 2,
            });

            setWalletConnectQRCode(qrCodeDataUrl);
            setShowWalletConnectQR(openQrModal);
            setIsWaitingForWalletConnect(true);

            return uri;
        } catch (err: any) {
            console.error('[useWalletAuth] Failed to start WalletConnect session:', err);
            setError(err.message || 'Failed to start WalletConnect. Please try again.');
            triggerHaptic('error');
            return null;
        } finally {
            if (!isWaitingForWalletConnect) {
                setLoading(false);
            }
        }
    };

    // Listen for WalletConnect connection completion
    useEffect(() => {
        // console.log('[useWalletAuth] Account status changed:', {
        //   status: account.status,
        //   address0: account.address0,
        //   isWaitingForWalletConnect,
        //   showWalletConnectQR,
        // });

        if (!isWaitingForWalletConnect) {
            return;
        }

        // Check if connection completed
        if (account.status === 'connected' && account.address0) {
            console.log('[useWalletAuth] ✅ WalletConnect connection detected! Address:', account.address0);

            // Clear timeout
            if (walletConnectTimeoutRef.current) {
                clearTimeout(walletConnectTimeoutRef.current);
                walletConnectTimeoutRef.current = null;
            }

            // Close QR modal immediately
            setShowWalletConnectQR(false);
            setWalletConnectQRCode(null);
            setIsWaitingForWalletConnect(false);
            setIsWaitingForSignature(true);

            // Proceed with login
            (async () => {
                try {
                    setLoading(true);
                    const address = account.address0!;
                    console.log('[useWalletAuth] Signing message for address:', address);

                    // Wait longer for Nova/SubWallet to surface the signature prompt
                    // Mobile wallets need time to process the connection and show the UI
                    await new Promise((resolve) => setTimeout(resolve, 300));

                    // Sign message via WalletConnect (guarded import)
                    const signerModule = await import('../../../services/chain/walletconnect').catch((err) => {
                        console.error('[useWalletAuth] WC signer import failed:', err);
                        throw new Error('WalletConnect is unavailable right now. Please retry.');
                    });
                    const utilModule = await import('@polkadot/util').catch((err) => {
                        console.error('[useWalletAuth] util import failed:', err);
                        throw new Error('WalletConnect is unavailable right now. Please retry.');
                    });

                    const { createWalletConnectSigner } = signerModule;
                    const { stringToHex } = utilModule;
                    const signer = createWalletConnectSigner(address);
                    const message = await getWalletAuthMessage(address);

                    console.log('[useWalletAuth] Requesting signature from WalletConnect...');
                    console.log('[useWalletAuth] 💡 Stay in your wallet app until you approve the signature');

                    // Small delay to ensure wallet app is ready for signature request
                    await new Promise((resolve) => setTimeout(resolve, 400));

                    // Request signature - this should trigger the wallet app to show the prompt
                    const { signature } = await signer.signRaw({
                        address,
                        data: stringToHex(message),
                    });

                    console.log('[useWalletAuth] Signature received, logging in...');

                    // Clear waiting state before login (login might redirect)
                    setIsWaitingForSignature(false);

                    // Login with signature
                    await login('rainbow', {
                        type: 'wallet',
                        address,
                        signature,
                        chain: 'polkadot',
                    });

                    console.log('[useWalletAuth] ✅ Login successful!');
                    triggerHaptic('medium');
                    onLoginSuccess?.();
                } catch (err: any) {
                    console.error('[useWalletAuth] ❌ WalletConnect login failed:', err);
                    setError(err.message || 'Failed to sign message with WalletConnect');
                    triggerHaptic('error');
                } finally {
                    setLoading(false);
                    setIsWaitingForSignature(false);
                }
            })();
        }
    }, [account.status, account.address0, isWaitingForWalletConnect, showWalletConnectQR, login, onLoginSuccess]);

    // Set timeout for WalletConnect connection
    useEffect(() => {
        if (isWaitingForWalletConnect && showWalletConnectQR) {
            walletConnectTimeoutRef.current = setTimeout(() => {
                if (account.status !== 'connected') {
                    console.warn('[useWalletAuth] WalletConnect connection timeout');
                    setShowWalletConnectQR(false);
                    setWalletConnectQRCode(null);
                    setIsWaitingForWalletConnect(false);
                    setError('WalletConnect connection timed out. Please try again.');
                    toast.warning('WalletConnect is taking too long. Please try again.');
                    triggerHaptic('error');
                }
            }, 60000); // 60 seconds

            return () => {
                if (walletConnectTimeoutRef.current) {
                    clearTimeout(walletConnectTimeoutRef.current);
                }
            };
        }
    }, [isWaitingForWalletConnect, showWalletConnectQR, account.status]);

    // Handle Mobile Wallet Flow QR Toggle
    useEffect(() => {
        if (isMobileWalletFlow && showWalletConnectQR) {
            setShowWalletConnectQR(false);
        }
    }, [isMobileWalletFlow, showWalletConnectQR]);

    return {
        showWalletConnectQR, setShowWalletConnectQR,
        walletConnectQRCode, setWalletConnectQRCode,
        isWaitingForWalletConnect, setIsWaitingForWalletConnect,
        isWaitingForSignature, setIsWaitingForSignature,
        getWalletAuthMessage,
        startWalletConnectSession // Export function
    };
};
