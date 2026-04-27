import { Users } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { SecondaryButton } from '../SecondaryButton';
import type { Pot } from '../../schema/pot';

interface SharePotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pot: Pot | null;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function SharePotSheet({ isOpen, onClose, pot }: SharePotSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Share Pot">
      <div className="space-y-4">
        {pot && (
          <p className="text-body font-medium">{pot.name}</p>
        )}

        <div className="p-4 bg-muted/30 border border-border rounded-lg flex items-start gap-3">
          <Users className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-body font-medium">Invite via Members tab</p>
            <p className="text-caption text-secondary mt-1">
              To add people to this pot, use the Members tab and send them an invite link.
            </p>
          </div>
        </div>

        <SecondaryButton onClick={onClose} fullWidth>
          Close
        </SecondaryButton>
      </div>
    </BottomSheet>
  );
}
