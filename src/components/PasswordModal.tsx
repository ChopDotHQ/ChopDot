import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  mode: 'export' | 'import';
  onClose: () => void;
  onConfirm: (password: string) => void;
  error?: string | null;
}

export function PasswordModal({ isOpen, mode, onClose, onConfirm, error }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setConfirmPassword('');
      setLocalError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  // Clear local error when password changes
  useEffect(() => {
    if (localError) {
      setLocalError(null);
    }
  }, [password, confirmPassword]);

  const handleSubmit = () => {
    // Validate password
    if (!password || password.trim().length === 0) {
      setLocalError('Password is required');
      return;
    }

    if (password.length < 4) {
      setLocalError('Password must be at least 4 characters');
      return;
    }

    // For export, check confirmation
    if (mode === 'export') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
    }

    // Clear passwords from state after confirmation
    onConfirm(password);
    setPassword('');
    setConfirmPassword('');
  };

  const displayError = error || localError;
  const isValid = password.length >= 4 && (mode === 'import' || password === confirmPassword);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'export' ? 'Encrypt Export' : 'Decrypt Import'}
    >
      <div className="flex flex-col space-y-4">
        <p className="text-sm text-secondary">
          {mode === 'export'
            ? 'Enter a password to encrypt your pot. You will need this password to import it later.'
            : 'Enter the password used to encrypt this pot.'}
        </p>

        {/* Password Input */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Password <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 pr-10 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) {
                  handleSubmit();
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted/30 rounded transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password (export only) */}
        {mode === 'export' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2 pr-10 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValid) {
                    handleSubmit();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted/30 rounded transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {displayError && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{displayError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
              isValid
                ? 'bg-accent text-white hover:opacity-90'
                : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
            }`}
          >
            {mode === 'export' ? 'Encrypt & Export' : 'Decrypt & Import'}
          </button>
        </div>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          {mode === 'export'
            ? 'Keep your password safe. Without it, you cannot decrypt this file.'
            : 'If decryption fails, verify the password and file integrity.'}
        </p>
      </div>
    </BottomSheet>
  );
}

