import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 card rounded-[var(--r-xl)]">
      <Icon className="w-10 h-10" style={{ color: 'var(--muted)' }} />
      <p className="text-label text-center" style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}