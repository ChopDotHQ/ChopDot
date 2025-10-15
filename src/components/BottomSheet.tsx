import { X } from "lucide-react";
import { ReactNode } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-[var(--r-2xl)] shadow-[var(--shadow-card)] flex flex-col" style={{ maxHeight: '85%', minHeight: '500px' }}>
        <div className="flex items-center justify-between p-4 pb-3 flex-shrink-0 border-b border-border">
          <h2 className="text-body font-medium">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-[var(--r-lg)] transition-colors active:scale-95">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}