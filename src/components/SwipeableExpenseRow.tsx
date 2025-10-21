import { useRef, useState, useEffect } from 'react';
import { Trash2, Check, Receipt } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[];
  hasReceipt: boolean;
  receiptUrl?: string;
}

interface SwipeableExpenseRowProps {
  expense: Expense;
  members: Member[];
  currentUserId: string;
  onClick: () => void;
  onDelete?: () => void;
  onAttest?: () => void;
  showApproveButton?: boolean;
}

export function SwipeableExpenseRow({
  expense,
  members,
  currentUserId,
  onClick,
  onDelete,
  onAttest,
  showApproveButton = false,
}: SwipeableExpenseRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [actionTriggered, setActionTriggered] = useState(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const hasTriggeredHaptic = useRef(false);

  const paidByMember = members.find(m => m.id === expense.paidBy);
  const yourShare = expense.split.find(s => s.memberId === currentUserId)?.amount || 0;
  const youPaid = expense.paidBy === currentUserId ? expense.amount : 0;
  const yourNetBalance = youPaid - yourShare; // Positive = you're owed, Negative = you owe
  // Only need attestation if: (1) you didn't pay, AND (2) you haven't confirmed yet
  const needsAttestation = expense.paidBy !== currentUserId && !expense.attestations.includes(currentUserId);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE_LEFT = -100;
  const MAX_SWIPE_RIGHT = 100;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX.current = t.clientX;
      currentX.current = t.clientX;
      setIsSwiping(true);
      hasTriggeredHaptic.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return;
      const t = e.touches[0];
      if (!t) return;
      currentX.current = t.clientX;
      const diff = currentX.current - startX.current;
      
      // Apply resistance
      let offset = diff * 0.6;
      
      // Clamp the offset
      if (needsAttestation && onAttest) {
        // Allow swipe right for attestation
        offset = Math.min(Math.max(offset, MAX_SWIPE_LEFT), MAX_SWIPE_RIGHT);
      } else {
        // Only allow swipe left for delete
        offset = Math.min(Math.max(offset, MAX_SWIPE_LEFT), 0);
      }
      
      setSwipeOffset(offset);

      // Trigger haptic when threshold reached
      if (Math.abs(offset) >= SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
        triggerHaptic('light');
        hasTriggeredHaptic.current = true;
      }
    };

    const handleTouchEnd = () => {
      setIsSwiping(false);

      // Check if action should be triggered
      if (swipeOffset <= -SWIPE_THRESHOLD && onDelete) {
        // Delete action
        triggerHaptic('warning');
        setActionTriggered(true);
        setTimeout(() => {
          onDelete();
        }, 200);
      } else if (swipeOffset >= SWIPE_THRESHOLD && needsAttestation && onAttest) {
        // Attest action
        triggerHaptic('success');
        setActionTriggered(true);
        setTimeout(() => {
          onAttest();
          setSwipeOffset(0);
          setActionTriggered(false);
        }, 200);
      } else {
        // Reset
        setSwipeOffset(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isSwiping, swipeOffset, needsAttestation, onDelete, onAttest]);

  const deleteOpacity = Math.min(Math.abs(swipeOffset) / SWIPE_THRESHOLD, 1);
  const attestOpacity = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden list-row border border-border group"
    >
      {/* Accent rail (shows on hover/focus) */}
      <div 
        className="absolute inset-y-0 left-0 w-1 rounded-r-lg opacity-0 transition-opacity pointer-events-none group-hover:opacity-100"
        style={{ background: 'var(--accent-pink)', opacity: isFocused ? 1 : undefined }}
      />
      {/* Left action (Delete) */}
      {onDelete && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive rounded-lg"
          style={{
            opacity: deleteOpacity,
            pointerEvents: 'none',
          }}
        >
          <Trash2 className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Right action (Confirm/Attest) */}
      {needsAttestation && onAttest && (
        <div 
          className="absolute inset-y-0 left-0 flex items-center justify-start px-4 rounded-lg"
          style={{
            background: 'var(--accent-pink)',
            opacity: attestOpacity,
            pointerEvents: 'none',
          }}
        >
          <Check className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Main content */}
      <div
        className="w-full p-3 text-left transition-all duration-200 active:scale-[0.98] relative z-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!showApproveButton) onClick();
          }
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 200ms ease-out',
          opacity: actionTriggered ? 0.5 : 1,
        }}
      >
        <div 
          className="flex items-start justify-between gap-2"
          onClick={showApproveButton ? undefined : onClick}
        >
          <div 
            className="flex-1 min-w-0"
            onClick={showApproveButton ? onClick : undefined}
          >
            {/* Amount + Receipt indicator inline */}
            <div className="flex items-center gap-1.5 mb-0.5">
              {/* Status dot - pink if approved by you, gray if pending */}
              <div 
                className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                style={{ 
                  background: needsAttestation ? 'var(--muted)' : 'var(--accent-pink)' 
                }} 
              />
              <p className="text-sm tabular-nums">
                {expense.currency} {expense.amount.toFixed(2)}
              </p>
              {expense.hasReceipt && (
                <Receipt className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            
            {/* Memo - only show if exists */}
            {expense.memo && (
              <p className="text-xs text-foreground truncate mb-0.5">
                {expense.memo}
              </p>
            )}
            
            {/* Date + Paid by on one line */}
            <p className="text-xs text-muted-foreground">
              {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {paidByMember?.name}
            </p>
          </div>
          
          {/* Your share OR Approve button */}
          {showApproveButton && onAttest ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAttest();
              }}
              style={{ background: 'var(--accent-pink)' }}
              className="px-3 py-1.5 hover:opacity-90 text-white text-xs rounded-lg transition-all flex-shrink-0"
            >
              Approve
            </button>
          ) : (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground">You</p>
              <p 
                className="text-xs tabular-nums mt-0.5"
                style={{
                  color: yourNetBalance > 0 ? 'var(--success)' : undefined
                }}
              >
                {yourNetBalance > 0 ? '+' : ''}{yourNetBalance.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}