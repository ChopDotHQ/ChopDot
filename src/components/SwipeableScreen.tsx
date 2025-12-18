import { ReactNode, useRef, useState } from "react";

interface SwipeableScreenProps {
  children: ReactNode;
  onSwipeBack?: () => void;
  canSwipeBack?: boolean;
}

export function SwipeableScreen({
  children,
  onSwipeBack,
  canSwipeBack = true,
}: SwipeableScreenProps) {
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const trackingSwipeRef = useRef(false);
  const swipeOffsetXRef = useRef(0);

  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const SWIPE_THRESHOLD = 100; // px to trigger navigation
  const EDGE_ZONE = 28; // px from left edge to start tracking
  const SWIPE_ACTIVATION_DELTA = 12; // px before we treat it as a swipe (prevents blocking taps)
  const VERTICAL_CANCEL_DELTA = 14; // px vertical movement cancels swipe tracking

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipeBack || !onSwipeBack) return;
    
    const touch = e.touches[0];
    // Only start if touch begins near the left edge
    if (touch && touch.clientX <= EDGE_ZONE) {
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      trackingSwipeRef.current = true;
      swipeOffsetXRef.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!trackingSwipeRef.current) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    if (startX === null || startY === null) return;

    const diffX = touch.clientX - startX;
    const diffY = touch.clientY - startY;

    // If the user is scrolling vertically, cancel swipe tracking so taps still work.
    if (!isSwiping && Math.abs(diffY) > VERTICAL_CANCEL_DELTA && Math.abs(diffY) > Math.abs(diffX)) {
      trackingSwipeRef.current = false;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      swipeOffsetXRef.current = 0;
      setSwipeOffsetX(0);
      return;
    }
    
    // Only allow rightward swipes
    if (diffX > 0) {
      // Don't enter "swiping" state until the user has moved enough to indicate intent.
      if (!isSwiping) {
        if (diffX < SWIPE_ACTIVATION_DELTA) return;
        setIsSwiping(true);
      }
      swipeOffsetXRef.current = diffX;
      setSwipeOffsetX(diffX);
    }
  };

  const handleTouchEnd = () => {
    const diff = swipeOffsetXRef.current;

    if (isSwiping && diff > SWIPE_THRESHOLD && onSwipeBack) {
      onSwipeBack();
    }

    setIsSwiping(false);
    setSwipeOffsetX(0);
    swipeOffsetXRef.current = 0;
    trackingSwipeRef.current = false;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Calculate transform and opacity based on swipe progress
  const getSwipeStyles = () => {
    if (!isSwiping) {
      return {};
    }

    const progress = Math.min(swipeOffsetX / SWIPE_THRESHOLD, 1);

    return {
      transform: `translateX(${swipeOffsetX}px)`,
      transition: "none",
      opacity: 1 - progress * 0.3,
    };
  };

  // Show previous screen shadow effect
  const getBackgroundStyles = () => {
    if (!isSwiping) {
      return { opacity: 0 };
    }

    const progress = Math.min(swipeOffsetX / SWIPE_THRESHOLD, 1);

    return {
      opacity: progress * 0.3,
      pointerEvents: "none" as const,
    };
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Background overlay that appears during swipe */}
      {isSwiping && (
        <div
          className="absolute inset-0 bg-black z-0"
          style={getBackgroundStyles()}
        />
      )}
      
      {/* Main content */}
      <div
        className="h-full relative"
        style={getSwipeStyles()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
