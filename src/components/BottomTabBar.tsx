import { LayoutGrid, Home, Users, User, Receipt, LucideIcon } from "lucide-react";
import { triggerHaptic } from "../utils/haptics";

interface BottomTabBarProps {
  activeTab: "pots" | "people" | "activity" | "you";
  onTabChange: (tab: "pots" | "people" | "activity" | "you") => void;
  onFabClick: () => void;
  fabVisible?: boolean;
  fabIcon?: LucideIcon;
  fabColor?: string; // CSS variable or hex
}

export function BottomTabBar({
  activeTab,
  onTabChange,
  onFabClick,
  fabVisible = true,
  fabIcon: FabIcon = Receipt,
  fabColor = "var(--accent)",
}: BottomTabBarProps) {
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full z-50" style={{ maxWidth: '420px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-3 mb-2 rounded-2xl border border-border bg-background/80 backdrop-blur-sm shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-around px-2 h-[68px] relative">
        {/* Pots Tab */}
        <button
          onClick={() => {
            triggerHaptic('selection');
            onTabChange("pots");
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] -mt-2 transition-all duration-200 active:scale-95"
        >
          <LayoutGrid
            className={`w-6 h-6 transition-colors ${
              activeTab === "pots" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
          <span className={`text-[10px] transition-colors ${
            activeTab === "pots" ? "text-foreground" : "text-muted-foreground"
          }`}>
            Pots
          </span>
        </button>

        {/* People Tab */}
        <button
          onClick={() => {
            triggerHaptic('selection');
            onTabChange("people");
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] -mt-2 transition-all duration-200 active:scale-95"
        >
          <Users
            className={`w-6 h-6 transition-colors ${
              activeTab === "people" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
          <span className={`text-[10px] transition-colors ${
            activeTab === "people" ? "text-foreground" : "text-muted-foreground"
          }`}>
            People
          </span>
        </button>

        {/* Center FAB - Context-sensitive */}
        {fabVisible && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                triggerHaptic('medium');
                onFabClick();
              }}
              className="flex items-center justify-center w-14 h-14 rounded-full -mt-8 transition-all duration-200 active:scale-95"
              style={{ 
                background: fabColor,
                boxShadow: 'var(--shadow-fab)',
              }}
            >
              <FabIcon className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
          </div>
        )}
        
        {/* Spacer when FAB is hidden */}
        {!fabVisible && <div className="w-14" />}

        {/* Activity Tab */}
        <button
          onClick={() => {
            triggerHaptic('selection');
            onTabChange("activity");
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] -mt-2 transition-all duration-200 active:scale-95"
        >
          <Home
            className={`w-6 h-6 transition-colors ${
              activeTab === "activity" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
          <span className={`text-[10px] transition-colors ${
            activeTab === "activity" ? "text-foreground" : "text-muted-foreground"
          }`}>
            Activity
          </span>
        </button>

        {/* You Tab */}
        <button
          onClick={() => {
            triggerHaptic('selection');
            onTabChange("you");
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] -mt-2 transition-all duration-200 active:scale-95"
        >
          <User
            className={`w-6 h-6 transition-colors ${
              activeTab === "you" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
          <span className={`text-[10px] transition-colors ${
            activeTab === "you" ? "text-foreground" : "text-muted-foreground"
          }`}>
            You
          </span>
        </button>
        </div>
      </div>
    </div>
  );
}