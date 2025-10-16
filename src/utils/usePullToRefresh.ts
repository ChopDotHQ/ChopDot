import { useEffect, useRef, useState } from 'react';
import { triggerHaptic } from './haptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldTrigger, setShouldTrigger] = useState(false);
  
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    let isTouching = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull-to-refresh when scrolled to top
      if (container.scrollTop === 0) {
        const t = e.touches[0];
        if (!t) return;
        touchStartY.current = t.clientY;
        isTouching = true;
        hasTriggeredHaptic.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching || isRefreshing) return;
      if (container.scrollTop > 0) {
        isTouching = false;
        setPullDistance(0);
        return;
      }

      const t = e.touches[0];
      if (!t) return;
      const currentY = t.clientY;
      const diff = currentY - touchStartY.current;

      if (diff > 0) {
        // Prevent default scroll behavior when pulling down
        e.preventDefault();
        
        // Apply diminishing returns for smoother feel
        const distance = Math.min(diff * 0.5, maxPullDistance);
        setPullDistance(distance);

        // Trigger haptic feedback when threshold is reached
        if (distance >= threshold && !hasTriggeredHaptic.current) {
          triggerHaptic('light');
          hasTriggeredHaptic.current = true;
        }

        setShouldTrigger(distance >= threshold);
      }
    };

    const handleTouchEnd = async () => {
      if (!isTouching) return;
      isTouching = false;

      if (shouldTrigger && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic('success');
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setShouldTrigger(false);
        }
      } else {
        setPullDistance(0);
        setShouldTrigger(false);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, isRefreshing, shouldTrigger, onRefresh, threshold, maxPullDistance]);

  return {
    scrollContainerRef,
    pullDistance,
    isRefreshing,
    shouldTrigger,
  };
}
