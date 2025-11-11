/**
 * Crust Authentication Setup Component
 * 
 * Simple UI to generate Crust Web3Auth token for IPFS API authentication.
 */

import { useState } from 'react';
import { useAccount } from '../../contexts/AccountContext';
import { generateCrustTokenFromWallet } from '../../utils/crustAuth';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { Loader2, CheckCircle, Copy, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface CrustAuthSetupProps {
  onBack?: () => void;
}

export function CrustAuthSetup({ onBack }: CrustAuthSetupProps = {}) {
  const account = useAccount();
  const [isGenerating, setIsGenerating] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!account.address0) {
      setError('Please connect your wallet first');
      triggerHaptic('error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setToken(null);
    triggerHaptic('light');

    try {
      const generatedToken = await generateCrustTokenFromWallet(account.address0);
      setToken(generatedToken);
      triggerHaptic('success');
    } catch (err: any) {
      console.error('[CrustAuthSetup] Failed to generate token:', err);
      setError(err.message || 'Failed to generate token. Please try again.');
      triggerHaptic('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;

    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      triggerHaptic('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[CrustAuthSetup] Failed to copy:', err);
      triggerHaptic('error');
    }
  };

  const handleCopyEnvLine = async () => {
    if (!token) return;

    const envLine = `CRUST_W3AUTH_TOKEN=${token}`;
    try {
      await navigator.clipboard.writeText(envLine);
      setCopied(true);
      triggerHaptic('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[CrustAuthSetup] Failed to copy:', err);
      triggerHaptic('error');
    }
  };

  return (
    <div className="app-screen flex flex-col">
      <div className="top-bar flex items-center justify-between p-4 border-b border-border">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold">Crust Authentication Setup</h1>
        {onBack && <div className="w-10" />}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Info Section */}
        <div className="card p-4 rounded-xl space-y-3">
          <h2 className="text-label font-semibold">What is this?</h2>
          <p className="text-body text-secondary">
            Generate an authentication token for Crust IPFS API. This enables auto-backup, receipt uploads, and pot sharing.
          </p>
          <a
            href="https://wiki.crust.network/docs/en/buildIPFSW3AuthPin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent hover:underline text-sm"
          >
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Wallet Status */}
        <div className="card p-4 rounded-xl space-y-3">
          <h2 className="text-label font-semibold">Wallet Status</h2>
          {account.status === 'connected' && account.address0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-4 h-4" />
                <span className="text-body">Connected</span>
              </div>
              <p className="text-caption text-secondary font-mono break-all">
                {account.address0}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-body">No wallet connected</span>
            </div>
          )}
        </div>

        {/* Generate Token */}
        {account.status === 'connected' && account.address0 && (
          <div className="space-y-4">
            {!token ? (
              <>
                <PrimaryButton
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  fullWidth
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating token...
                    </>
                  ) : (
                    'Generate Crust Token'
                  )}
                </PrimaryButton>
                <p className="text-caption text-secondary text-center">
                  Your wallet will prompt you to sign a message. This is safe and only used for authentication.
                </p>
              </>
            ) : (
              <div className="card p-4 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Token Generated!</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-label text-secondary">Token:</label>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={token}
                      className="w-full p-3 bg-input-background border border-border rounded-lg text-body font-mono text-sm resize-none"
                      rows={4}
                    />
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Copy token"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-label text-secondary">Add to backend/.env:</label>
                  <div className="relative">
                    <input
                      readOnly
                      value={`CRUST_W3AUTH_TOKEN=${token}`}
                      className="w-full p-3 bg-input-background border border-border rounded-lg text-body font-mono text-sm"
                    />
                    <button
                      onClick={handleCopyEnvLine}
                      className="absolute top-2 right-2 p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Copy env line"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
                  <p className="text-label font-medium">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-caption text-secondary">
                    <li>Copy the token above</li>
                    <li>Add it to <code className="bg-background px-1 rounded">backend/.env</code> as <code className="bg-background px-1 rounded">CRUST_W3AUTH_TOKEN</code></li>
                    <li>Restart your backend server</li>
                    <li>Test by uploading a receipt or sharing a pot</li>
                  </ol>
                </div>

                <SecondaryButton onClick={() => setToken(null)} fullWidth>
                  Generate New Token
                </SecondaryButton>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-body font-medium text-destructive">Error</p>
              <p className="text-caption text-secondary mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg">
          <p className="text-caption text-secondary">
            <strong className="text-label">Security:</strong> Never share your token or commit it to git. 
            The token is tied to your wallet address and can be regenerated anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

