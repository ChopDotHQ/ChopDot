import { triggerHaptic } from "../utils/haptics";
import { Loader2 } from "lucide-react";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: "default" | "gradient";
  loading?: boolean;
}

export function PrimaryButton({ children, onClick, disabled, fullWidth, variant = "default", loading = false }: PrimaryButtonProps) {
  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      triggerHaptic('light');
      onClick();
    }
  };

  const isDisabled = disabled || loading;

  // Gradient variant (uses solid accent under monochrome + pink scheme)
  if (variant === "gradient") {
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`px-4 py-2.5 rounded-[var(--r-lg)] transition-all duration-200 text-body text-center flex items-center justify-center gap-2 ${
          isDisabled
            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
            : 'btn-accent active:scale-[0.98]'
        } ${fullWidth ? 'w-full' : ''}`}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span style={{ opacity: loading ? 0.9 : 1 }}>{children}</span>
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`px-4 py-2.5 rounded-[var(--r-lg)] transition-all duration-200 text-body text-center flex items-center justify-center gap-2 ${
        isDisabled
          ? 'bg-muted/30 text-muted-foreground cursor-not-allowed border border-border'
          : 'card hover:bg-muted/50 active:scale-[0.98] active-ripple text-foreground border border-border'
      } ${fullWidth ? 'w-full' : ''}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      <span style={{ opacity: loading ? 0.9 : 1 }}>{children}</span>
    </button>
  );
}