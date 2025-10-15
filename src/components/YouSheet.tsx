import { X, QrCode, Scan, CreditCard, TrendingUp, User as UserIcon, Settings as SettingsIcon } from "lucide-react";

interface YouSheetProps {
  onClose: () => void;
  onShowQR: () => void;
  onScanQR: () => void;
  onPaymentMethods: () => void;
  onViewInsights: () => void;
  onSettings: () => void;
  insights: {
    monthlySpending: number;
    topCategory: string;
    topCategoryAmount: number;
    activePots: number;
    totalSettled: number;
  };
}

export function YouSheet({
  onClose,
  onShowQR,
  onScanQR,
  onPaymentMethods,
  onViewInsights,
  onSettings,
  insights,
}: YouSheetProps) {
  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-x-0 top-0 glass-sheet rounded-b-xl max-h-[80vh] flex flex-col animate-slideUp border-b-0 elev-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-screen-title">Profile & Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Profile Section */}
          <div className="card p-4 elev-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-body">You</p>
                <p className="text-label text-muted-foreground">@your_handle</p>
              </div>
            </div>
            
            {/* QR Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onShowQR}
                className="p-3 bg-muted/50 hover:bg-muted rounded-lg transition-all duration-200 active:scale-95"
              >
                <QrCode className="w-5 h-5 mx-auto mb-1 text-foreground" />
                <p className="text-label text-center">My QR</p>
              </button>
              <button
                onClick={onScanQR}
                className="p-3 bg-muted/50 hover:bg-muted rounded-lg transition-all duration-200 active:scale-95"
              >
                <Scan className="w-5 h-5 mx-auto mb-1 text-foreground" />
                <p className="text-label text-center">Scan</p>
              </button>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="card p-4 elev-1">
            <h3 className="text-section mb-3">Quick insights</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-label text-muted-foreground">Monthly spending</span>
                <span className="text-label">${insights.monthlySpending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label text-muted-foreground">Active pots</span>
                <span className="text-label">{insights.activePots}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label text-muted-foreground">Total settled</span>
                <span className="text-label">${insights.totalSettled}</span>
              </div>
            </div>
            <button
              onClick={onViewInsights}
              className="w-full mt-3 p-2.5 bg-muted/50 hover:bg-muted rounded-lg transition-all duration-200 active:scale-95 text-label"
            >
              <TrendingUp className="w-4 h-4 inline mr-1.5" />
              View detailed insights
            </button>
          </div>

          {/* Settings Actions */}
          <div className="space-y-2">
            <button
              onClick={onPaymentMethods}
              className="w-full glass-sm rounded-xl p-3 flex items-center justify-between hover:bg-muted/50 transition-all duration-200 active:scale-95"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span className="text-body">Payment methods</span>
              </div>
              <span className="text-label text-muted-foreground">›</span>
            </button>
            
            <button
              onClick={onSettings}
              className="w-full glass-sm rounded-xl p-3 flex items-center justify-between hover:bg-muted/50 transition-all duration-200 active:scale-95"
            >
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                <span className="text-body">Settings</span>
              </div>
              <span className="text-label text-muted-foreground">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}