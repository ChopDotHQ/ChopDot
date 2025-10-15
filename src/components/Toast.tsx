import { CheckCircle, Info, XCircle } from "lucide-react";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "info" | "error";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
    error: <XCircle className="w-4 h-4" />,
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-3 py-2 card rounded-[var(--r-xl)] flex items-center gap-2 min-w-[280px] animate-slideUp">
      {icons[type]}
      <span className="text-label flex-1">{message}</span>
    </div>
  );
}