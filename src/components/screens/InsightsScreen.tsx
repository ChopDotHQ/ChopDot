import { ChevronLeft, TrendingUp, DollarSign, Users, Check, CheckCircle2, HandCoins } from "lucide-react";
import { useState } from "react";

interface InsightsScreenProps {
  onBack: () => void;
  monthlySpending: number;
  activePots: number;
  totalSettled: number;
  monthlyData: { month: string; amount: number }[];
  confirmationRate: number;
  expensesConfirmed: number;
  settlementsCompleted: number;
  activeGroups: number;
}

export function InsightsScreen({
  onBack,
  monthlySpending,
  activePots,
  totalSettled,
  monthlyData,
  confirmationRate,
  expensesConfirmed,
  settlementsCompleted,
  activeGroups,
}: InsightsScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"3m" | "6m" | "1y">("3m");
  
  const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-screen-title">Your Insights</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4">
        {/* Period Filter */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-0.5 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.06)' }}>
            <button
              onClick={() => setSelectedPeriod("3m")}
              className="px-4 py-1.5 rounded-md text-xs transition-all duration-200"
              style={{
                background: selectedPeriod === "3m" ? 'var(--card)' : 'transparent',
                color: selectedPeriod === "3m" ? 'var(--ink)' : 'var(--muted)',
                fontWeight: selectedPeriod === "3m" ? 600 : 400,
                boxShadow: selectedPeriod === "3m" ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
              }}
            >
              3 months
            </button>
            <button
              onClick={() => setSelectedPeriod("6m")}
              className="px-4 py-1.5 rounded-md text-xs transition-all duration-200"
              style={{
                background: selectedPeriod === "6m" ? 'var(--card)' : 'transparent',
                color: selectedPeriod === "6m" ? 'var(--ink)' : 'var(--muted)',
                fontWeight: selectedPeriod === "6m" ? 600 : 400,
                boxShadow: selectedPeriod === "6m" ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
              }}
            >
              6 months
            </button>
            <button
              onClick={() => setSelectedPeriod("1y")}
              className="px-4 py-1.5 rounded-md text-xs transition-all duration-200"
              style={{
                background: selectedPeriod === "1y" ? 'var(--card)' : 'transparent',
                color: selectedPeriod === "1y" ? 'var(--ink)' : 'var(--muted)',
                fontWeight: selectedPeriod === "1y" ? 600 : 400,
                boxShadow: selectedPeriod === "1y" ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
              }}
            >
              1 year
            </button>
          </div>
        </div>

        {/* Combined Metrics - Spending */}
        <div className="card p-4">
          <h3 className="text-sm mb-3" style={{ fontWeight: 600 }}>Spending</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-secondary" />
                <p className="text-micro text-secondary">This Month</p>
              </div>
              <p className="text-xl tabular-nums" style={{ fontWeight: 700 }}>${monthlySpending.toFixed(0)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                <p className="text-micro text-secondary">Avg/Month</p>
              </div>
              <p className="text-xl tabular-nums" style={{ fontWeight: 700 }}>
                ${Math.round(monthlyData.reduce((sum, d) => sum + d.amount, 0) / monthlyData.length)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HandCoins className="w-3.5 h-3.5 text-secondary" />
                <p className="text-micro text-secondary">Total Settled</p>
              </div>
              <p className="text-xl tabular-nums" style={{ fontWeight: 700 }}>${totalSettled.toFixed(0)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-secondary" />
                <p className="text-micro text-secondary">Active Groups</p>
              </div>
              <p className="text-xl tabular-nums" style={{ fontWeight: 700 }}>{activeGroups}</p>
            </div>
          </div>
        </div>

        {/* Reliability Metrics */}
        <div className="card p-4">
          <h3 className="text-sm mb-3" style={{ fontWeight: 600 }}>Reliability</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl tabular-nums mb-1" style={{ fontWeight: 700 }}>{confirmationRate}%</div>
              <div className="text-micro text-secondary">Confirm rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl tabular-nums mb-1" style={{ fontWeight: 700 }}>{expensesConfirmed}</div>
              <div className="text-micro text-secondary">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-xl tabular-nums mb-1" style={{ fontWeight: 700 }}>{settlementsCompleted}</div>
              <div className="text-micro text-secondary">Settled</div>
            </div>
          </div>
        </div>

        {/* Spending Over Time */}
        <div className="card p-4">
          <h3 className="text-sm mb-4" style={{ fontWeight: 600 }}>Spending Over Time</h3>
          <div className="flex gap-3">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between" style={{ height: "140px", paddingBottom: "20px" }}>
              <span className="text-micro text-secondary">${Math.round(maxAmount)}</span>
              <span className="text-micro text-secondary">${Math.round(maxAmount * 0.66)}</span>
              <span className="text-micro text-secondary">${Math.round(maxAmount * 0.33)}</span>
              <span className="text-micro text-secondary">$0</span>
            </div>
            
            {/* Chart area */}
            <div className="flex-1 relative" style={{ height: "140px" }}>
              {/* Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between" style={{ paddingBottom: "20px" }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-px bg-border" />
                ))}
              </div>
              
              {/* Bars */}
              <div className="absolute inset-0 flex items-end justify-between gap-2" style={{ paddingBottom: "20px" }}>
                {monthlyData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 max-w-[60px]">
                    <div className="w-full relative" style={{ height: "120px" }}>
                      <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-md transition-all"
                        style={{ 
                          height: `${(data.amount / maxAmount) * 100}%`,
                          width: "32px",
                          background: 'var(--ink)'
                        }}
                      />
                    </div>
                    <span className="text-micro text-secondary">{data.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}