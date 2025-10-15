import { X } from "lucide-react";

interface MemberChipProps {
  name: string;
  initials?: string;
  role?: "Owner" | "Member";
  status?: "active" | "pending";
  onRemove?: () => void;
  attested?: boolean;
}

export function MemberChip({ name, initials, role, status, onRemove, attested }: MemberChipProps) {
  const displayInitials = initials || name.substring(0, 2).toUpperCase();
  
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1.5 card rounded-[var(--r-xl)]">
      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-micro">
        {attested !== undefined ? (attested ? "✅" : "○") : displayInitials}
      </div>
      <span className="text-label">{name}</span>
      {role && (
        <span className="text-caption px-1.5 py-0.5 bg-secondary rounded-[var(--r-lg)]">{role}</span>
      )}
      {status === "pending" && (
        <span className="text-micro px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">Pending</span>
      )}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 p-0.5 hover:bg-border rounded transition-all duration-200 active:scale-95">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}