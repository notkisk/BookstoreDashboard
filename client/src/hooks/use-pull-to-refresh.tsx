import { useEffect, useState, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullDownThreshold?: number;
  refreshingContent?: React.ReactNode;
  pullingContent?: (pullDistance: number, threshold: number) => React.ReactNode;
}

export function usePullToRefresh({
  onRefresh,
  pullDownThreshold = 80,
  refreshingContent = 'Refreshing...',
  pullingContent = (distance, threshold) => `Pull down to refresh (${Math.round((distance / threshold) * 100)}%)`
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchMoveY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger pull to refresh when at the top of the page
      if (window.scrollY > 5) return;
      
      touchStartY = e.touches[0].clientY;
      startY.current = touchStartY;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      touchMoveY = e.touches[0].clientY;
      const distance = touchMoveY - startY.current;
      
      // Only handle pull down, not up
      if (distance <= 0) {
        setPullDistance(0);
        return;
      }
      
      // Add resistance to the pull (square root function makes it feel more natural)
      const pullDistWithResistance = Math.sqrt(distance) * 5;
      setPullDistance(pullDistWithResistance);
      
      // Prevent default scrolling behavior while pulling
      if (distance > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;
      
      setIsPulling(false);
      
      if (pullDistance >= pullDownThreshold) {
        // Trigger refresh
        setIsRefreshing(true);
        setPullDistance(pullDownThreshold / 2); // Keep some visual indication
        
        try {
          await onRefresh();
          toast({
            title: "Data refreshed",
            description: "Latest information has been loaded",
          });
        } catch (error) {
          toast({
            title: "Refresh failed",
            description: "Could not refresh data. Please try again.",
            variant: "destructive",
          });
        } finally {
          // Reset after refresh completes
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500);
        }
      } else {
        // Not pulled far enough, just reset
        setPullDistance(0);
      }
    };

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    // Remove event listeners on cleanup
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, pullDownThreshold, onRefresh]);

  const refreshIndicatorStyle = {
    height: `${pullDistance}px`,
    transition: isRefreshing ? 'none' : 'height 0.2s ease-out',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    backgroundColor: 'rgba(238, 238, 238, 0.8)',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
  };

  const refreshIndicator = (
    <div style={refreshIndicatorStyle}>
      {isRefreshing 
        ? refreshingContent 
        : pullingContent(pullDistance, pullDownThreshold)
      }
    </div>
  );

  return { containerRef, refreshIndicator, isRefreshing };
}