/**
 * LOGIN SCREEN
 * 
 * Authentication screen supporting multiple sign-in methods:
 * - Polkadot.js (direct connection)
 * - Other wallets via WalletConnect (SubWallet, Talisman, MetaMask, Rainbow, etc.)
 */

import { useState, useEffect, useRef } from 'react';
import { Wallet, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth, AuthMethod } from '../../contexts/AuthContext';
import { useAccount } from '../../contexts/AccountContext';
import {
  signPolkadotMessage,
  generateSignInMessage,
} from '../../utils/walletAuth';
import { triggerHaptic } from '../../utils/haptics';
import QRCodeLib from 'qrcode';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, loginAsGuest } = useAuth();
  const account = useAccount(); // Get AccountContext to auto-connect wallet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showWalletConnectQR, setShowWalletConnectQR] = useState(false);
  const [walletConnectQRCode, setWalletConnectQRCode] = useState<string | null>(null);
  const [walletConnectURI, setWalletConnectURI] = useState<string | null>(null);
  const [isWaitingForWalletConnect, setIsWaitingForWalletConnect] = useState(false);
  const walletConnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for WalletConnect connection completion
  useEffect(() => {
    console.log('[LoginScreen] Account status changed:', {
      status: account.status,
      address0: account.address0,
      isWaitingForWalletConnect,
      showWalletConnectQR,
    });

    if (!isWaitingForWalletConnect || !showWalletConnectQR) {
      return;
    }

    // Check if connection completed
    if (account.status === 'connected' && account.address0) {
      console.log('[LoginScreen] ✅ WalletConnect connection detected! Address:', account.address0);
      
      // Clear timeout
      if (walletConnectTimeoutRef.current) {
        clearTimeout(walletConnectTimeoutRef.current);
        walletConnectTimeoutRef.current = null;
      }

      // Close QR modal immediately
      setShowWalletConnectQR(false);
      setWalletConnectQRCode(null);
      setWalletConnectURI(null);
      setIsWaitingForWalletConnect(false);

      // Proceed with login
      (async () => {
        try {
          setLoading(true);
          const address = account.address0!;
          console.log('[LoginScreen] Signing message for address:', address);
          
          // Sign message via WalletConnect
          const { createWalletConnectSigner } = await import('../../services/chain/walletconnect');
          const { stringToHex } = await import('@polkadot/util');
          const signer = createWalletConnectSigner(address);
          const message = generateSignInMessage(address);
          
          console.log('[LoginScreen] Requesting signature from WalletConnect...');
          const { signature } = await signer.signRaw({
            address,
            data: stringToHex(message),
          });
          
          console.log('[LoginScreen] Signature received, logging in...');
          // Login with signature
          await login('rainbow', {
            type: 'wallet',
            address,
            signature,
            message,
          });
          
          console.log('[LoginScreen] ✅ Login successful!');
          triggerHaptic('medium');
          onLoginSuccess?.();
        } catch (err: any) {
          console.error('[LoginScreen] ❌ WalletConnect login failed:', err);
          setError(err.message || 'Failed to sign message with WalletConnect');
          triggerHaptic('error');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [account.status, account.address0, isWaitingForWalletConnect, showWalletConnectQR, login, onLoginSuccess]);

  // Set timeout for WalletConnect connection
  useEffect(() => {
    if (isWaitingForWalletConnect && showWalletConnectQR) {
      walletConnectTimeoutRef.current = setTimeout(() => {
        if (account.status !== 'connected') {
          console.warn('[LoginScreen] WalletConnect connection timeout');
          setShowWalletConnectQR(false);
          setWalletConnectQRCode(null);
          setWalletConnectURI(null);
          setIsWaitingForWalletConnect(false);
          setError('WalletConnect connection timed out. Please try again.');
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

  const handleWalletLogin = async (method: AuthMethod) => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');

      let address: string;
      let signature: string;

      // Connect to wallet based on method
      switch (method) {
        case 'polkadot': {
          // Connect specifically to Polkadot.js extension
          const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
          const extensions = await web3Enable('ChopDot');
          
          // Filter for Polkadot.js specifically
          const polkadotJsExtension = extensions.find(ext => 
            ext.name === 'polkadot-js' || ext.name.toLowerCase().includes('polkadot.js')
          );
          
          if (!polkadotJsExtension) {
            throw new Error('Polkadot.js extension not found. Please install Polkadot.js browser extension.');
          }
          
          const accounts = await web3Accounts();
          const polkadotJsAccount = accounts.find(acc => 
            acc.meta.source === 'polkadot-js'
          );
          
          if (!polkadotJsAccount) {
            throw new Error('No Polkadot.js account found. Please create an account in Polkadot.js extension.');
          }
          
          address = polkadotJsAccount.address;
          
          // Auto-connect to AccountContext for Polkadot.js
          try {
            await account.connectExtension(address);
          } catch (e) {
            console.warn('[Login] Failed to auto-connect to AccountContext:', e);
          }
          
          const message = generateSignInMessage(address);
          signature = await signPolkadotMessage(address, message);
          break;
        }

        case 'rainbow': {
          // Use WalletConnect - this will show a modal with available wallets
          // User can select SubWallet, Talisman, MetaMask, Rainbow, etc.
          // The AccountContext handles the WalletConnect connection and QR code display
          await account.connectWalletConnect();
          
          // Wait for connection to complete (user selects wallet and connects)
          // Poll for connection status (max 60 seconds)
          let attempts = 0;
          const maxAttempts = 60;
          let connectedAddress: string | undefined;
          let connectedSignature: string | undefined;
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (account.status === 'connected' && account.address0) {
              connectedAddress = account.address0;
              
              // Sign message via WalletConnect
              const { createWalletConnectSigner } = await import('../../services/chain/walletconnect');
              const { stringToHex } = await import('@polkadot/util');
              const signer = createWalletConnectSigner(connectedAddress);
              const message = generateSignInMessage(connectedAddress);
              const { signature: sig } = await signer.signRaw({
                address: connectedAddress,
                data: stringToHex(message),
              });
              connectedSignature = sig;
              break;
            }
            
            attempts++;
          }
          
          if (!connectedAddress || !connectedSignature) {
            throw new Error('WalletConnect connection timed out. Please select your wallet and try again.');
          }
          
          address = connectedAddress;
          signature = connectedSignature;
          break;
        }

        default:
          throw new Error('Unsupported wallet type');
      }

      // Login with signature
      await login(method, {
        type: 'wallet',
        address,
        signature,
        message: generateSignInMessage(address),
      });

      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Wallet login failed:', err);
      
      // User-friendly error messages
      let friendlyError = 'Failed to connect wallet';
      
      if (err.message?.includes('Polkadot.js extension not found')) {
        friendlyError = 'Polkadot.js extension not found. Please install the Polkadot.js browser extension.';
      } else if (err.message?.includes('No Polkadot.js account')) {
        friendlyError = 'No Polkadot.js account found. Please create an account in your Polkadot.js extension.';
      } else if (err.message?.includes('WalletConnect')) {
        friendlyError = 'WalletConnect connection failed. Please try again or use Polkadot.js.';
      } else if (err.code === 4001 || err.message?.includes('User rejected')) {
        friendlyError = 'Connection cancelled. Please try again if you want to connect your wallet.';
      } else if (err.message?.includes('No accounts found')) {
        friendlyError = 'No accounts found in your wallet. Please create an account first.';
      } else if (err.message) {
        friendlyError = err.message;
      }
      
      setError(friendlyError);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };


  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');

      await loginAsGuest();

      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Guest login failed:', err);
      setError(err.message || 'Failed to continue as guest');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-full bg-background flex flex-col overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Header */}
      <div className="p-4 pt-16 pb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center" style={{
          background: 'var(--accent)',
        }}>
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-screen-title mb-2">Welcome to ChopDot</h1>
        <p className="text-micro text-secondary px-4">
          Split expenses and manage group finances with blockchain-powered settlements
        </p>
      </div>

      {/* Auth Options */}
      <div className="flex-1 px-4 space-y-3">
        <div>
          <p className="text-micro text-secondary mb-2 px-1">Connect with wallet</p>
          
          {/* Polkadot.js - Direct Connection */}
          <button
            onClick={() => handleWalletLogin('polkadot')}
            disabled={loading}
            className="w-full card p-4 flex items-center gap-3 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] mb-2 disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #E6007A 0%, #FF1864 100%)',
            }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-label">Polkadot.js</p>
              <p className="text-micro text-secondary">Polkadot browser extension</p>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-secondary" />}
          </button>

          {/* Other Wallets - Opens wallet picker */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowWalletPicker(true);
            }}
            disabled={loading}
            className="w-full card p-4 flex items-center gap-3 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] mb-2 disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #3B99FC 0%, #5E5DF7 100%)',
            }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-label">Other Wallets</p>
              <p className="text-micro text-secondary">SubWallet, Talisman & Polkadot-compatible wallets</p>
            </div>
          </button>

          {/* Guest Login Option */}
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full card p-4 flex items-center justify-center gap-2 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-body">Loading...</span>
              </>
            ) : (
              <span className="text-body" style={{ fontWeight: 500 }}>Continue as Guest</span>
            )}
          </button>
        </div>

        {error && (
          <div className="card p-3 flex items-start gap-2 bg-destructive/10">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-micro text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Footer with Legal Text */}
      <div className="p-4 pb-24">
        <p className="text-micro text-secondary text-center">
          By continuing, you agree to ChopDot's Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Wallet Picker Modal */}
      {showWalletPicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-50 animate-fadeIn"
            onClick={() => {
              triggerHaptic('light');
              setShowWalletPicker(false);
            }}
          />

          {/* Modal */}
          <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
            <div className="bg-card rounded-t-[24px] max-h-[80vh] flex flex-col" style={{ boxShadow: 'var(--shadow-elev)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
                <h2 className="text-section">Select Wallet</h2>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowWalletPicker(false);
                  }}
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {/* Wallet List */}
              <div className="flex-1 overflow-y-auto p-4 pt-6 space-y-3">
                {/* SubWallet - Browser Extension */}
                <button
                  onClick={async () => {
                    triggerHaptic('light');
                    setShowWalletPicker(false);
                    try {
                      setLoading(true);
                      setError(null);
                      
                      // Connect directly to SubWallet extension (not via WalletConnect)
                      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
                      await web3Enable('ChopDot');
                      const accounts = await web3Accounts();
                      
                      const subWalletAccount = accounts.find(acc => 
                        acc.meta.source === 'subwallet-js' || 
                        acc.meta.source === 'subwallet'
                      );
                      
                      if (!subWalletAccount) {
                        throw new Error('SubWallet extension not found. Please install SubWallet browser extension.');
                      }
                      
                      const address = subWalletAccount.address;
                      
                      try {
                        await account.connectExtension(address);
                      } catch (e) {
                        console.warn('[Login] Failed to auto-connect to AccountContext:', e);
                      }
                      
                      const message = generateSignInMessage(address);
                      const signature = await signPolkadotMessage(address, message);
                      
                      await login('polkadot', {
                        type: 'wallet',
                        address,
                        signature,
                        message,
                      });
                      
                      triggerHaptic('medium');
                      onLoginSuccess?.();
                    } catch (err: any) {
                      console.error('SubWallet login failed:', err);
                      let friendlyError = 'Failed to connect SubWallet';
                      if (err.message?.includes('not found')) {
                        friendlyError = 'SubWallet extension not found. Please install SubWallet browser extension.';
                      } else if (err.message) {
                        friendlyError = err.message;
                      }
                      setError(friendlyError);
                      triggerHaptic('error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full card p-4 flex items-center gap-3 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)',
                  }}>
                    <span className="text-2xl">🟣</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-label font-medium">SubWallet</p>
                    <p className="text-micro text-secondary">Browser extension</p>
                  </div>
                </button>

                {/* Talisman - Browser Extension */}
                <button
                  onClick={async () => {
                    triggerHaptic('light');
                    setShowWalletPicker(false);
                    try {
                      setLoading(true);
                      setError(null);
                      
                      // Connect directly to Talisman extension (not via WalletConnect)
                      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
                      await web3Enable('ChopDot');
                      const accounts = await web3Accounts();
                      
                      const talismanAccount = accounts.find(acc => 
                        acc.meta.source === 'talisman'
                      );
                      
                      if (!talismanAccount) {
                        throw new Error('Talisman extension not found. Please install Talisman browser extension.');
                      }
                      
                      const address = talismanAccount.address;
                      
                      try {
                        await account.connectExtension(address);
                      } catch (e) {
                        console.warn('[Login] Failed to auto-connect to AccountContext:', e);
                      }
                      
                      const message = generateSignInMessage(address);
                      const signature = await signPolkadotMessage(address, message);
                      
                      await login('polkadot', {
                        type: 'wallet',
                        address,
                        signature,
                        message,
                      });
                      
                      triggerHaptic('medium');
                      onLoginSuccess?.();
                    } catch (err: any) {
                      console.error('Talisman login failed:', err);
                      let friendlyError = 'Failed to connect Talisman';
                      if (err.message?.includes('not found')) {
                        friendlyError = 'Talisman extension not found. Please install Talisman browser extension.';
                      } else if (err.message) {
                        friendlyError = err.message;
                      }
                      setError(friendlyError);
                      triggerHaptic('error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full card p-4 flex items-center gap-3 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  }}>
                    <span className="text-2xl">🔷</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-label font-medium">Talisman</p>
                    <p className="text-micro text-secondary">Browser extension</p>
                  </div>
                </button>

                {/* WalletConnect - For mobile wallets (Nova, MetaMask mobile, etc.) */}
                <button
                  onClick={async () => {
                    triggerHaptic('light');
                    setShowWalletPicker(false);
                    try {
                      setLoading(true);
                      setError(null);
                      
                      // Use WalletConnect for mobile wallets via QR code
                      const uri = await account.connectWalletConnect();
                      
                      if (!uri) {
                        throw new Error('Failed to generate WalletConnect QR code');
                      }
                      
                      // Generate QR code
                      const qrCodeDataUrl = await QRCodeLib.toDataURL(uri, {
                        errorCorrectionLevel: 'M',
                        width: 300,
                        margin: 2,
                      });
                      
                      setWalletConnectURI(uri);
                      setWalletConnectQRCode(qrCodeDataUrl);
                      setShowWalletConnectQR(true);
                      setIsWaitingForWalletConnect(true);
                      setLoading(false);
                      
                      // Connection will be handled by useEffect listening to account.status
                      // No need to poll here - the useEffect will detect when account.status becomes 'connected'
                    } catch (err: any) {
                      console.error('WalletConnect login failed:', err);
                      setShowWalletConnectQR(false);
                      setWalletConnectQRCode(null);
                      setWalletConnectURI(null);
                      setIsWaitingForWalletConnect(false);
                      
                      // Show user-friendly error message
                      let errorMessage = err.message || 'Failed to connect via WalletConnect';
                      if (err.message?.includes('MetaMask') || err.message?.includes('does not support Polkadot')) {
                        errorMessage = 'MetaMask mobile does not support Polkadot. Please use Nova Wallet, SubWallet, or Talisman for Polkadot connections.';
                      }
                      
                      setError(errorMessage);
                      triggerHaptic('error');
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full card p-4 flex items-center gap-3 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #3B99FC 0%, #5E5DF7 100%)',
                  }}>
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-label font-medium">WalletConnect</p>
                    <p className="text-micro text-secondary">Nova Wallet, SubWallet mobile, Talisman mobile</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* WalletConnect QR Code Modal */}
      {showWalletConnectQR && walletConnectQRCode && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[60] animate-fadeIn"
            onClick={() => {
              triggerHaptic('light');
              setShowWalletConnectQR(false);
              setWalletConnectQRCode(null);
              setWalletConnectURI(null);
            }}
          />

          {/* QR Modal */}
          <div className="fixed inset-x-0 bottom-0 z-[60] animate-slideUp">
            <div className="bg-card rounded-t-[24px] max-h-[90vh] flex flex-col" style={{ boxShadow: 'var(--shadow-elev)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
                <h2 className="text-section">Scan QR Code</h2>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowWalletConnectQR(false);
                    setWalletConnectQRCode(null);
                    setWalletConnectURI(null);
                  }}
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {/* QR Code Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col items-center space-y-4">
                  <p className="text-body text-center text-secondary mb-2">
                    Scan this QR code with your mobile wallet to connect
                  </p>
                  
                  {/* QR Code */}
                  <div className="w-64 h-64 bg-white rounded-xl p-4 flex items-center justify-center shadow-lg">
                    <img 
                      src={walletConnectQRCode} 
                      alt="WalletConnect QR Code" 
                      className="w-full h-full"
                    />
                  </div>
                  
                  <p className="text-micro text-secondary text-center max-w-xs">
                    Open Nova Wallet, MetaMask mobile, or another WalletConnect-compatible wallet and scan this code
                  </p>
                  
                  {account.status === 'connecting' && (
                    <div className="flex items-center gap-2 text-caption text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Waiting for connection...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
