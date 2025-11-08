import { LucideIcon } from "lucide-react";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon: Icon, 
  message, 
  description,
  primaryAction,
  secondaryAction 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 card rounded-[var(--r-xl)] transition-shadow duration-200">
      <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center">
        <Icon className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-body text-center" style={{ fontWeight: 500 }}>{message}</p>
        {description && (
          <p className="text-caption text-center text-secondary mt-1">{description}</p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col gap-2 w-full max-w-[200px] mt-2">
          {primaryAction && (
            <PrimaryButton onClick={primaryAction.onClick} fullWidth>
              {primaryAction.label}
            </PrimaryButton>
          )}
          {secondaryAction && (
            <SecondaryButton onClick={secondaryAction.onClick} fullWidth>
              {secondaryAction.label}
            </SecondaryButton>
          )}
        </div>
      )}
    </div>
  );
}