import { useState, useRef } from "react";
import { Copy, Send, Download, Upload, Lock } from "lucide-react";
import { downloadPotAsJSON, readPotFile } from "../../utils/pot-export";
import { encryptPot, decryptPot, downloadEncryptedPot, readEncryptedPotFile } from "../../utils/crypto/exportEncrypt";
import { PasswordModal } from "../PasswordModal";
import type { Pot } from "../../schema/pot";
import { ErrorMessages, formatErrorMessage } from "../../utils/errorMessages";

interface Member {
  id: string;
  name: string;
  status: "active" | "pending";
}

interface SettingsTabProps {
  potName: string;
  baseCurrency: string;
  hasExpenses: boolean;
  budget?: number;
  budgetEnabled?: boolean;
  checkpointEnabled?: boolean;
  potType?: "expense" | "savings";
  members?: Member[];
  potId?: string;
  pot?: Pot; // Full pot object for export
  onUpdateSettings: (settings: any) => void;
  onCopyInviteLink?: () => void;
  onResendInvite?: (memberId: string) => void;
  onLeavePot?: () => void;
  onArchivePot?: () => void;
  onDeletePot?: () => void;
  onImportPot?: (pot: Pot) => void; // Callback when pot is imported
  onShowToast?: (message: string, type?: "success" | "info" | "error") => void;
}

export function SettingsTab({
  potName: initialPotName,
  baseCurrency: initialCurrency,
  hasExpenses: _hasExpenses,
  budget: initialBudget,
  budgetEnabled: initialBudgetEnabled,
  checkpointEnabled: _initialCheckpointEnabled,
  potType: _potType = "expense",
  members = [],
  pot,
  onUpdateSettings,
  onCopyInviteLink,
  onResendInvite,
  onLeavePot,
  onArchivePot,
  onDeletePot,
  onImportPot,
  onShowToast,
}: SettingsTabProps) {
  const [potName, setPotName] = useState(initialPotName);
  const [baseCurrency, setBaseCurrency] = useState(initialCurrency);
  const [budgetEnabled, setBudgetEnabled] = useState(initialBudgetEnabled || false);
  const [budget, setBudget] = useState(initialBudget?.toString() || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const encryptedFileInputRef = useRef<HTMLInputElement>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalMode, setPasswordModalMode] = useState<'export' | 'import'>('export');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const pendingMembers = members.filter(m => m.status === "pending");
  
  const handleExportPot = () => {
    if (!pot) {
      onShowToast?.(ErrorMessages.export.noData, 'error');
      return;
    }
    try {
      downloadPotAsJSON(pot);
      onShowToast?.('Pot exported successfully', 'success');
    } catch (error) {
      onShowToast?.(formatErrorMessage(error, { action: 'export', resource: 'pot' }), 'error');
      console.error('Export error:', error);
    }
  };
  
  const handleImportPot = async () => {
    fileInputRef.current?.click();
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Get existing pot IDs for de-duplication (passed from parent via props if needed)
      // For now, we'll let the import function handle it
      const result = await readPotFile(file);
      if (result.success && result.pot) {
        onImportPot?.(result.pot);
        onShowToast?.('Pot imported successfully', 'success');
      } else {
        onShowToast?.(result.error || formatErrorMessage(new Error('Import failed'), { action: 'import', resource: 'pot' }), 'error');
      }
    } catch (error) {
      onShowToast?.(formatErrorMessage(error, { action: 'import', resource: 'pot' }), 'error');
      console.error('Import error:', error);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEncryptedExport = () => {
    if (!pot) {
      onShowToast?.(ErrorMessages.export.noData, 'error');
      return;
    }
    setPasswordModalMode('export');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handleEncryptedExportConfirm = async (password: string) => {
    if (!pot) return;

    try {
      setPasswordError(null);
      const blob = await encryptPot(pot, password);
      // Task 8: Use YYYY-MM-DD format for encrypted export filename
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const slug = pot.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `pot-${slug}-${dateStr}.chop`;
      downloadEncryptedPot(blob, filename);
      setShowPasswordModal(false);
      onShowToast?.('Encrypted pot exported successfully', 'success');
    } catch (error) {
      const errorMessage = formatErrorMessage(error, { action: 'encrypt', resource: 'pot' });
      setPasswordError(errorMessage);
      onShowToast?.(errorMessage, 'error');
    }
  };

  const handleEncryptedImport = () => {
    encryptedFileInputRef.current?.click();
  };

  const handleEncryptedFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file extension
    if (!file.name.endsWith('.chop') && !file.name.endsWith('.json.chop')) {
      onShowToast?.(ErrorMessages.file.invalidFormat, 'error');
      if (encryptedFileInputRef.current) {
        encryptedFileInputRef.current.value = '';
      }
      return;
    }

    try {
      const fileText = await readEncryptedPotFile(file);
      setPasswordModalMode('import');
      setPasswordError(null);
      setShowPasswordModal(true);
      
      // Store file text in a ref for use in password confirmation
      (encryptedFileInputRef.current as any).__fileText = fileText;
    } catch (error) {
      const errorMessage = formatErrorMessage(error, { action: 'read', resource: 'file' });
      onShowToast?.(errorMessage, 'error');
      if (encryptedFileInputRef.current) {
        encryptedFileInputRef.current.value = '';
      }
    }
  };

  const handleEncryptedImportConfirm = async (password: string) => {
    const fileText = (encryptedFileInputRef.current as any)?.__fileText;
    if (!fileText) {
      setPasswordError('File data not available');
      return;
    }

    try {
      setPasswordError(null);
      const decryptedPot = await decryptPot(fileText, password);
      onImportPot?.(decryptedPot);
      setShowPasswordModal(false);
      onShowToast?.('Encrypted import completed', 'success');
      
      // Clear file text from ref
      delete (encryptedFileInputRef.current as any).__fileText;
    } catch (error) {
      const errorMessage = formatErrorMessage(error, { action: 'decrypt', resource: 'file', details: 'Check password or file' });
      setPasswordError(errorMessage);
      onShowToast?.(errorMessage, 'error');
    } finally {
      // Reset file input
      if (encryptedFileInputRef.current) {
        encryptedFileInputRef.current.value = '';
      }
    }
  };


  return (
    <div className="p-3 space-y-3">
      {/* Compact settings form */}
      <div className="space-y-2">
        <div>
          <label className="text-label text-secondary mb-1 block">Pot name</label>
          <input
            value={potName}
            onChange={(e) => {
              setPotName(e.target.value);
              // Apply immediately
              onUpdateSettings({ potName: e.target.value });
            }}
            className="w-full px-3 py-2.5 bg-input-background border border-border/30 rounded-[var(--r-lg)] text-body placeholder:text-secondary focus:outline-none focus-ring-pink transition-all"
          />
        </div>
        
        <div>
          <label className="text-label text-secondary mb-1 block">Currency</label>
          <select
            value={baseCurrency}
            onChange={(e) => {
              setBaseCurrency(e.target.value);
              // Apply immediately
              onUpdateSettings({ baseCurrency: e.target.value });
            }}
            className="w-full px-3 py-2.5 bg-input-background border border-border/30 rounded-[var(--r-lg)] text-body focus:outline-none focus-ring-pink transition-all appearance-none"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="DOT">DOT</option>
          </select>
        </div>

        {/* Budget Settings */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-label block">Enable budget tracking</label>
              <p className="text-caption text-secondary">Track spending against a limit</p>
            </div>
            <button
              onClick={() => {
                const newValue = !budgetEnabled;
                setBudgetEnabled(newValue);
                // Apply immediately
                onUpdateSettings({ 
                  budgetEnabled: newValue,
                  budget: newValue && budget ? parseFloat(budget) : undefined,
                });
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                budgetEnabled ? "bg-primary" : "bg-switch-background"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  budgetEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          
          {budgetEnabled && (
            <div className="mt-2">
              <label className="text-label text-secondary mb-1 block">Budget limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">$</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    // Apply immediately
                    const budgetValue = e.target.value ? parseFloat(e.target.value) : undefined;
                    onUpdateSettings({ 
                      budgetEnabled: true,
                      budget: budgetValue,
                    });
                  }}
                  placeholder="500"
                  className="w-full pl-7 pr-3 py-2.5 bg-input-background border border-border/30 rounded-[var(--r-lg)] text-body placeholder:text-secondary focus:outline-none focus-ring-pink transition-all"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Compact Pending Members Section */}
      {pendingMembers.length > 0 && (
        <div className="pt-2 space-y-1.5 border-t border-border">
          <p className="text-label text-secondary">Pending invites ({pendingMembers.length})</p>
          {pendingMembers.map(member => (
            <div key={member.id} className="p-3 card rounded-lg transition-shadow duration-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-label">{member.name}</p>
                <span className="text-caption px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                  Pending
                </span>
              </div>
              <button
                onClick={() => onResendInvite?.(member.id)}
                className="flex items-center gap-1 text-label text-primary"
              >
                <Send className="w-3 h-3" />
                Resend
              </button>
            </div>
          ))}
          <button
            onClick={onCopyInviteLink}
            className="w-full p-2 bg-muted border border-border rounded-lg flex items-center justify-center gap-1.5 text-label hover:bg-secondary transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy invite link
          </button>
        </div>
      )}

      {/* Export/Import */}
      <div className="pt-2 space-y-2 border-t border-border">
        <p className="text-label text-secondary">Export/Import</p>
        <button
          onClick={handleExportPot}
          disabled={!pot}
          className="w-full card rounded-xl p-4 flex items-center gap-2 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span className="text-body">Export Pot (JSON)</span>
        </button>
        <button
          onClick={handleImportPot}
          className="w-full card rounded-xl p-4 flex items-center gap-2 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] text-left"
        >
          <Upload className="w-4 h-4" />
          <span className="text-body">Import Pot (JSON)</span>
        </button>
        <button
          onClick={handleEncryptedExport}
          disabled={!pot}
          className="w-full card rounded-xl p-4 flex items-center gap-2 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="w-4 h-4" />
          <span className="text-body">Encrypted Export (.chop)</span>
        </button>
        <button
          onClick={handleEncryptedImport}
          className="w-full card rounded-xl p-4 flex items-center gap-2 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] text-left"
        >
          <Lock className="w-4 h-4" />
          <span className="text-body">Import Encrypted (.chop)</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={encryptedFileInputRef}
          type="file"
          accept=".chop,application/json"
          onChange={handleEncryptedFileSelect}
          className="hidden"
        />
      </div>

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        mode={passwordModalMode}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordError(null);
          // Clear file text if import was cancelled
          if (encryptedFileInputRef.current) {
            delete (encryptedFileInputRef.current as any).__fileText;
            encryptedFileInputRef.current.value = '';
          }
        }}
        onConfirm={passwordModalMode === 'export' ? handleEncryptedExportConfirm : handleEncryptedImportConfirm}
        error={passwordError}
      />

      {/* Pot Management */}
      <div className="pt-2 space-y-2 border-t border-border">
        <p className="text-label text-secondary">Pot management</p>
        <button
          onClick={() => onLeavePot?.()}
          className="w-full card rounded-xl p-4 flex items-center justify-between hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] text-left"
        >
          <span className="text-body">Leave Pot</span>
          <span className="text-label text-secondary">›</span>
        </button>
        <button
          onClick={() => onArchivePot?.()}
          className="w-full card rounded-xl p-4 flex items-center justify-between hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] text-left"
        >
          <span className="text-body">Archive Pot</span>
          <span className="text-label text-secondary">›</span>
        </button>
        <button
          onClick={() => onDeletePot && window.confirm('Delete this pot permanently? This cannot be undone.') && onDeletePot()}
          className="w-full rounded-xl p-3 flex items-center justify-between transition-all duration-200 active:scale-[0.98] text-left"
          style={{ background: 'var(--destructive-soft)', border: '1px solid var(--destructive)', color: 'var(--destructive)' }}
        >
          <span className="text-body">Delete Pot</span>
          <span className="text-label">›</span>
        </button>
      </div>
    </div>
  );
}