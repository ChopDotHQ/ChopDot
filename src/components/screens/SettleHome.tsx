import { TopBar } from "../TopBar";
import { PrimaryButton } from "../PrimaryButton";
import { WalletBanner } from "../WalletBanner";
import { Banknote, Building2, Wallet, CheckCircle2, CreditCard, Smartphone, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { pushTxToast, updateTxToast, isTxActive } from "../../hooks/useTxToasts";
import { useFeatureFlags } from "../../contexts/FeatureFlagsContext";

interface Settlement {
  id: string;
  name: string;
  totalAmount: number;
  direction: "owe" | "owed";
  pots: Array<{ potId: string; potName: string; amount: number }>;
}

interface SettleHomeProps {
  settlements: Settlement[];
  walletConnected?: boolean;
  onConnectWallet?: () => void;
  onBack: () => void;
  onConfirm: (method: "cash" | "bank" | "paypal" | "twint" | "dot", reference?: string) => void;
  onHistory?: () => void;
  scope?: "pot" | "global";
  scopeLabel?: string;
  potId?: string;
  personId?: string;
  preferredMethod?: string;
}

export function SettleHome({
  settlements,
  walletConnected = false,
  onConnectWallet,
  onBack,
  onConfirm,
  onHistory,
  scope = "global",
  scopeLabel,
  potId: _potId,
  personId: _personId,
  preferredMethod,
}: SettleHomeProps) {
  // Read feature flags
  const { POLKADOT_APP_ENABLED, SERVICE_FEE_CAP_BPS } = useFeatureFlags();
  
  // Fee estimator stub - simulates Polkadot network fee API
  const estimateNetworkFee = async (): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
    return 0.0015 + Math.random() * 0.002; // Random fee between 0.0015-0.0035 DOT
  };

  // Preselection logic
  const getPreselectedMethod = (): "cash" | "bank" | "paypal" | "twint" | "dot" => {
    const pref = preferredMethod?.toLowerCase();
    
    if (pref === "bank") return "bank";
    if (pref === "paypal") return "paypal";
    if (pref === "twint") return "twint";
    if (pref === "dot" && walletConnected && POLKADOT_APP_ENABLED) return "dot";
    
    // Fallback order: Bank → PayPal → TWINT → DOT (only if wallet connected and enabled)
    return "bank";
  };
  
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "bank" | "paypal" | "twint" | "dot">(getPreselectedMethod());
  const [bankReference, setBankReference] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [twintPhone, setTwintPhone] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Fee estimation state
  const [feeEstimate, setFeeEstimate] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);
  
  // Settlement loading state
  const [isSettling, setIsSettling] = useState(false);
  
  // Update selected method when preferredMethod or walletConnected changes
  useEffect(() => {
    setSelectedMethod(getPreselectedMethod());
  }, [preferredMethod, walletConnected]);

  // Trigger fee estimation when DOT method selected + wallet connected
  useEffect(() => {
    if (selectedMethod === 'dot' && walletConnected) {
      setFeeLoading(true);
      setFeeError(false);
      setFeeEstimate(null);
      
      estimateNetworkFee()
        .then(fee => {
          setFeeEstimate(fee);
          setFeeLoading(false);
        })
        .catch(() => {
          setFeeError(true);
          setFeeLoading(false);
        });
    } else {
      // Reset fee state when not DOT or not connected
      setFeeEstimate(null);
      setFeeLoading(false);
      setFeeError(false);
    }
  }, [selectedMethod, walletConnected]);

  const totalAmount = settlements.reduce((sum, s) => {
    return s.direction === "owe" ? sum + s.totalAmount : sum - s.totalAmount;
  }, 0);

  const isPaying = totalAmount > 0;
  const counterparty = settlements[0]?.name || "Unknown";

  const handleConfirm = async () => {
    if (selectedMethod === "dot" && !walletConnected) {
      onConnectWallet?.();
      return;
    }

    // For non-DOT methods, show loading state
    if (selectedMethod !== "dot") {
      setIsSettling(true);
      
      // Simulate settlement processing
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setIsSettling(false);
    }

    if (selectedMethod === "cash") {
      setShowConfirmation(true);
      return;
    }

    // DOT settlement - emit transaction toast sequence
    if (selectedMethod === "dot" && walletConnected) {
      // State 1: Signing
      pushTxToast('signing', {
        amount: Math.abs(totalAmount),
        currency: 'USDT',
      });

      // Simulate signing delay (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

      // State 2: Broadcasting
      updateTxToast('broadcast', {
        amount: Math.abs(totalAmount),
        currency: 'USDT',
      });

      // Simulate broadcast delay (800ms)
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate mock tx hash
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // State 3: In block
      updateTxToast('inBlock', {
        amount: Math.abs(totalAmount),
        currency: 'USDT',
        txHash: mockTxHash,
        fee: feeEstimate || 0.0024,
        feeCurrency: 'DOT',
      });

      // Simulate in-block delay (1200ms)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // State 4: Finalized (auto-dismiss after 1.5s)
      const mockBlockNumber = Math.floor(Math.random() * 1000000) + 18000000;
      updateTxToast('finalized', {
        amount: Math.abs(totalAmount),
        currency: 'USDT',
        txHash: mockTxHash,
        fee: feeEstimate || 0.0024,
        feeCurrency: 'DOT',
        blockNumber: mockBlockNumber,
      });

      // Wait for auto-dismiss, then call onConfirm
      setTimeout(() => {
        onConfirm(selectedMethod, undefined);
      }, 1500);

      return;
    }

    // Non-DOT methods: direct confirmation
    let reference: string | undefined;
    if (selectedMethod === "bank") reference = bankReference;
    if (selectedMethod === "paypal") reference = paypalEmail;
    if (selectedMethod === "twint") reference = twintPhone;
    
    onConfirm(selectedMethod, reference);
  };

  const isValid = 
    selectedMethod === "cash" || 
    (selectedMethod === "bank" && bankReference.length > 0) || 
    (selectedMethod === "paypal" && paypalEmail.length > 0) ||
    (selectedMethod === "twint" && twintPhone.length > 0) ||(selectedMethod === "dot" && walletConnected);

  // Check if transaction is currently active (disable confirm button)
  const txActive = isTxActive();
  
  // Combined loading state: isSettling (for non-DOT) OR txActive (for DOT)
  const isLoading = isSettling || txActive;

  if (showConfirmation) {
    return (
      <div className="flex flex-col h-full pb-[68px]">
        <TopBar title="Confirm Cash Settlement" onBack={() => setShowConfirmation(false)} />
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="p-4 card text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: 'var(--success)' }} />
            <p className="text-body">Mark this cash settlement as complete?</p>
            <p className="text-caption text-secondary">
              This will record that you {isPaying ? 'paid' : 'received'} ${Math.abs(totalAmount).toFixed(2)} in cash
            </p>
          </div>

          <div className="space-y-2">
            <PrimaryButton fullWidth onClick={() => onConfirm("cash")}>
              Confirm Cash Settlement
            </PrimaryButton>
            <PrimaryButton fullWidth onClick={() => setShowConfirmation(false)}>
              Cancel
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-[68px]">
      <TopBar 
        title="Settle Up" 
        onBack={onBack}
        rightAction={onHistory ? (
          <button 
            onClick={onHistory}
            className="text-label text-accent hover:opacity-80 transition-opacity"
          >
            History
          </button>
        ) : undefined}
      />
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Scope Indicator */}
        {scopeLabel && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 rounded-lg">
            <span className="text-caption text-secondary">
              {scope === "pot" ? "📍 Settling:" : "🌐 Across:"}
            </span>
            <span className="text-caption" style={{ fontWeight: 500 }}>
              {scopeLabel}
            </span>
          </div>
        )}
        {/* Settlement Summary Card */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-secondary">
                {isPaying ? 'You owe' : 'You are owed'}
              </p>
              <p className="text-body" style={{ fontWeight: 500 }}>{counterparty}</p>
            </div>
            <div className="text-right">
              <p 
                className="tabular-nums"
                style={{ 
                  fontSize: '28px',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: isPaying ? 'var(--accent-orange)' : 'var(--success)'
                }}
              >
                ${Math.abs(totalAmount).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          {settlements.length > 0 && settlements[0]?.pots && settlements[0]?.pots.length > 1 && (
            <div className="pt-2 border-t border-border/50 space-y-1">
              {settlements[0]?.pots?.map(pot => (
                <div key={pot.potId} className="flex justify-between text-caption text-secondary">
                  <span>{pot.potName}</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>${pot.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wallet Banner for DOT */}
        {selectedMethod === "dot" && !walletConnected && (
          <WalletBanner
            isConnected={false}
            onConnect={onConnectWallet ?? (() => {})}
          />
        )}

        {/* Payment Method Tabs */}
        <div className="space-y-2">
          <label className="text-caption text-secondary">Payment Method</label>
          
          {/* Tab Buttons - 4-5 methods: Cash, Bank, PayPal, TWINT, DOT (conditional) */}
          <div className={`card p-1 grid gap-1 ${POLKADOT_APP_ENABLED ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <button
              onClick={() => setSelectedMethod("cash")}
              className={`px-2 py-2.5 rounded-[var(--r-lg)] transition-all ${
                selectedMethod === "cash"
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted/5'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Banknote className="w-5 h-5" style={{ color: selectedMethod === "cash" ? 'var(--foreground)' : 'var(--muted)' }} />
                <span className="text-caption" style={{ 
                  color: selectedMethod === "cash" ? 'var(--foreground)' : 'var(--muted)',
                  fontWeight: selectedMethod === "cash" ? 500 : 400
                }}>
                  Cash
                </span>
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod("bank")}
              className={`px-2 py-2.5 rounded-[var(--r-lg)] transition-all ${
                selectedMethod === "bank"
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted/5'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Building2 className="w-5 h-5" style={{ color: selectedMethod === "bank" ? 'var(--foreground)' : 'var(--muted)' }} />
                <span className="text-caption" style={{ 
                  color: selectedMethod === "bank" ? 'var(--foreground)' : 'var(--muted)',
                  fontWeight: selectedMethod === "bank" ? 500 : 400
                }}>
                  Bank
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedMethod("paypal")}
              className={`px-2 py-2.5 rounded-[var(--r-lg)] transition-all ${
                selectedMethod === "paypal"
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted/5'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <CreditCard className="w-5 h-5" style={{ color: selectedMethod === "paypal" ? 'var(--foreground)' : 'var(--muted)' }} />
                <span className="text-caption" style={{ 
                  color: selectedMethod === "paypal" ? 'var(--foreground)' : 'var(--muted)',
                  fontWeight: selectedMethod === "paypal" ? 500 : 400
                }}>
                  PayPal
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedMethod("twint")}
              className={`px-2 py-2.5 rounded-[var(--r-lg)] transition-all ${
                selectedMethod === "twint"
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted/5'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Smartphone className="w-5 h-5" style={{ color: selectedMethod === "twint" ? 'var(--foreground)' : 'var(--muted)' }} />
                <span className="text-caption" style={{ 
                  color: selectedMethod === "twint" ? 'var(--foreground)' : 'var(--muted)',
                  fontWeight: selectedMethod === "twint" ? 500 : 400
                }}>
                  TWINT
                </span>
              </div>
            </button>
            
            {POLKADOT_APP_ENABLED && (
              <button
                onClick={() => setSelectedMethod("dot")}
                className={`px-2 py-2.5 rounded-[var(--r-lg)] transition-all ${
                  selectedMethod === "dot"
                    ? 'bg-background shadow-sm'
                    : 'hover:bg-muted/5'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Wallet className="w-5 h-5" style={{ color: selectedMethod === "dot" ? 'var(--foreground)' : 'var(--muted)' }} />
                  <span className="text-caption" style={{ 
                    color: selectedMethod === "dot" ? 'var(--foreground)' : 'var(--muted)',
                    fontWeight: selectedMethod === "dot" ? 500 : 400
                  }}>
                    DOT
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Method Details */}
        {selectedMethod === "cash" && (
          <div className="card p-4">
            <p className="text-caption text-secondary">
              Mark this payment as cash. No additional details needed.
            </p>
          </div>
        )}

        {selectedMethod === "bank" && (
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-caption text-secondary block mb-1.5">
                Payment Reference (Optional)
              </label>
              <input
                type="text"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="e.g., Invoice #123"
                className="w-full px-3 py-2 input-field text-body"
              />
            </div>
            <p className="text-caption text-secondary">
              Bank transfer. Add a reference to help track this payment.
            </p>
          </div>
        )}
        
        {selectedMethod === "paypal" && (
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-caption text-secondary block mb-1.5">
                PayPal Email
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-3 py-2 input-field text-body"
              />
            </div>
            <p className="text-caption text-secondary">
              Send payment via PayPal to the recipient's email address.
            </p>
          </div>
        )}
        
        {selectedMethod === "twint" && (
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-caption text-secondary block mb-1.5">
                TWINT Phone Number
              </label>
              <input
                type="tel"
                value={twintPhone}
                onChange={(e) => setTwintPhone(e.target.value)}
                placeholder="+41 79 123 45 67"
                className="w-full px-3 py-2 input-field text-body"
              />
            </div>
            <p className="text-caption text-secondary">
              Send payment via TWINT to the recipient's mobile number.
            </p>
          </div>
        )}

        {POLKADOT_APP_ENABLED && selectedMethod === "dot" && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
              <p className="text-body font-medium">Polkadot Settlement</p>
            </div>
            <p className="text-caption text-secondary">
              {walletConnected 
                ? `Send ${Math.abs(totalAmount).toFixed(2)} USDT on Polkadot. This will create an on-chain transaction.`
                : 'Connect your Polkadot wallet to settle on-chain in USDT.'
              }
            </p>

            {/* Fee & Total Section - Only visible when wallet connected */}
            {walletConnected && (
              <div className="pt-3 space-y-3">
                {/* Loading State */}
                {feeLoading && (
                  <div className="flex items-center gap-2 text-caption text-muted">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Estimating…</span>
                  </div>
                )}

                {/* Success State - Fee Row */}
                {!feeLoading && feeEstimate !== null && !feeError && (
                  <div className="flex justify-between text-caption">
                    <span className="text-muted">Network fee (est.):</span>
                    <span className="tabular-nums text-muted">~{feeEstimate.toFixed(4)} DOT</span>
                  </div>
                )}

                {/* Error State */}
                {!feeLoading && feeError && (
                  <div className="flex justify-between text-caption">
                    <span className="text-muted">Network fee (est.):</span>
                    <span style={{ color: 'var(--danger)', opacity: 0.6 }}>Fee unavailable</span>
                  </div>
                )}

                {/* Service Fee Row */}
                {!feeLoading && (() => {
                  const bps = Math.max(0, Number(SERVICE_FEE_CAP_BPS) || 0);
                  const serviceFee = Math.max(0, Math.abs(totalAmount)) * (bps / 10_000);
                  const servicePct = (bps / 100).toFixed(2);
                  
                  return (
                    <div className="flex justify-between text-caption">
                      <span className="text-muted">Service fee ({servicePct}%):</span>
                      <span className="tabular-nums text-muted">{serviceFee.toFixed(2)} USD</span>
                    </div>
                  );
                })()}

                {/* Divider */}
                {!feeLoading && (
                  <div className="border-t border-border/50" />
                )}

                {/* Total Row - Always show when not loading */}
                {!feeLoading && (
                  <div className="flex justify-between items-start">
                    <span className="text-body font-medium">Total you'll send:</span>
                    <div className="text-right">
                      <p className="text-body font-medium tabular-nums">{Math.abs(totalAmount).toFixed(2)} USDT</p>
                      <p className="text-caption text-muted tabular-nums">
                        {feeEstimate !== null && !feeError 
                          ? `+ ~${feeEstimate.toFixed(4)} DOT`
                          : '+ network fee'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="p-4 bg-background border-t border-border">
        <PrimaryButton
          fullWidth
          onClick={handleConfirm}
          disabled={!isValid || isLoading}
          loading={isLoading}
        >
          {selectedMethod === "dot" && !walletConnected 
            ? "Connect Wallet" 
            : `Confirm ${selectedMethod === "cash" ? "Cash" : selectedMethod === "bank" ? "Bank" : selectedMethod === "paypal" ? "PayPal" : selectedMethod === "twint" ? "TWINT" : "DOT"} Settlement`
          }
        </PrimaryButton>
      </div>
    </div>
  );
}
