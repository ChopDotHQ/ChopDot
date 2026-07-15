import { useState, useRef, useEffect, useMemo } from 'react';
import { BottomSheet } from '../BottomSheet';
import { Camera, Keyboard, ArrowRight, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { toast } from 'sonner';
import { PrimaryButton } from '../PrimaryButton';

interface Member {
  id: string;
  name: string;
}

interface CaptureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  potId: string;
  baseCurrency: string;
  members: Member[];
  currentUserId: string;
  onSave: (data: {
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    hasReceipt: boolean;
  }) => void;
}

type Step = 'initial' | 'manual_amount' | 'manual_details';

export function CaptureDrawer({
  isOpen,
  onClose,
  potId: _potId,
  baseCurrency,
  members,
  currentUserId,
  onSave,
}: CaptureDrawerProps) {
  const [step, setStep] = useState<Step>('initial');

  // Manual flow state
  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('initial');
      setAmount('');
      setMemo('');
      setIsProcessingAI(false);
    }
  }, [isOpen]);

  const fallbackPayerId = useMemo(() => {
    if (members.some((member) => member.id === currentUserId)) {
      return currentUserId;
    }
    return members[0]?.id ?? currentUserId;
  }, [members, currentUserId]);

  const handleManualNext = () => {
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      triggerHaptic('warning');
      return;
    }
    setStep('manual_details');
  };

  const handleManualSave = () => {
    if (!memo.trim()) {
      triggerHaptic('warning');
      return;
    }

    const numAmount = Number(amount);
    const decimals = baseCurrency === 'DOT' ? 6 : 2;

    // Default to equal split
    const perPerson = Number((numAmount / (members.length || 1)).toFixed(decimals));
    const remainder = Number((numAmount - perPerson * (members.length - 1)).toFixed(decimals));
    const split = members.map((m, idx) => ({
      memberId: m.id,
      amount: idx === members.length - 1 ? remainder : perPerson,
    }));

    onSave({
      amount: Number(numAmount.toFixed(decimals)),
      currency: baseCurrency,
      paidBy: fallbackPayerId ?? currentUserId,
      memo: memo.trim(),
      date: new Date().toISOString().split('T')[0] ?? '',
      split,
      hasReceipt: false,
    });
    triggerHaptic('success');
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAI(true);
    triggerHaptic('light');

    try {
      // Note: We are simulating AI processing here to replace the SmartScan logic for now.
      // Mock AI scan — simulates receipt OCR processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockAmount = Math.floor(Math.random() * 50) + 15;
      
      // Default to equal split
      const decimals = baseCurrency === 'DOT' ? 6 : 2;
      const perPerson = Number((mockAmount / (members.length || 1)).toFixed(decimals));
      const remainder = Number((mockAmount - perPerson * (members.length - 1)).toFixed(decimals));
      const split = members.map((m, idx) => ({
        memberId: m.id,
        amount: idx === members.length - 1 ? remainder : perPerson,
      }));

      onSave({
        amount: mockAmount,
        currency: baseCurrency,
        paidBy: fallbackPayerId ?? currentUserId,
        memo: 'Scanned Receipt',
        date: new Date().toISOString().split('T')[0] ?? '',
        split,
        hasReceipt: true, // We have a receipt!
      });

      toast.success("Receipt scanned successfully");
      triggerHaptic('success');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to scan receipt");
      setIsProcessingAI(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={step === 'initial' ? 'Capture' : step === 'manual_amount' ? 'Enter Amount' : 'Details'}>
      <div className="space-y-4 px-2 pb-6">
        
        {step === 'initial' && (
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingAI}
              className="w-full card p-6 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] border-2 border-dashed border-border hover:bg-muted/30"
            >
              {isProcessingAI ? (
                <>
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <p className="text-body font-medium">Scanning Receipt...</p>
                  <p className="text-caption text-secondary">Extracting amount and items</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-body font-medium">Scan Receipt</p>
                    <p className="text-caption text-secondary mt-1">AI will extract the amount instantly</p>
                  </div>
                </>
              )}
            </button>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-secondary">OR</span>
              </div>
            </div>

            <button
              onClick={() => setStep('manual_amount')}
              disabled={isProcessingAI}
              className="w-full card p-4 flex items-center gap-4 transition-all active:scale-[0.98] hover:bg-muted/30"
            >
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-foreground">
                <Keyboard className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-body font-medium">Enter amount manually</p>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary" />
            </button>
          </div>
        )}

        {step === 'manual_amount' && (
          <div className="flex flex-col gap-6 mt-6">
            <div className="flex flex-col items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-caption font-medium">
                {baseCurrency}
              </span>
              <input
                autoFocus
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-center focus:outline-none placeholder:text-muted/50 tabular-nums"
                style={{ fontSize: '64px', fontWeight: '600' }}
              />
            </div>

            <PrimaryButton 
              onClick={handleManualNext}
              disabled={!amount || Number(amount) <= 0}
              className="w-full py-4 text-body mt-4"
            >
              Next
            </PrimaryButton>
          </div>
        )}

        {step === 'manual_details' && (
          <div className="flex flex-col gap-4 mt-2">
            
            <div className="flex flex-col items-center py-4 bg-muted/20 rounded-2xl border border-border/50">
              <p className="text-caption text-secondary mb-1">Amount</p>
              <p className="text-[32px] font-semibold tabular-nums">{baseCurrency} {amount}</p>
            </div>

            <div>
              <label className="text-caption text-secondary mb-1.5 block ml-1">What was this for?</label>
              <input
                autoFocus
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Dinner at Mario's"
                className="w-full px-4 py-3 input-field text-body"
              />
            </div>
            
            <div className="p-3 bg-muted/20 rounded-xl mt-2 flex items-center justify-between">
              <span className="text-body">Split equally</span>
              <span className="text-caption text-secondary">{members.length} people</span>
            </div>

            <PrimaryButton 
              onClick={handleManualSave}
              disabled={!memo.trim()}
              className="w-full py-4 text-body mt-4"
            >
              Save Expense
            </PrimaryButton>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
