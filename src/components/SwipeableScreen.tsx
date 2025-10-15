import { ReactNode, useRef, useState, useEffect } from "react";

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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100; // px to trigger navigation
  const EDGE_ZONE = 40; // px from left edge to start swipe

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipeBack || !onSwipeBack) return;
    
    const touch = e.touches[0];
    // Only start if touch begins near the left edge
    if (touch.clientX <= EDGE_ZONE) {
      setTouchStart(touch.clientX);
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || touchStart === null) return;
    
    const touch = e.touches[0];
    const diff = touch.clientX - touchStart;
    
    // Only allow rightward swipes
    if (diff > 0) {
      setTouchCurrent(touch.clientX);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping || touchStart === null) {
      setIsSwiping(false);
      setTouchStart(null);
      setTouchCurrent(null);
      return;
    }

    const diff = touchCurrent ? touchCurrent - touchStart : 0;

    if (diff > SWIPE_THRESHOLD && onSwipeBack) {
      onSwipeBack();
    }

    setIsSwiping(false);
    setTouchStart(null);
    setTouchCurrent(null);
  };

  // Calculate transform and opacity based on swipe progress
  const getSwipeStyles = () => {
    if (!isSwiping || touchStart === null || touchCurrent === null) {
      return {};
    }

    const diff = touchCurrent - touchStart;
    const progress = Math.min(diff / SWIPE_THRESHOLD, 1);

    return {
      transform: `translateX(${diff}px)`,
      transition: "none",
      opacity: 1 - progress * 0.3,
    };
  };

  // Show previous screen shadow effect
  const getBackgroundStyles = () => {
    if (!isSwiping || touchStart === null || touchCurrent === null) {
      return { opacity: 0 };
    }

    const diff = touchCurrent - touchStart;
    const progress = Math.min(diff / SWIPE_THRESHOLD, 1);

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
        ref={containerRef}
        className="h-full relative z-10"
        style={getSwipeStyles()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
