import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { isValidSs58Any, normalizeToPolkadot } from '../services/chain/address';
import type { Member } from '../schema/pot';
import { useAccount } from '../contexts/AccountContext';
import { useEvmAccount } from '../contexts/EvmAccountContext';

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface EditMemberModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (member: { id: string; name: string; address?: string; evmAddress?: string; verified?: boolean }) => void;
}

export function EditMemberModal({ isOpen, member, onClose, onSave }: EditMemberModalProps) {
  const account = useAccount();
  const proofWallet = useEvmAccount();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [evmAddress, setEvmAddress] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressValid, setAddressValid] = useState(false);
  const [evmAddressError, setEvmAddressError] = useState<string | null>(null);
  const [evmAddressValid, setEvmAddressValid] = useState(false);

  // Initialize form when member changes
  useEffect(() => {
    if (member) {
      setName(member.name);
      setAddress(member.address || '');
      setEvmAddress(member.evmAddress || '');
      setAddressError(null);
      setAddressValid(false);
      setEvmAddressError(null);
      setEvmAddressValid(false);
    }
  }, [member]);

  useEffect(() => {
    if (isOpen) {
      void proofWallet.refresh();
    }
  }, [isOpen, proofWallet]);

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

  useEffect(() => {
    if (!evmAddress.trim()) {
      setEvmAddressError(null);
      setEvmAddressValid(false);
      return;
    }

    if (EVM_ADDRESS_RE.test(evmAddress.trim())) {
      setEvmAddressError(null);
      setEvmAddressValid(true);
    } else {
      setEvmAddressError('Invalid EVM address (expected 0x...)');
      setEvmAddressValid(false);
    }
  }, [evmAddress]);

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
      evmAddress: evmAddress.trim() && evmAddressValid ? evmAddress.trim() : undefined,
      verified: member.verified ?? false, // Preserve verified status
    });
    
    onClose();
  };

  const handleCopyAddress = () => {
    if (member?.address) {
      navigator.clipboard.writeText(member.address);
    }
  };

  const paymentRailReady = Boolean(member?.address || (address.trim() && addressValid));
  const proofRailReady = Boolean(member?.evmAddress || (evmAddress.trim() && evmAddressValid));

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

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Wallet setup
          </label>
          <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium">One member, two optional onchain rails</p>
            <p className="mt-1 text-xs text-muted-foreground">
              DOT payments use a Polkadot wallet. Onchain closeout proof uses a 0x wallet on Polkadot Hub contracts.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-background/70 p-2">
                <p className="text-[11px] font-medium">Payment rail</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {paymentRailReady ? "Ready to receive DOT settlements." : "Add a Polkadot wallet to receive DOT."}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-2">
                <p className="text-[11px] font-medium">Proof rail</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {proofRailReady ? "Ready for Polkadot Hub contract proof." : "Add a 0x wallet for closeout proof."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Proof wallet for Polkadot Hub closeout (optional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={evmAddress}
              onChange={(e) => setEvmAddress(e.target.value)}
              placeholder="Enter 0x... wallet used for contract proof"
              className={`w-full px-3 py-2 bg-input-background border rounded-lg focus:outline-none focus-ring-pink text-sm font-mono ${
                evmAddressError ? 'border-destructive' : evmAddressValid ? 'border-green-500' : 'border-border'
              }`}
            />
          </div>
          {proofWallet.address && (
            <button
              type="button"
              onClick={() => setEvmAddress(proofWallet.address || '')}
              className="mt-2 text-xs underline text-muted-foreground hover:text-foreground transition-colors"
            >
              Use connected proof wallet {proofWallet.address.slice(0, 6)}...{proofWallet.address.slice(-4)}
            </button>
          )}
          {!proofWallet.address && proofWallet.isAvailable && (
            <button
              type="button"
              onClick={() => void proofWallet.connect()}
              className="mt-2 text-xs underline text-muted-foreground hover:text-foreground transition-colors"
            >
              Connect proof wallet
            </button>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            This does not receive the DOT payment. It is only used to anchor and prove the closeout on Polkadot Hub.
          </p>
          {evmAddressError && (
            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
              <AlertCircle className="w-3 h-3" />
              <span>{evmAddressError}</span>
            </div>
          )}
          {evmAddressValid && !evmAddressError && (
            <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>Ready for Polkadot Hub PVM contract writes.</span>
            </div>
          )}
        </div>

        {/* Wallet Address Field */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Polkadot payment wallet (optional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Polkadot wallet address for DOT settlements"
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
          {account.status === 'connected' && account.address0 && (
            <button
              type="button"
              onClick={() => setAddress(account.address0 || '')}
              className="mt-2 text-xs underline text-muted-foreground hover:text-foreground transition-colors"
            >
              Use connected payment wallet {account.address0.slice(0, 6)}...{account.address0.slice(-4)}
            </button>
          )}
          
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
              <span>Will be normalized to Polkadot format for DOT settlements.</span>
            </div>
          )}
        </div>

        {/* Current Address Display (if exists) */}
        {(member.address || member.evmAddress) && (
          <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Current onchain setup</p>
              {member.verified && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              )}
            </div>
            {member.address && (
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-1">Payment rail</p>
                <p className="text-xs font-mono truncate">{member.address}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {member.address.slice(0, 6)}...{member.address.slice(-4)}
                </p>
              </div>
            )}
            {member.evmAddress && (
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-1">Proof rail</p>
                <p className="text-xs font-mono truncate">{member.evmAddress}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {member.evmAddress.slice(0, 6)}...{member.evmAddress.slice(-4)}
                </p>
              </div>
            )}
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
            disabled={!name.trim() || (address.trim() !== '' && !addressValid) || (evmAddress.trim() !== '' && !evmAddressValid)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
              name.trim() && (!address.trim() || addressValid) && (!evmAddress.trim() || evmAddressValid)
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
