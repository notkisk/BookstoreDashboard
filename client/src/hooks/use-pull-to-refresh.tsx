import { useEffect, useState, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, RefreshCw } from 'lucide-react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullDownThreshold?: number;
}

export function usePullToRefresh({
  onRefresh,
  pullDownThreshold = 80
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

  // Calculate progress percentage
  const progress = Math.min(100, Math.round((pullDistance / pullDownThreshold) * 100));
  
  // Determine if arrow should rotate based on progress
  const arrowRotation = progress >= 100 ? 'rotate-180' : '';

  const refreshIndicator = (
    <div 
      className="pull-refresh-indicator"
      style={{ 
        height: `${pullDistance}px`,
        opacity: pullDistance > 0 ? 1 : 0
      }}
    >
      <div className="pull-refresh-content">
        {isRefreshing ? (
          <>
            <RefreshCw className="pull-refresh-spinner" />
            <span className="pull-refresh-text">Refreshing data...</span>
          </>
        ) : (
          <>
            <ChevronDown className={`pull-refresh-arrow ${arrowRotation}`} />
            <span className="pull-refresh-text">
              {progress >= 100 ? 'Release to refresh' : `Pull down to refresh (${progress}%)`}
            </span>
          </>
        )}
      </div>
    </div>
  );

  return { containerRef, refreshIndicator, isRefreshing };
}