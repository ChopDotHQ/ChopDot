import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { usePSAStyle } from "../utils/usePSAStyle";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function BottomSheet({ isOpen, onClose, title, children, maxWidth = '560px' }: BottomSheetProps) {
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex flex-col justify-center md:justify-center" style={{ zIndex: 100 }}>
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.84)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />
      <div className="mx-auto w-full px-4" style={{ maxWidth }}>
      <div
          className={isPSA ? `relative w-full ${psaClasses.panel} rounded-2xl flex flex-col mx-auto overflow-hidden` : "relative w-full rounded-2xl border flex flex-col mx-auto overflow-hidden"}
          style={isPSA ? { ...psaStyles.panel, maxHeight: '85vh' } : {
            maxHeight: '85vh',
            background: '#121214',
            borderColor: 'rgba(255,255,255,0.16)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
      >
        <div className="flex items-center justify-between p-4 pb-3 flex-shrink-0 border-b border-white/10">
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
