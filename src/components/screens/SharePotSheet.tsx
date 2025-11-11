/**
 * Share Pot Sheet
 * 
 * Allows users to share pots via IPFS CID.
 * Matches app's design system and UX patterns.
 */

import { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { sharePot } from '../../services/sharing/potShare';
import { triggerHaptic } from '../../utils/haptics';
import { useAccount } from '../../contexts/AccountContext';
import type { Pot } from '../../schema/pot';

interface SharePotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pot: Pot | null;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function SharePotSheet({
  isOpen,
  onClose,
  pot,
  onShowToast,
}: SharePotSheetProps) {
  const account = useAccount();
  const [isSharing, setIsSharing] = useState(false);
  const [shareData, setShareData] = useState<{
    cid: string;
    shareLink: string;
    ipfsUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState<'link' | 'cid' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setShareData(null);
      setError(null);
      setIsSharing(false);
    }
  }, [isOpen]);

  // Share pot when sheet opens (only if wallet is connected)
  useEffect(() => {
    if (isOpen && pot && !shareData && !error && !isSharing && account.address0) {
      handleShare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pot, account.address0]);

  const handleShare = async () => {
    if (!pot) return;

    setIsSharing(true);
    setError(null);
    triggerHaptic('light');

    try {
      const result = await sharePot(pot);
      setShareData(result);
      triggerHaptic('success');
      onShowToast?.('Pot shared successfully', 'success');
    } catch (error) {
      console.error('[SharePotSheet] Failed to share pot:', error);
      triggerHaptic('error');
      
      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.includes('AUTH_REQUIRED') || errorMessage.includes('authentication') || errorMessage.includes('403')) {
        userFriendlyMessage = 'IPFS authentication required. Your wallet will prompt you to sign a message (one-time only).';
      } else if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(userFriendlyMessage);
      onShowToast?.(userFriendlyMessage, 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'link' | 'cid') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      triggerHaptic('light');
      onShowToast?.('Copied to clipboard', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('[SharePotSheet] Failed to copy:', error);
      onShowToast?.('Failed to copy', 'error');
    }
  };

  const handleClose = () => {
    setShareData(null);
    setCopied(null);
    setError(null);
    onClose();
  };

  // Check if wallet is connected
  const isWalletConnected = account.status === 'connected' && !!account.address0;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Share Pot">
      <div className="space-y-3">
        {!isWalletConnected ? (
          <>
            {/* Wallet Not Connected State */}
            <div className="p-4 bg-muted/30 border border-border rounded-lg flex items-start gap-3">
              <Wallet className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-body font-medium">Wallet Required</p>
                <p className="text-caption text-secondary mt-1">
                  To share a pot, you need to connect your wallet. This allows us to upload the pot to IPFS securely.
                </p>
              </div>
            </div>
            <div className="p-3 bg-muted/30 border border-border rounded-lg">
              <p className="text-caption text-secondary">
                <strong className="text-label">Why?</strong> Pot sharing uses IPFS (decentralized storage) which requires authentication. Your wallet will sign a message once (the first time), then sharing works automatically.
              </p>
            </div>
            <SecondaryButton onClick={handleClose} fullWidth>
              Close
            </SecondaryButton>
          </>
        ) : isSharing && !error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-secondary animate-spin" />
            <p className="text-body text-secondary">Creating shareable link...</p>
          </div>
        ) : error ? (
          <>
            {/* Error State */}
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-body font-medium text-destructive">Upload Failed</p>
                <p className="text-caption text-secondary mt-1">{error}</p>
              </div>
            </div>

            {/* Info about authentication */}
            {error.includes('authentication') || error.includes('AUTH_REQUIRED') || error.includes('403') ? (
              <div className="p-3 bg-muted/30 border border-border rounded-lg">
                <p className="text-caption text-secondary">
                  <strong className="text-label">Note:</strong> Your wallet will prompt you to sign a message for IPFS authentication. This is safe and only happens once - future shares will work automatically.
                </p>
              </div>
            ) : null}

            {/* Retry Button */}
            <PrimaryButton onClick={handleShare} fullWidth>
              Try Again
            </PrimaryButton>
          </>
        ) : shareData ? (
          <>
            {/* Success Message */}
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              <p className="text-label font-medium text-success flex-1">Pot shared successfully!</p>
            </div>

            {/* Share Link - Stacked layout to avoid truncation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <label className="text-label text-secondary">Shareable Link</label>
                <button
                  onClick={() => copyToClipboard(shareData.shareLink, 'link')}
                  className="p-2 card border border-border rounded-lg hover:bg-muted/50 transition-colors active:scale-95 flex items-center gap-1.5"
                  title="Copy link"
                >
                  {copied === 'link' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-caption text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-caption">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-input-background border border-border rounded-lg">
                <p className="text-caption font-mono text-secondary break-all leading-tight">
                  {shareData.shareLink}
                </p>
              </div>
            </div>

            {/* IPFS CID - Collapsed by default */}
            <details className="space-y-2">
              <summary className="text-caption text-secondary cursor-pointer hover:text-foreground transition-colors py-1">
                IPFS CID (Advanced)
              </summary>
              <div className="space-y-1.5 pt-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-secondary">CID</span>
                  <button
                    onClick={() => copyToClipboard(shareData.cid, 'cid')}
                    className="p-2 card border border-border rounded-lg hover:bg-muted/50 transition-colors active:scale-95 flex items-center gap-1.5"
                    title="Copy CID"
                  >
                    {copied === 'cid' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-caption text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-caption">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-input-background border border-border rounded-lg">
                  <p className="text-caption font-mono text-secondary break-all leading-tight">
                    {shareData.cid}
                  </p>
                </div>
              </div>
            </details>

          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Share2 className="w-12 h-12 text-secondary" />
            <p className="text-body text-secondary">Ready to share</p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {shareData && (
            <PrimaryButton
              onClick={() => {
                  copyToClipboard(shareData.shareLink, 'link');
              }}
              fullWidth
            >
              <Copy className="w-4 h-4" />
              Copy Share Link
            </PrimaryButton>
          )}
          <SecondaryButton onClick={handleClose} fullWidth>
            Close
          </SecondaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}

