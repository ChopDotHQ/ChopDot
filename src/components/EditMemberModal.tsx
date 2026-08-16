import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import type { Member } from '../schema/pot';

interface EditMemberModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (member: { id: string; name: string; verified?: boolean }) => void;
}

export function EditMemberModal({ isOpen, member, onClose, onSave }: EditMemberModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (member) setName(member.name);
  }, [member]);

  const handleSave = () => {
    if (!member || !name.trim()) return;
    onSave({ id: member.id, name: name.trim(), verified: member.verified ?? false });
    onClose();
  };

  if (!member) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit Member">
      <div className="flex flex-col space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Display Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Enter member name"
            className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus-ring-pink text-sm"
            autoFocus
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
              name.trim() ? 'bg-accent text-white hover:opacity-90' : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
