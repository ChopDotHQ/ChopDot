import { TopBar } from "../TopBar";
import { useState } from "react";
import { TrendingUp, Wallet } from "lucide-react";

interface AddContributionProps {
  potName: string;
  baseCurrency: string;
  currentBalance: number;
  yieldRate: number;
  defiProtocol: string;
  onBack: () => void;
  onConfirm: (amount: number, method: "wallet" | "bank") => void;
}

export function AddContribution({
  potName,
  baseCurrency,
  currentBalance,
  yieldRate,
  defiProtocol,
  onBack,
  onConfirm,
}: AddContributionProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"wallet" | "bank">("wallet");

  const numAmount = parseFloat(amount) || 0;
  const estimatedYield = (numAmount * yieldRate) / 100 / 12; // Monthly yield
  const newTotal = currentBalance + numAmount;

  const isValid = numAmount > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar title="Add Funds" onBack={onBack} />

      <div className="flex-1 overflow-auto p-3 space-y-3 pb-[68px]">
        {/* Pot Info Banner */}
        <div className="hero-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--success)' }}>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm" style={{ fontWeight: 500 }}>{potName}</p>
              <p className="text-xs text-muted-foreground">{defiProtocol} · {yieldRate.toFixed(1)}% APY</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xs text-muted-foreground">Current pooled</p>
            <p className="text-sm tabular-nums" style={{ fontWeight: 500 }}>
              {baseCurrency} {currentBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground px-1">Amount to add</label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 bg-card border border-border rounded-xl focus:outline-none focus-ring-pink text-[28px] tabular-nums pr-20"
              style={{ fontWeight: 600 }}
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[28px] text-muted-foreground tabular-nums" style={{ fontWeight: 600 }}>
              {baseCurrency}
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {[100, 500, 1000].map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount.toString())}
                className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-xs hover:bg-muted/10 transition-colors active:scale-[0.98]"
              >
                +{baseCurrency} {quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Yield Projection */}
        {numAmount > 0 && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(86, 243, 154, 0.08)', border: '1px solid rgba(86, 243, 154, 0.2)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Estimated monthly yield</p>
              <p className="text-sm tabular-nums" style={{ fontWeight: 600, color: 'var(--success)' }}>
                +{baseCurrency} {estimatedYield.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">New total pooled</p>
              <p className="text-sm tabular-nums" style={{ fontWeight: 500 }}>
                {baseCurrency} {newTotal.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground px-1">Payment method</label>
          
          <div className="space-y-2">
            <button
              onClick={() => setMethod("wallet")}
              className={`w-full p-3 rounded-xl border transition-all active:scale-[0.98] ${
                method === "wallet"
                  ? "bg-card"
                  : "border-border bg-card hover:bg-muted/10"
              }`}
              style={method === "wallet" ? { borderColor: 'var(--success)' } : {}}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  method === "wallet" ? "" : "bg-muted/20"
                }`} style={method === "wallet" ? { background: 'var(--success)' } : {}}>
                  <Wallet className={`w-5 h-5 ${method === "wallet" ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm" style={{ fontWeight: 500 }}>Polkadot Wallet</p>
                  <p className="text-xs text-muted-foreground">Direct on-chain deposit</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  method === "wallet" ? "" : "border-border"
                }`} style={method === "wallet" ? { borderColor: 'var(--success)' } : {}}>
                  {method === "wallet" && (
                    <div className="w-3 h-3 rounded-full" style={{ background: 'var(--success)' }} />
                  )}
                </div>
              </div>
            </button>

            <button
              onClick={() => setMethod("bank")}
              className={`w-full p-3 rounded-xl border transition-all active:scale-[0.98] ${
                method === "bank"
                  ? "bg-card"
                  : "border-border bg-card hover:bg-muted/10"
              }`}
              style={method === "bank" ? { borderColor: 'var(--success)' } : {}}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  method === "bank" ? "" : "bg-muted/20"
                }`} style={method === "bank" ? { background: 'var(--success)' } : {}}>
                  <svg className={`w-5 h-5 ${method === "bank" ? "text-white" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm" style={{ fontWeight: 500 }}>Bank Transfer</p>
                  <p className="text-xs text-muted-foreground">Traditional banking (2-3 days)</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  method === "bank" ? "" : "border-border"
                }`} style={method === "bank" ? { borderColor: 'var(--success)' } : {}}>
                  {method === "bank" && (
                    <div className="w-3 h-3 rounded-full" style={{ background: 'var(--success)' }} />
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-muted/10 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {method === "wallet" 
              ? `Funds will be deposited directly into ${defiProtocol} and start earning ${yieldRate.toFixed(1)}% APY immediately.`
              : `Bank transfers take 2-3 business days to clear before funds start earning yield.`
            }
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-3 border-t border-border bg-background">
        <button
          onClick={() => {
            if (isValid) {
              onConfirm(numAmount, method);
            }
          }}
          disabled={!isValid}
          className="w-full py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ 
            background: isValid ? 'var(--success)' : 'var(--muted)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {isValid ? `Add ${baseCurrency} ${numAmount.toFixed(2)}` : 'Enter amount'}
        </button>
      </div>
    </div>
  );
}
