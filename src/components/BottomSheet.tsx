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
    <div className="fixed inset-0 flex flex-col justify-center md:justify-center" style={{ zIndex: 100 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-[420px] md:max-w-[560px] mx-auto px-4">
        <div
          className="relative w-full bg-card rounded-2xl shadow-[var(--shadow-card)] flex flex-col mx-auto overflow-hidden"
          style={{ maxHeight: '85vh' }}
        >
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
    </div>
  );
}