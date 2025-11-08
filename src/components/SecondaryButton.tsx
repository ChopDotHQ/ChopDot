import { triggerHaptic } from "../utils/haptics";
import { Loader2 } from "lucide-react";

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
}

export function SecondaryButton({ children, onClick, disabled, fullWidth, loading = false }: SecondaryButtonProps) {
  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      triggerHaptic('light');
      onClick();
    }
  };

  const isDisabled = disabled || loading;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`px-4 py-2.5 card rounded-[var(--r-lg)] transition-all duration-200 hover:bg-muted/50 hover:border-ink/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-body text-center border border-border flex items-center justify-center gap-2 ${fullWidth ? 'w-full' : ''}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin transition-opacity duration-200" style={{ opacity: loading ? 1 : 0 }} />}
      <span className="transition-opacity duration-200" style={{ opacity: loading ? 0.7 : 1 }}>{children}</span>
    </button>
  );
}