import { ChevronLeft } from "lucide-react";

interface TopBarProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function TopBar({ title, onBack, rightAction }: TopBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-background border-b-0 sticky top-0 z-10">
      {onBack && (
        <button
          onClick={onBack}
          className="p-1 -ml-1 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="text-screen-title flex-1">{title}</h1>
      {rightAction}
    </div>
  );
}