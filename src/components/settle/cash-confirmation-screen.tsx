import { CheckCircle2 } from 'lucide-react';
import { TopBar } from '../TopBar';
import { PrimaryButton } from '../PrimaryButton';

interface CashConfirmationScreenProps {
  isPaying: boolean;
  formattedAmount: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CashConfirmationScreen = ({
  isPaying,
  formattedAmount,
  onConfirm,
  onCancel,
}: CashConfirmationScreenProps) => (
  <div className="flex flex-col h-full pb-[68px]">
    <TopBar title="Confirm Cash Settlement" onBack={onCancel} />
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="p-4 card text-center space-y-2">
        <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: 'var(--success)' }} />
        <p className="text-body">Mark this cash settlement as complete?</p>
        <p className="text-caption text-secondary">
          This will record that you {isPaying ? 'paid' : 'received'} {formattedAmount} in cash
        </p>
      </div>
      <div className="space-y-2">
        <PrimaryButton fullWidth onClick={onConfirm}>
          Confirm Cash Settlement
        </PrimaryButton>
        <PrimaryButton fullWidth onClick={onCancel}>
          Cancel
        </PrimaryButton>
      </div>
    </div>
  </div>
);
