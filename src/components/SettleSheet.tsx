import { X, Check, Clock } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

interface SettleSheetProps {
  personId: string;
  personName: string;
  amount: number;
  preferredMethod?: "Bank" | "PayPal" | "DOT" | "Cash";
  pots: { id: string; name: string; amount: number }[];
  hasPendingAttestations?: boolean;
  onClose: () => void;
  onConfirm: (method: "Bank" | "PayPal" | "DOT" | "Cash") => void;
  onReviewPending: () => void;
  onViewHistory: () => void;
}

export function SettleSheet({
  personId,
  personName,
  amount,
  preferredMethod,
  pots,
  hasPendingAttestations = false,
  onClose,
  onConfirm,
  onReviewPending,
  onViewHistory,
}: SettleSheetProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMethod, setSelectedMethod] = useState<"Bank" | "PayPal" | "DOT" | "Cash" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // All available methods
  const allMethods: Array<"Bank" | "PayPal" | "DOT" | "Cash"> = ["Bank", "PayPal", "DOT", "Cash"];
  const otherMethods = allMethods.filter(m => m !== preferredMethod);

  const handleMethodSelect = (method: "Bank" | "PayPal" | "DOT" | "Cash") => {
    setSelectedMethod(method);
    setShowConfetti(true);
    
    // Brief delay for animation, then move to step 2
    setTimeout(() => {
      setStep(2);
    }, 300);
  };

  const handleDone = () => {
    if (selectedMethod) {
      onConfirm(selectedMethod);
    }
    onClose();
  };

  // Confetti particles
  const confettiParticles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: -(Math.random() * 100 + 50),
    rotation: Math.random() * 360,
    color: i % 3 === 0 ? "var(--accent-pink)" : i % 3 === 1 ? "var(--success)" : "var(--muted)",
  }));

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 280, mass: 0.8 }}
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[390px]"
      >
        <div className="glass-sheet rounded-t-[24px] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg">
                Settle with {personName} — ${amount.toFixed(2)}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {step === 1 ? (
              <div className="space-y-4">
                {/* Pending Attestations Banner */}
                {hasPendingAttestations && (
                  <button
                    onClick={onReviewPending}
                    className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 hover:bg-destructive/20 transition-colors"
                  >
                    <Clock className="w-5 h-5 text-destructive-foreground flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="text-sm text-destructive-foreground">Attestations required</p>
                      <p className="text-xs text-destructive-foreground/70">Review pending expenses first</p>
                    </div>
                  </button>
                )}

                {/* Scope Chip */}
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 bg-muted/60 rounded-full text-xs text-muted-foreground">
                    All pots • {pots.length} item{pots.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Preferred Method (Big Button) */}
                {preferredMethod && !hasPendingAttestations && (
                  <button
                    onClick={() => handleMethodSelect(preferredMethod)}
                    className="w-full p-6 glass-sm rounded-2xl hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] active-ripple border-2 border-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-lg mb-1">Pay with {preferredMethod}</p>
                        <p className="text-sm text-muted-foreground">Preferred method</p>
                      </div>
                      <div className="w-2 h-2 rounded-full accent-dot" />
                    </div>
                  </button>
                )}

                {/* Other Methods (Tiny Text Links) */}
                {!hasPendingAttestations && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>or</span>
                    {otherMethods.map((method, index) => (
                      <span key={method}>
                        <button
                          onClick={() => handleMethodSelect(method)}
                          className="hover:text-foreground transition-colors underline"
                        >
                          {method}
                        </button>
                        {index < otherMethods.length - 1 && <span className="mx-1">•</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Pots Breakdown */}
                <div className="mt-6 pt-4 border-t border-border/30 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Settling across:</p>
                  {pots.map(pot => (
                    <div key={pot.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{pot.name}</span>
                      <span className="tabular-nums">${pot.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4 relative">
                {/* Confetti */}
                {showConfetti && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {confettiParticles.map((particle) => (
                      <motion.div
                        key={particle.id}
                        initial={{
                          x: "50%",
                          y: "20%",
                          opacity: 1,
                          scale: 0,
                          rotate: 0,
                        }}
                        animate={{
                          x: `calc(50% + ${particle.x}px)`,
                          y: `calc(20% + ${particle.y}px)`,
                          opacity: 0,
                          scale: 1,
                          rotate: particle.rotation,
                        }}
                        transition={{
                          duration: 0.8,
                          ease: "easeOut",
                        }}
                        className="absolute w-2 h-2 rounded-sm"
                        style={{ backgroundColor: particle.color }}
                      />
                    ))}
                  </div>
                )}

                {/* Big Checkmark */}
                <div className="flex flex-col items-center gap-4 py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="w-20 h-20 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-10 h-10 text-primary-foreground" strokeWidth={3} />
                  </motion.div>
                  
                  <div className="text-center">
                    <h3 className="text-xl mb-1">Settled ${amount.toFixed(2)}</h3>
                    <p className="text-sm text-muted-foreground">with {personName}</p>
                    {selectedMethod && (
                      <p className="text-xs text-muted-foreground mt-2">via {selectedMethod}</p>
                    )}
                  </div>
                </div>

                {/* Pots Affected */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Pots settled:</p>
                  {pots.map(pot => (
                    <div key={pot.id} className="flex items-center justify-between p-2 glass-sm rounded-lg">
                      <span className="text-sm">{pot.name}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">${pot.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={onViewHistory}
                    className="flex-1 px-4 py-3 glass-sm rounded-xl hover:bg-muted/50 transition-all duration-200 active:scale-[0.98]"
                  >
                    <span className="text-sm">View history</span>
                  </button>
                  <button
                    onClick={handleDone}
                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
                  >
                    <span className="text-sm">Done</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}