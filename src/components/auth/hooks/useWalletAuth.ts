import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { useAccount } from '../../../contexts/AccountContext';
import { requestWalletNonce, buildWalletAuthMessage } from '../../../utils/walletAuth';
import { triggerHaptic } from '../../../utils/haptics';

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
        handleWalletConnectModal: () => Promise<void>
    ) => {
        try {
            setLoading(true);
            setError(null);

            // Use WC Modal v2 if enabled
            if (enableWcModal) {
                await handleWalletConnectModal();
                return null;
            }

            throw new Error('WalletConnect is not available in MVP');
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
        if ((account.status as string) === 'connected' && account.address0) {
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

                    throw new Error('WalletConnect is not available in MVP');
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
                if ((account.status as string) !== 'connected') {
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
