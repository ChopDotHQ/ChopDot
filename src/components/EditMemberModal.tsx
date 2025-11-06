import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { isValidSs58Any, normalizeToPolkadot } from '../services/chain/address';
import type { Member } from '../schema/pot';

interface EditMemberModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (member: { id: string; name: string; address?: string; verified?: boolean }) => void;
}

export function EditMemberModal({ isOpen, member, onClose, onSave }: EditMemberModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressValid, setAddressValid] = useState(false);

  // Initialize form when member changes
  useEffect(() => {
    if (member) {
      setName(member.name);
      setAddress(member.address || '');
      setAddressError(null);
      setAddressValid(false);
    }
  }, [member]);

  // Validate address on change
  useEffect(() => {
    if (!address.trim()) {
      setAddressError(null);
      setAddressValid(false);
      return;
    }

    if (isValidSs58Any(address)) {
      setAddressError(null);
      setAddressValid(true);
    } else {
      setAddressError('Invalid address (any SS58 allowed)');
      setAddressValid(false);
    }
  }, [address]);

  const handleSave = () => {
    if (!member) return;
    
    if (!name.trim()) {
      return; // Name is required
    }

    // Normalize address if provided and valid
    let normalizedAddress: string | undefined = undefined;
    if (address.trim() && addressValid) {
      normalizedAddress = normalizeToPolkadot(address);
    }

    onSave({
      id: member.id,
      name: name.trim(),
      address: normalizedAddress,
      verified: member.verified ?? false, // Preserve verified status
    });
    
    onClose();
  };

  const handleCopyAddress = () => {
    if (member?.address) {
      navigator.clipboard.writeText(member.address);
    }
  };

  if (!member) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit Member">
      <div className="flex flex-col space-y-4">
        {/* Name Field */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Display Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter member name"
            className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm"
          />
        </div>

        {/* Wallet Address Field */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Wallet Address (optional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Polkadot wallet address (any SS58)"
              className={`w-full px-3 py-2 bg-input-background border rounded-lg focus:outline-none focus-ring-pink text-sm font-mono ${
                addressError ? 'border-destructive' : addressValid ? 'border-green-500' : 'border-border'
              }`}
            />
            {member.address && (
              <button
                onClick={handleCopyAddress}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded transition-colors"
                title="Copy address"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          
          {/* Validation Messages */}
          {addressError && (
            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
              <AlertCircle className="w-3 h-3" />
              <span>{addressError}</span>
            </div>
          )}
          {addressValid && !addressError && (
            <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>Will be normalized to Polkadot format for settlements.</span>
            </div>
          )}
        </div>

        {/* Current Address Display (if exists) */}
        {member.address && (
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Current Address</p>
                <p className="text-xs font-mono truncate">{member.address}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {member.address.slice(0, 6)}...{member.address.slice(-4)}
                </p>
              </div>
              {member.verified && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              )}
            </div>
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
            onClick={handleSave}
            disabled={!name.trim() || (address.trim() !== '' && !addressValid)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
              name.trim() && (!address.trim() || addressValid)
                ? 'bg-accent text-white hover:opacity-90'
                : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

