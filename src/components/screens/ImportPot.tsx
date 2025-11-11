/**
 * Import Pot Screen
 * 
 * Allows users to import pots from IPFS CID or shareable link.
 * Matches app's design system and UX patterns.
 */

import { useState, useEffect, useRef } from 'react';
import { TopBar } from '../TopBar';
import { Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { importPotFromCID, extractCIDFromUrl } from '../../services/sharing/potShare';
import { triggerHaptic } from '../../utils/haptics';
import type { Pot } from '../../schema/pot';

interface ImportPotProps {
  initialCid?: string; // CID from URL parameter
  onBack: () => void;
  onImport: (pot: Pot) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function ImportPot({
  initialCid,
  onBack,
  onImport,
  onShowToast,
}: ImportPotProps) {
  const [input, setInput] = useState(initialCid || '');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedPot, setImportedPot] = useState<Pot | null>(null);

  const handleImport = async (cidToImport?: string) => {
    const cidInput = cidToImport || input.trim();
    
    if (!cidInput) {
      setError('Please enter a pot CID or shareable link');
      return;
    }

    setIsImporting(true);
    setError(null);
    triggerHaptic('light');

    try {
      // Extract CID from URL if it's a shareable link
      const cid = extractCIDFromUrl(cidInput) || cidInput;

      if (!cid) {
        throw new Error('Invalid CID or link format');
      }

      // Import pot from IPFS
      const pot = await importPotFromCID(cid);

      setImportedPot(pot);
      triggerHaptic('success');
      onShowToast?.('Pot imported successfully', 'success');
    } catch (error) {
      console.error('[ImportPot] Failed to import pot:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to import pot. Please check the CID or link and try again.';
      setError(errorMessage);
      triggerHaptic('error');
      onShowToast?.(errorMessage, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Auto-import if CID is provided in URL (only once per CID)
  const lastImportedCidRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Only auto-import if we have a CID and haven't imported this specific CID yet
    if (initialCid && initialCid !== lastImportedCidRef.current) {
      lastImportedCidRef.current = initialCid;
      setInput(initialCid);
      // Trigger import directly with the CID
      // handleImport will handle isImporting/importedPot state internally
      handleImport(initialCid);
    }
    // Reset tracking if initialCid is cleared
    if (!initialCid) {
      lastImportedCidRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCid]);

  const handleConfirmImport = () => {
    if (importedPot) {
      onImport(importedPot);
      triggerHaptic('success');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar
        title="Import Pot"
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {importedPot ? (
          /* Success State */
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-body font-medium text-success">Pot imported successfully!</p>
                <p className="text-caption text-secondary mt-1">
                  Review the pot details below and confirm to add it to your pots.
                </p>
              </div>
            </div>

            {/* Pot Preview */}
            <div className="p-4 card border border-border rounded-lg space-y-2">
              <h3 className="text-body font-medium">{importedPot.name}</h3>
              <div className="flex items-center gap-4 text-caption text-secondary">
                <span>
                  {importedPot.members.length} member{importedPot.members.length !== 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span>
                  {importedPot.expenses.length} expense{importedPot.expenses.length !== 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span>{importedPot.baseCurrency}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <PrimaryButton onClick={handleConfirmImport} fullWidth>
                Add to My Pots
              </PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  setImportedPot(null);
                  setInput('');
                  setError(null);
                }}
                fullWidth
              >
                Import Another
              </SecondaryButton>
            </div>
          </div>
        ) : (
          /* Import Form */
          <>
            {/* Instructions */}
            <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
              <h3 className="text-label font-medium">How to import a pot</h3>
              <p className="text-caption text-secondary">
                Paste the shareable link you received from the pot owner. The pot will automatically import and be added to your pots list.
              </p>
              <p className="text-caption text-secondary mt-2">
                <strong>Tip:</strong> If you have a shareable link, just paste it here. If you only have an IPFS CID, paste that instead.
              </p>
            </div>

            {/* Input Field */}
            <div className="space-y-2">
              <label className="text-label text-secondary">Pot Link or CID</label>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                placeholder="Paste shareable link or IPFS CID here..."
                className="w-full px-3 py-2.5 bg-input-background border border-border/30 rounded-lg text-body placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                rows={4}
                disabled={isImporting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-caption text-destructive flex-1">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <PrimaryButton
                onClick={handleImport}
                disabled={!input.trim() || isImporting}
                loading={isImporting}
                fullWidth
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Import Pot
                  </>
                )}
              </PrimaryButton>
              <SecondaryButton onClick={onBack} fullWidth>
                Cancel
              </SecondaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

