/**
 * IPFS Authentication Onboarding
 * 
 * Explains to users what they're signing and why before their first IPFS upload.
 * Shows once per wallet address, then never again.
 */

import { useState, useEffect } from 'react';
import { Wallet, Shield, CheckCircle, X } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { triggerHaptic } from '../utils/haptics';

interface IPFSAuthOnboardingProps {
  walletAddress: string;
  onContinue: () => void;
  onCancel?: () => void;
}

/**
 * Check if user has seen IPFS auth onboarding for this wallet
 */
export function hasSeenIPFSAuthOnboarding(walletAddress: string): boolean {
  try {
    const key = `ipfs_auth_onboarding_${walletAddress}`;
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark IPFS auth onboarding as seen for this wallet
 */
export function markIPFSAuthOnboardingSeen(walletAddress: string): void {
  try {
    const key = `ipfs_auth_onboarding_${walletAddress}`;
    localStorage.setItem(key, 'true');
  } catch {
    // Silent fail
  }
}

export function IPFSAuthOnboarding({
  walletAddress,
  onContinue,
  onCancel,
}: IPFSAuthOnboardingProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  const handleContinue = () => {
    // Mark as seen when user clicks continue
    markIPFSAuthOnboardingSeen(walletAddress);
    triggerHaptic('success');
    onContinue();
  };

  const handleCancel = () => {
    setIsDismissing(true);
    triggerHaptic('light');
    setTimeout(() => {
      onCancel?.();
    }, 200);
  };

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className={`card rounded-2xl p-6 max-w-md w-full space-y-6 ${
          isDismissing ? 'opacity-0 scale-95 transition-all duration-200' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">IPFS Authentication</h2>
          </div>
          {onCancel && (
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-body text-secondary">
            To upload files, receipts, or share pots, we need to authenticate with IPFS (decentralized storage).
          </p>

          {/* What You'll Sign */}
          <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-label font-medium mb-1">What you'll sign:</p>
                <p className="text-caption text-secondary font-mono break-all">
                  {walletAddress}
                </p>
                <p className="text-caption text-secondary mt-2">
                  Your wallet address (to prove you own it)
                </p>
              </div>
            </div>
          </div>

          {/* Why */}
          <div className="space-y-2">
            <p className="text-label font-medium">Why?</p>
            <ul className="space-y-2 text-body text-secondary">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <span>IPFS requires authentication to upload files</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <span>Signing your address proves you own your wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <span>This only happens once - future uploads work automatically</span>
              </li>
            </ul>
          </div>

          {/* Safety */}
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-caption text-secondary">
              <strong className="text-label text-success">Safe:</strong> This doesn't authorize any transactions, 
              give access to your funds, or grant any permissions. It's just proof you own your wallet address.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <PrimaryButton onClick={handleContinue} fullWidth>
            I Understand, Continue
          </PrimaryButton>
          {onCancel && (
            <SecondaryButton onClick={handleCancel} fullWidth>
              Cancel
            </SecondaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

