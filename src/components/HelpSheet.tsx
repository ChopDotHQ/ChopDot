/**
 * HELP SHEET
 * 
 * Simple FAQ accordion for ChopDot help content.
 * Accessible from You tab - non-intrusive onboarding.
 * 
 * Design: Clean iOS-style accordion with minimal animations.
 */

import { X, ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { triggerHaptic } from "../utils/haptics";
import { usePSAStyle } from "../utils/usePSAStyle";

interface HelpSheetProps {
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is ChopDot?",
    answer: "ChopDot helps you split expenses with friends and save money together. All expenses are confirmed by group members for transparency, and you can settle up using cash, bank transfer, or DOT tokens.",
  },
  {
    question: "What are pots?",
    answer: "Pots are groups for managing shared expenses or savings. Create an expense pot for splitting costs (like roommates or trips), or a savings pot to pool money together and earn yield through DeFi.",
  },
  {
    question: "How do I add an expense?",
    answer: "Tap the orange + button at the bottom of the screen. Select the pot, enter the amount and description, choose who paid, and how to split it. The expense will show up for everyone in the pot to confirm.",
  },
  {
    question: "What are attestations?",
    answer: "When someone adds an expense, other pot members should confirm (attest) that it happened. This builds trust and prevents disputes. You'll see pending expenses in your Activity tab - just tap to confirm.",
  },
  {
    question: "What are checkpoints?",
    answer: "Before settling up, the group confirms all expenses have been entered correctly. This is a quick check to make sure nothing was forgotten. Once everyone confirms, you can settle.",
  },
  {
    question: "How do I settle up?",
    answer: "Open a pot and tap 'Settle Up'. Choose the checkpoint option if needed, then select who you're settling with. You can pay via cash (just mark it as paid), bank transfer, or DOT wallet for on-chain settlement.",
  },
  {
    question: "What is DOT?",
    answer: "DOT is the native token of the Polkadot blockchain. You can connect a Polkadot wallet to settle expenses on-chain - this creates a permanent, verifiable record of payment. It's optional - you can use cash or bank transfer instead.",
  },
  {
    question: "How do savings pots work?",
    answer: "Savings pots let you pool money with others and earn yield through DeFi protocols like Acala. Add contributions, watch your balance grow with interest, and withdraw anytime. Perfect for group savings goals.",
  },
  {
    question: "Can I use ChopDot without crypto?",
    answer: "Absolutely! ChopDot works great with just cash and bank transfers. The blockchain features (DOT settlements, on-chain receipts, DeFi savings) are optional extras for users who want them.",
  },
  {
    question: "How do I invite someone to a pot?",
    answer: "Open a pot, tap the members section, then tap 'Add Member'. You can invite by name/email, scan their QR code, or share your own QR code for them to scan.",
  },
  {
    question: "What fees does ChopDot charge?",
    answer: "ChopDot is free to use. When settling expenses, you may see two types of fees. Network Fee (DOT transactions only): A small fee paid to the Polkadot network to process your transaction, typically 0.001–0.005 DOT (about $0.01–$0.04). This fee goes to the network, not to ChopDot. Platform Fee (display only): Currently shown for transparency but not charged. If enabled, it would be 0.20% of the settlement amount. You'll see 'not charged' next to it in the settlement screen. This may change in future versions, but we'll always be transparent about it. Cash and bank transfers have no fees at all — completely free. All fees are clearly shown before you confirm any payment, so there are no surprises.",
  },
];

export function HelpSheet({ onClose }: HelpSheetProps) {
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    triggerHaptic('light');
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
        <div
          className={isPSA ? `${psaClasses.panel} rounded-t-[24px] max-h-[85vh] flex flex-col` : "bg-card rounded-t-[24px] max-h-[85vh] flex flex-col"}
          style={isPSA ? psaStyles.panel : {
            boxShadow: 'var(--shadow-elev)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-pink-soft flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-accent-pink" />
              </div>
              <h2 className="text-section">Help & Support</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
            >
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className={isPSA ? `${psaClasses.card} overflow-hidden` : 'card overflow-hidden'}
                  style={isPSA ? psaStyles.card : undefined}
                >
                  {/* Question */}
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full flex items-center justify-between p-4 text-left active:bg-secondary/30 transition-colors"
                  >
                    <span className="text-body pr-4">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-muted flex-shrink-0 transition-transform duration-200 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Answer */}
                  {openIndex === index && (
                    <div className="px-4 pb-4 pt-0 animate-slideDown">
                      <p className="text-body text-secondary leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Note */}
            <div className="px-4 pb-6 pt-2">
              <div 
                className={isPSA ? `${psaClasses.card} p-4 border border-accent-pink/10` : 'card p-4 bg-accent-pink-soft border border-accent-pink/10'}
                style={isPSA ? { ...psaStyles.card, background: 'var(--accent-pink-soft)' } : undefined}
              >
                <p className="text-sm text-secondary text-center">
                  Need more help? Reach out to{" "}
                  <span className="text-accent-pink">support@chopdot.app</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
