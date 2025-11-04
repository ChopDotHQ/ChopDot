/**
 * LOGIN SCREEN
 * 
 * Authentication screen supporting multiple sign-in methods:
 * - Polkadot wallet (Polkadot.js, SubWallet, Talisman)
 * - MetaMask
 * - Rainbow (via WalletConnect)
 * - Email/password
 */

import { useState } from 'react';
import { Wallet, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth, AuthMethod } from '../../contexts/AuthContext';
import {
  connectPolkadotWallet,
  signPolkadotMessage,
  connectMetaMask,
  signMetaMaskMessage,
  connectWalletConnect,
  signWalletConnectMessage,
  generateSignInMessage,
} from '../../utils/walletAuth';
import { triggerHaptic } from '../../utils/haptics';
import { InputField } from '../InputField';
import { PrimaryButton } from '../PrimaryButton';
//

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

type LoginMode = 'select' | 'email' | 'signup';

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, signUp, loginAsGuest } = useAuth();
  const [mode, setMode] = useState<LoginMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const connection = await connectPolkadotWallet();
          address = connection.address;
          const message = generateSignInMessage(address);
          signature = await signPolkadotMessage(address, message);
          break;
        }

        case 'metamask': {
          const connection = await connectMetaMask();
          address = connection.address;
          const message = generateSignInMessage(address);
          signature = await signMetaMaskMessage(address, message);
          break;
        }

        case 'rainbow': {
          const connection = await connectWalletConnect();
          address = connection.address;
          const message = generateSignInMessage(address);
          signature = await signWalletConnectMessage(address, message);
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
      
      if (err.message?.includes('No Polkadot extension')) {
        friendlyError = 'No Polkadot wallet found. Please install Polkadot.js, SubWallet, or Talisman.';
      } else if (err.message?.includes('MetaMask is not installed')) {
        friendlyError = 'MetaMask not found. Please install the MetaMask browser extension.';
      } else if (err.message?.includes('WalletConnect requires')) {
        friendlyError = 'WalletConnect is not configured yet. Use email or guest login instead.';
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

  const handleEmailLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');

      if (!email || !password) {
        setError('Please enter email and password');
        return;
      }

      if (mode === 'signup' && password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (mode === 'signup') {
        await signUp(email, password);
      } else {
        await login('email', {
          type: 'email',
          email,
          password,
        });
      }

      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Email login failed:', err);
      setError(err.message || 'Failed to sign in');
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

  if (mode === 'email' || mode === 'signup') {
    return (
      <div className="h-full bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 pt-16">
          <h1 className="text-screen-title mb-2">
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </h1>
          <p className="text-xs text-secondary">
            {mode === 'signup' 
              ? 'Create an account to get started with ChopDot'
              : 'Sign in to your ChopDot account'
            }
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 px-4 space-y-3">
          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            disabled={loading}
          />

          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            disabled={loading}
          />

          {mode === 'signup' && (
            <InputField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              disabled={loading}
            />
          )}

          {error && (
            <div className="card p-3 flex items-start gap-2 bg-destructive/10">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <PrimaryButton
              onClick={handleEmailLogin}
              disabled={loading}
              loading={loading}
              fullWidth
            >
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </PrimaryButton>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              setMode(mode === 'signup' ? 'email' : 'signup');
              setError(null);
            }}
            className="w-full text-xs text-center text-secondary py-2"
            disabled={loading}
          >
            {mode === 'signup'
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
            }
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setMode('select');
              setError(null);
            }}
            className="w-full text-xs text-center text-secondary py-2"
            disabled={loading}
          >
            ← Back to options
          </button>
        </div>
      </div>
    );
  }

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
        <p className="text-xs text-secondary px-4">
          Split expenses and manage group finances with blockchain-powered settlements
        </p>
      </div>

      {/* Auth Options */}
      <div className="flex-1 px-4 space-y-3">
        <div>
          <p className="text-xs text-secondary mb-2 px-1">Connect with wallet</p>
          
          {/* Polkadot Wallet */}
          <button
            onClick={() => handleWalletLogin('polkadot')}
            disabled={loading}
            className="w-full card p-4 flex items-center gap-3 hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] mb-2 disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #E6007A 0%, #FF1864 100%)',
            }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm">Polkadot Wallet</p>
              <p className="text-[10px] text-secondary">Polkadot.js, SubWallet, Talisman</p>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-secondary" />}
          </button>

          {/* MetaMask */}
          <button
            onClick={() => handleWalletLogin('metamask')}
            disabled={loading}
            className="w-full card p-4 flex items-center gap-3 hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] mb-2 disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #F6851B 0%, #E2761B 100%)',
            }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm">MetaMask</p>
              <p className="text-[10px] text-secondary">Ethereum & EVM chains</p>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-secondary" />}
          </button>

          {/* Rainbow */}
          <button
            onClick={() => handleWalletLogin('rainbow')}
            disabled={loading}
            className="w-full card p-4 flex items-center gap-3 hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #FF54BB 0%, #00E0FF 100%)',
            }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm">Rainbow & Others</p>
              <p className="text-[10px] text-secondary">Via WalletConnect</p>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-secondary" />}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-secondary uppercase">Or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email Option */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setMode('email');
          }}
          disabled={loading}
          className="w-full card p-4 flex items-center gap-3 hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm">Continue with email</p>
            <p className="text-[10px] text-secondary">Traditional email/password</p>
          </div>
        </button>

        {error && (
          <div className="card p-3 flex items-start gap-2 bg-destructive/10">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Footer with Guest Option */}
      <div className="p-4 space-y-3 pb-24">
        {/* Guest Login Hint */}
        <div className="text-center px-2 mb-2">
          <p className="text-xs text-secondary">
            Just exploring? Try the app without signing in
          </p>
        </div>
        
        <button
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full card p-3 flex items-center justify-center gap-2 hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </>
          ) : (
            <span className="text-sm" style={{ fontWeight: 500 }}>Continue as Guest</span>
          )}
        </button>
        
        <p className="text-[10px] text-secondary text-center">
          By continuing, you agree to ChopDot's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
