import { TopBar } from "../TopBar";
import { PrimaryButton } from "../PrimaryButton";
import { WalletBanner } from "../WalletBanner";
import { Banknote, Building2, Wallet, CheckCircle2, CreditCard, Smartphone, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { pushTxToast, updateTxToast, isTxActive } from "../../hooks/useTxToasts";
import { useFeatureFlags } from "../../contexts/FeatureFlagsContext";
import { useAccount } from "../../contexts/AccountContext";
import { triggerHaptic } from "../../utils/haptics";
import { HyperbridgeBridgeSheet } from "../HyperbridgeBridgeSheet";
import type { Pot } from "../../schema/pot";
import {
  computeDisplayPlatformFee,
  shouldShowPlatformFee,
  canCollectPlatformFee,
  formatDOT,
  formatFiat,
  formatFeeWithEquivalent,
  type DisplayCurrency,
} from '../../utils/platformFee';
import { getDotPrice } from '../../services/prices/coingecko';

interface Settlement {
  id: string;
  name: string;
  totalAmount: number;
  direction: "owe" | "owed";
  pots: Array<{ potId: string; potName: string; amount: number }>;
}

interface SettleHomeProps {
  settlements: Settlement[];
  onBack: () => void;
  onConfirm: (method: "cash" | "bank" | "paypal" | "twint" | "dot", reference?: string) => void;
  onHistory?: () => void;
  scope?: "pot" | "global";
  scopeLabel?: string;
  potId?: string;
  personId?: string;
  preferredMethod?: string;
  recipientAddress?: string; // Optional recipient wallet address for DOT settlements
  baseCurrency?: string; // Base currency for the pot (e.g., "DOT", "USD")
  onShowToast?: (message: string, type?: "success" | "error" | "info") => void; // Optional toast callback
  pot?: Pot; // Pot data for pre-settlement checkpoint
  onUpdatePot?: (updates: { lastCheckpoint?: { hash: string; txHash?: string; at: string; cid?: string } }) => void; // Callback to update pot
}

export function SettleHome({
  settlements,
  onBack,
  onConfirm,
  onHistory,
  scope = "global",
  scopeLabel,
  potId: _potId,
  personId: _personId,
  preferredMethod,
  recipientAddress,
  baseCurrency = "USD", // Default to USD if not provided
  onShowToast,
  pot: _pot,
  onUpdatePot: _onUpdatePot,
}: SettleHomeProps) {
  const isDotPot = baseCurrency === 'DOT';
  // Check for simulation mode (allows DOT settlement without wallet)
  const isSimulationMode = import.meta.env.VITE_SIMULATE_CHAIN === '1';
  // Read feature flags
  const { POLKADOT_APP_ENABLED } = useFeatureFlags();
  // Use Account context for wallet connection status
  const account = useAccount();
  const walletConnected = account.status === 'connected';

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
  const [showBridgeSheet, setShowBridgeSheet] = useState(false);
  // const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  
  // Fee estimation state
  const [feeEstimate, setFeeEstimate] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);
  
  // Fiat equivalent for DOT fees (for display)
  const [dotPriceUsd, setDotPriceUsd] = useState<number | null>(null);
  
  // Settlement loading state
  const [isSettling, setIsSettling] = useState(false);
  
  // Update selection only when the preferred method changes
  // Do NOT change on wallet connect; preserve the user's current tab
  useEffect(() => {
    setSelectedMethod((current) => {
      // If user already chose a method, keep it unless we have no selection
      return current ?? getPreselectedMethod();
    });
  }, [preferredMethod]);

  // Fetch DOT price for fiat equivalent display (for DOT pots OR when DOT method is selected)
  useEffect(() => {
    const shouldFetchPrice = (isDotPot || selectedMethod === 'dot') && 
                             import.meta.env.VITE_ENABLE_PRICE_API !== '0';
    if (shouldFetchPrice) {
      getDotPrice('usd')
        .then(price => {
          setDotPriceUsd(price);
        })
        .catch(() => {
          // Keep dotPriceUsd as null if fetch fails
        });
    }
  }, [isDotPot, selectedMethod]);

  // Compute directionally so we don't accidentally net to 0 when both directions exist
  const amountYouOwe = settlements
    .filter(s => s.direction === "owe")
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const amountOwedToYou = settlements
    .filter(s => s.direction === "owed")
    .reduce((sum, s) => sum + s.totalAmount, 0);
  // Choose the active side: if you owe anything, you are paying; otherwise you are receiving
  const totalAmount = amountYouOwe > 0 ? amountYouOwe : -amountOwedToYou;

  // Fee estimator - uses real chain service for DOT payments
  // Defined after totalAmount to avoid "before initialization" error
  const estimateNetworkFee = async (): Promise<number> => {
    // In simulation mode, allow fee estimation without wallet
    const canEstimateFee = isSimulationMode || (walletConnected && account.address0);
    // Allow fee estimation when DOT method is selected (regardless of pot currency)
    const isDotMethodSelected = selectedMethod === 'dot';
    if (isDotMethodSelected && canEstimateFee && recipientAddress && totalAmount > 0) {
      try {
        const { chain } = await import('../../services/chain');
        const fromAddress = isSimulationMode && !account.address0 
          ? '15mock00000000000000000000000000000A' // Mock sender address for simulation
          : account.address0!;
        
        // Convert amount to DOT if pot is fiat-based
        let amountDot = Math.abs(totalAmount);
        if (!isDotPot && dotPriceUsd && dotPriceUsd > 0) {
          // Convert fiat amount to DOT using current price
          amountDot = Math.abs(totalAmount) / dotPriceUsd;
        }
        
        const feePlanck = await chain.estimateFee({
          from: fromAddress,
          to: recipientAddress,
          amountDot,
        });
        const config = chain.getConfig();
        // Convert planck to DOT (10 decimals)
        const feeDot = parseFloat(feePlanck) / Math.pow(10, config.decimals);
        return feeDot;
      } catch (error) {
        console.error('[SettleHome] Fee estimation error:', error);
        // Fallback to conservative estimate
        return 0.0025;
      }
    }
    // Stub for non-DOT method or when not connected
    await new Promise(resolve => setTimeout(resolve, 800));
    return 0.0015 + Math.random() * 0.002;
  };

  // Estimate network fee when DOT method is selected
  useEffect(() => {
    if (selectedMethod === 'dot' && recipientAddress && totalAmount > 0) {
      setFeeLoading(true);
      setFeeError(false);
      estimateNetworkFee()
        .then(fee => {
          setFeeEstimate(fee);
          setFeeLoading(false);
        })
        .catch(error => {
          console.error('[SettleHome] Fee estimation failed:', error);
          setFeeError(true);
          setFeeLoading(false);
          setFeeEstimate(null);
        });
    } else {
      setFeeEstimate(null);
      setFeeLoading(false);
      setFeeError(false);
    }
  }, [selectedMethod, recipientAddress, totalAmount, walletConnected, account.address0, isDotPot, dotPriceUsd]);

  const isPaying = totalAmount > 0;
  // Get counterparty name from settlements - if multiple, use the first one
  // If settlements array is empty, try to get from the personId context
  const counterparty = settlements.length > 0 
    ? settlements[0]?.name || "Unknown"
    : "Unknown";
  
  // Format amount based on currency
  const formatAmount = (amount: number): string => {
    if (isDotPot) {
      return `${Math.abs(amount).toFixed(6)} DOT`;
    }
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  const handleConfirm = async () => {
    // For DOT method, wallet must be connected (handled by AccountMenu in header)
    if (selectedMethod === "dot" && !walletConnected) {
      // Wallet connection is handled by AccountMenu - user should connect via header
      return;
    }

    // Pre-settlement checkpoint - REMOVED
    // Proceed directly to settlement
    await performSettlement();
    
    async function performSettlement() {
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

    // DOT settlement - use real chain service from Prompt 1
    // In simulation mode, allow without wallet connection (will use mock address)
    const canProceedDot = isSimulationMode || (walletConnected && account.address0);
    if (selectedMethod === "dot" && canProceedDot && recipientAddress) {
      try {
          // Convert amount to DOT if pot is fiat-based
          let amountDot = Math.abs(totalAmount);
          if (!isDotPot) {
            if (!dotPriceUsd || dotPriceUsd <= 0) {
              onShowToast?.(
                'Unable to convert amount to DOT. Please try again.',
                'error'
              );
              return;
            }
            // Convert fiat amount to DOT using current price
            amountDot = Math.abs(totalAmount) / dotPriceUsd;
          }
          
          // Balance validation: check amount + fee
          const conservativeFee = feeEstimate ?? 0.01; // Use estimate or conservative fallback
          const required = amountDot + conservativeFee;
          
          if (walletConnected && account.balanceHuman) {
            const walletBalance = parseFloat(account.balanceHuman || '0');
            if (walletBalance < required) {
              onShowToast?.(
                `Insufficient balance: need ~${formatDOT(required)} (${formatDOT(amountDot)} + ${formatDOT(conservativeFee)} fee)`,
                'error'
              );
              return;
            }
          }
          
        setIsSettling(true);
        
        const { chain } = await import('../../services/chain');
        
        // State 1: Signing
        pushTxToast('signing', {
          amount: amountDot,
          currency: 'DOT',
        });

        // Send real DOT transaction (or simulated in simulation mode)
        // Use mock address in simulation mode if no wallet connected
        const fromAddress = isSimulationMode && !account.address0 
          ? '15mock00000000000000000000000000000A' // Mock sender address for simulation
          : account.address0!;
        const result = await chain.sendDot({
          from: fromAddress,
          to: recipientAddress,
          amountDot,
          onStatus: (status, ctx) => {
            if (status === 'submitted') {
              updateTxToast('broadcast', {
                amount: amountDot,
                currency: 'DOT',
              });
            } else if (status === 'inBlock' && ctx?.txHash) {
              updateTxToast('inBlock', {
                amount: amountDot,
                currency: 'DOT',
                txHash: ctx.txHash,
                fee: feeEstimate || 0.0024,
                feeCurrency: 'DOT',
              });
            } else if (status === 'finalized' && ctx?.blockHash) {
              updateTxToast('finalized', {
                amount: amountDot,
                currency: 'DOT',
                txHash: result.txHash,
                fee: feeEstimate || 0.0024,
                feeCurrency: 'DOT',
              });
            }
          },
        });

        // Refresh balance after successful transaction
        try {
          await account.refreshBalance();
        } catch (refreshError) {
          console.error('[SettleHome] Balance refresh failed:', refreshError);
        }

        // Wait a bit for finalization status, then call onConfirm with txHash
        setTimeout(() => {
          setIsSettling(false);
          onConfirm(selectedMethod, result.txHash);
        }, 2000);

        return;
      } catch (error: any) {
        console.error('[SettleHome] DOT transfer error:', error);
        setIsSettling(false);
        
        if (error?.message === 'USER_REJECTED') {
          onShowToast?.('Transaction cancelled', 'info');
        } else if (error?.message?.includes('Insufficient')) {
          onShowToast?.('Insufficient balance for transaction', 'error');
        } else {
          onShowToast?.(`Settlement failed: ${error?.message || 'Unknown error'}`, 'error');
        }
        return;
      }
    }

    // Non-DOT methods: direct confirmation
    let reference: string | undefined;
    if (selectedMethod === "bank") reference = bankReference;
    if (selectedMethod === "paypal") reference = paypalEmail;
    if (selectedMethod === "twint") reference = twintPhone;
    
    onConfirm(selectedMethod, reference);
    }
  };

  // Check if DOT settlement is valid (requires wallet connected AND recipient address)
  // In simulation mode, bypass wallet requirement
  const isDotValid = selectedMethod === "dot" && (isSimulationMode || walletConnected) && !!recipientAddress;
  // Show DOT method whenever Polkadot is enabled (regardless of recipient address or wallet connection)
  // This creates FOMO - users see DOT option even without setup, encouraging them to connect wallet and add addresses
  const showDotMethod = POLKADOT_APP_ENABLED;
  const isDotMethodEnabled = walletConnected && !!recipientAddress; // Actually usable
  const isDotFlowActive = selectedMethod === 'dot';
  // Calculate DOT amount (convert from fiat if needed)
  const getAmountDot = (): number | null => {
    if (totalAmount <= 0) return null;
    if (isDotPot) return Math.abs(totalAmount);
    if (dotPriceUsd && dotPriceUsd > 0) return Math.abs(totalAmount) / dotPriceUsd;
    return null;
  };
  const amountDot = getAmountDot();
  // const amountDotString = amountDot ? amountDot.toFixed(6) : null;
  // const canAffordDotPayment = amountDotString && walletConnected
  //   ? account.canAfford(amountDotString)
  //   : true;
  const showConnectWalletNotice = isDotFlowActive && account.status !== 'connected';
  
  const isValid = 
    selectedMethod === "cash" || 
    // Bank reference is optional
    selectedMethod === "bank" || 
    (selectedMethod === "paypal" && paypalEmail.length > 0) ||
    (selectedMethod === "twint" && twintPhone.length > 0) || 
    isDotValid;

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
              This will record that you {isPaying ? 'paid' : 'received'} {formatAmount(totalAmount)} in cash
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
            className="text-label text-foreground hover:opacity-80 transition-opacity"
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
                  color: isPaying ? 'var(--foreground)' : 'var(--money)'
                }}
              >
                {formatAmount(totalAmount)}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          {settlements.length > 0 && settlements[0]?.pots && settlements[0]?.pots.length > 1 && (
            <div className="pt-2 border-t border-border/50 space-y-1">
              {settlements[0]?.pots?.map(pot => (
                <div key={pot.potId} className="flex justify-between text-caption text-secondary">
                  <span>{pot.potName}</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>{isDotPot ? `${pot.amount.toFixed(6)} DOT` : `$${pot.amount.toFixed(2)}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wallet Banner for DOT - Only show when wallet is connected to display balance */}
        {selectedMethod === "dot" && walletConnected && (
          <WalletBanner />
        )}


        {/* Payment Method Tabs */}
        <div className="space-y-2">
          <label className="text-caption text-secondary">Payment Method</label>
          
          {/* Tab Buttons - 4-5 methods: Cash, Bank, PayPal, TWINT, DOT (conditional) */}
          <div className={`card p-1 grid gap-1 ${POLKADOT_APP_ENABLED && showDotMethod ? 'grid-cols-5' : 'grid-cols-4'}`}>
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
            
            {POLKADOT_APP_ENABLED && showDotMethod && (
              <button
                onClick={() => {
                  if (isDotMethodEnabled) {
                    setSelectedMethod("dot");
                  } else {
                    // Show wallet connection prompt
                    triggerHaptic('light');
                    onShowToast?.('Connect your wallet to pay with DOT', 'info');
                  }
                }}
                disabled={!isDotMethodEnabled}
                className={`px-2 py-2.5 rounded-[var(--r-lg)] transition-all relative ${
                  selectedMethod === "dot"
                    ? 'bg-background shadow-sm'
                    : isDotMethodEnabled
                    ? 'hover:bg-muted/5'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                title={!isDotMethodEnabled ? 'Connect wallet to pay with DOT' : undefined}
              >
                <div className="flex flex-col items-center gap-1">
                  <Wallet className="w-5 h-5" style={{ 
                    color: selectedMethod === "dot" 
                      ? 'var(--foreground)' 
                      : isDotMethodEnabled 
                        ? 'var(--muted)' 
                        : 'var(--muted)'
                  }} />
                  <span className="text-caption" style={{ 
                    color: selectedMethod === "dot" 
                      ? 'var(--foreground)' 
                      : isDotMethodEnabled 
                        ? 'var(--muted)' 
                        : 'var(--muted)',
                    fontWeight: selectedMethod === "dot" ? 500 : 400
                  }}>
                    DOT
                  </span>
                  {!walletConnected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent)] rounded-full border border-background" 
                      title="Connect wallet to unlock" />
                  )}
                </div>
              </button>
            )}
          </div>
          {/* Show FOMO message when wallet not connected (DOT button is visible) */}
          {showDotMethod && !walletConnected && (
            <div className="mt-2 p-2 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
              <p className="text-caption" style={{ color: 'var(--accent)' }}>
                💡 Connect your wallet to pay with DOT — fast, secure, and on-chain
              </p>
            </div>
          )}
          {/* Show message when wallet connected but no recipient address */}
          {showDotMethod && walletConnected && !isDotMethodEnabled && (
            <p className="text-caption text-secondary mt-2">
              Add a wallet address for this person in Members to complete DOT settlement.
            </p>
          )}
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
            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  const amountStr = `$${Math.abs(totalAmount).toFixed(2)}`;
                  const details = `Bank transfer details\nAmount: ${amountStr}\nReference: ${bankReference || '(none)'}\nCounterparty: ${counterparty}`;
                  try {
                    await navigator.clipboard.writeText(details);
                    onShowToast?.('Bank details copied', 'success');
                  } catch (error) {
                    console.warn('[SettleHome] Failed to copy to clipboard:', error);
                    onShowToast?.('Failed to copy', 'error');
                  }
                }}
                className="px-3 py-2 rounded-lg bg-muted/20 text-caption hover:bg-muted/30 transition"
              >
                Copy bank details
              </button>
            </div>
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
            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  const amountStr = `$${Math.abs(totalAmount).toFixed(2)}`;
                  const text = `Pay ${amountStr} to ${counterparty} via PayPal (${paypalEmail || 'email'})`;
                  try {
                    await navigator.clipboard.writeText(text);
                    onShowToast?.('PayPal details copied', 'success');
                  } catch (error) {
                    console.warn('[SettleHome] Failed to copy to clipboard:', error);
                    onShowToast?.('Failed to copy', 'error');
                  }
                }}
                className="px-3 py-2 rounded-lg bg-muted/20 text-caption hover:bg-muted/30 transition"
              >
                Copy email + amount
              </button>
              {paypalEmail && (
                <a
                  href={`mailto:${encodeURIComponent(paypalEmail)}?subject=${encodeURIComponent('Payment via PayPal')}&body=${encodeURIComponent('Amount: $' + Math.abs(totalAmount).toFixed(2))}`}
                  className="px-3 py-2 rounded-lg bg-background border border-border text-caption hover:bg-muted/10 transition"
                >
                  Open mail
                </a>
              )}
            </div>
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
            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  const amountStr = `$${Math.abs(totalAmount).toFixed(2)}`;
                  const text = `TWINT payment: ${amountStr} to ${twintPhone || 'phone'} (${counterparty})`;
                  try {
                    await navigator.clipboard.writeText(text);
                    onShowToast?.('TWINT details copied', 'success');
                  } catch (error) {
                    console.warn('[SettleHome] Failed to copy to clipboard:', error);
                    onShowToast?.('Failed to copy', 'error');
                  }
                }}
                className="px-3 py-2 rounded-lg bg-muted/20 text-caption hover:bg-muted/30 transition"
              >
                Copy phone + amount
              </button>
              {twintPhone && (
                <a
                  href={`sms:${encodeURIComponent(twintPhone)}?&body=${encodeURIComponent('Amount: $' + Math.abs(totalAmount).toFixed(2))}`}
                  className="px-3 py-2 rounded-lg bg-background border border-border text-caption hover:bg-muted/10 transition"
                >
                  Open SMS
                </a>
              )}
            </div>
          </div>
        )}

        {POLKADOT_APP_ENABLED && selectedMethod === "dot" && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
              <p className="text-body font-medium">Polkadot Settlement</p>
            </div>
                    <p className="text-caption text-secondary">
                      {isSimulationMode || walletConnected
                        ? `Send ${formatAmount(totalAmount)} on Polkadot. This will create an on-chain transaction${isSimulationMode ? ' (simulated)' : ''}.`
                        : `Connect your Polkadot wallet to settle on-chain in ${baseCurrency}.`
                      }
                    </p>

            {/* From/To details when wallet connected (or simulation mode) and address available */}
            {(isSimulationMode || walletConnected) && recipientAddress && (
              <div className="pt-3 grid gap-2 text-caption">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">From</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-label truncate max-w-[180px]">
                      {((isSimulationMode && !account.address0) 
                        ? '15mock00000000000000000000000000000A' 
                        : (account.address0 || '')).slice(0, 6)}...{((isSimulationMode && !account.address0) 
                        ? '15mock00000000000000000000000000000A' 
                        : (account.address0 || '')).slice(-6)}
                    </span>
                    <button
                      className="text-micro underline opacity-70 hover:opacity-100"
                      onClick={() => {
                        const addressToCopy = (isSimulationMode && !account.address0) 
                          ? '15mock00000000000000000000000000000A' 
                          : (account.address0 || '');
                        navigator.clipboard.writeText(addressToCopy)
                          .then(() => onShowToast?.('Copied sender address', 'info'))
                          .catch((error) => {
                            console.warn('[SettleHome] Failed to copy address:', error);
                            onShowToast?.('Failed to copy address', 'error');
                          });
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">To</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-label truncate max-w-[180px]">
                      {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-6)}
                    </span>
                    <button
                      className="text-micro underline opacity-70 hover:opacity-100"
                      onClick={() => {
                        navigator.clipboard.writeText(recipientAddress)
                          .then(() => onShowToast?.('Copied recipient address', 'info'))
                          .catch((error) => {
                            console.warn('[SettleHome] Failed to copy address:', error);
                            onShowToast?.('Failed to copy address', 'error');
                          });
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

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

                {/* Network Fee Row - Always show for DOT transactions */}
                {selectedMethod === 'dot' && (
                  <div className="flex justify-between text-caption">
                    <span className="text-muted">Network fee (est.):</span>
                    {feeLoading ? (
                      <span className="tabular-nums text-muted">Calculating...</span>
                    ) : feeEstimate !== null && !feeError ? (
                      <span className="tabular-nums text-muted">{formatDOT(feeEstimate)}</span>
                    ) : (
                      <span className="tabular-nums text-muted">~{formatDOT(0.002)}</span>
                    )}
                  </div>
                )}

                {/* Platform Fee Row (display-only) */}
                {shouldShowPlatformFee() && !feeLoading && (() => {
                  const displayCurrency = baseCurrency as DisplayCurrency;
                  const { pctStr, fee, currency } = computeDisplayPlatformFee(
                    totalAmount,
                    displayCurrency
                  );
                  const suffix = canCollectPlatformFee() ? '' : ' • not charged';
                  
                  // For DOT pots, show DOT + fiat equivalent if available
                  if (currency === 'DOT' && dotPriceUsd && dotPriceUsd > 0) {
                    const fiatEquivalent = fee * dotPriceUsd;
                  return (
                    <div className="flex justify-between text-caption">
                        <span className="text-muted">App fee ({pctStr}%){suffix}</span>
                        <span className="tabular-nums text-muted">
                          {formatFeeWithEquivalent(fee, fiatEquivalent, 'USD')}
                        </span>
                      </div>
                    );
                  }
                  
                  // For fiat pots or when price unavailable, show in pot currency
                  return (
                    <div className="flex justify-between text-caption">
                      <span className="text-muted">App fee ({pctStr}%){suffix}</span>
                      <span className="tabular-nums text-muted">{formatFiat(fee, currency)}</span>
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
                      {isDotFlowActive && !isDotPot && dotPriceUsd && dotPriceUsd > 0 && amountDot ? (
                        // Show both fiat and DOT amounts for fiat pots when DOT method selected
                        <>
                          <p className="text-body font-medium tabular-nums">{formatAmount(totalAmount)}</p>
                          <p className="text-caption text-muted tabular-nums">
                            ≈ {formatDOT(amountDot)} DOT
                          </p>
                        </>
                      ) : (
                        <p className="text-body font-medium tabular-nums">{formatAmount(totalAmount)}</p>
                      )}
                      {selectedMethod === 'dot' && (
                        <p className="text-caption text-muted tabular-nums">
                          + {feeEstimate !== null && !feeError 
                            ? formatDOT(feeEstimate) 
                            : formatDOT(0.002)} (network fee)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOT Method Info - Show when DOT selected but wallet not connected */}
            {isDotFlowActive && !walletConnected && (
              <div className="pt-3 border-t border-border/50">
                <div className="card p-4 space-y-3 bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                  <div className="flex items-start gap-3">
                    <Wallet className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <div className="flex-1 space-y-2">
                      <p className="text-body" style={{ fontWeight: 500 }}>
                        Connect your wallet to pay with DOT
                      </p>
                      <p className="text-caption text-secondary">
                        Pay directly on the Polkadot blockchain — instant, secure, and transparent. Connect your wallet to get started.
                      </p>
                      <button
                        onClick={() => {
                          triggerHaptic('medium');
                          // Trigger wallet connection flow
                          account.connectExtension().catch((error: any) => {
                            console.error('[SettleHome] Failed to connect wallet:', error);
                          });
                        }}
                        className="mt-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-body font-medium hover:opacity-90 transition-opacity active:scale-[0.98]"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warning: No recipient address */}
            {walletConnected && !recipientAddress && isDotFlowActive && (
              <div className="pt-3 border-t border-border/50">
                <div className="p-2 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                  <p className="text-micro text-yellow-700 dark:text-yellow-300">
                    ⚠️ No wallet address on file for {counterparty}. Please add their wallet address in the Members tab to settle via DOT.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="p-4 bg-background border-t border-border">
        {isDotFlowActive && (
          <>
            {showConnectWalletNotice && (
              <div className="mb-3 p-3 rounded-lg border bg-muted/10 space-y-2" style={{ borderColor: 'var(--border)' }}>
                <p className="text-label" style={{ fontWeight: 500 }}>You'll need DOT on Polkadot to settle.</p>
                <PrimaryButton
                  fullWidth
                  onClick={() => {
                    void account.connectExtension().catch((error: any) => {
                      const message = error?.message || 'Failed to connect wallet';
                      onShowToast?.(message, 'error');
                    });
                  }}
                >
                  Connect wallet
                </PrimaryButton>
              </div>
            )}
          </>
        )}
        <div title={selectedMethod === "dot" && !recipientAddress ? "No wallet address on file for this member" : undefined}>
          <PrimaryButton
            fullWidth
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            {selectedMethod === "dot" && !isSimulationMode && !walletConnected 
              ? "Connect Wallet in Header"
              : selectedMethod === "dot" && !recipientAddress
              ? "Add Wallet Address Required"
              : `Confirm ${selectedMethod === "cash" ? "Cash" : selectedMethod === "bank" ? "Bank" : selectedMethod === "paypal" ? "PayPal" : selectedMethod === "twint" ? "TWINT" : "DOT"} Settlement`
            }
          </PrimaryButton>
        </div>
      </div>

      {/* Embedded Hyperbridge Bridge Sheet */}
      <HyperbridgeBridgeSheet
        isOpen={showBridgeSheet}
        onClose={() => setShowBridgeSheet(false)}
        onBridgeComplete={async () => {
          // Refresh balance after bridging completes
          try {
            await account.refreshBalance();
            onShowToast?.('Bridge completed! Balance refreshed.', 'success');
          } catch (refreshError) {
            console.error('[SettleHome] Balance refresh failed after bridge:', refreshError);
            onShowToast?.('Bridge completed! Please refresh balance manually.', 'info');
          }
        }}
        dest="Polkadot"
        asset="DOT"
      />
    </div>
  );
}
