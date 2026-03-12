import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const [refreshing, setRefreshing] = useState(false);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const indicatorOpacity = useTransform(y, [0, 40, 80], [0, 0.5, 1]);
  const indicatorScale = useTransform(y, [0, 40, 80], [0.5, 0.8, 1]);
  const indicatorRotate = useTransform(y, [0, 80, 150], [0, 180, 360]);

  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    if (info.offset.y > 80 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      // Small delay so user sees the spinner
      await new Promise((r) => setTimeout(r, 600));
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ opacity: indicatorOpacity }}
      >
        <motion.div
          className="mt-2 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 backdrop-blur-sm"
          style={{ scale: indicatorScale }}
        >
          <motion.div
            style={{ rotate: indicatorRotate }}
            animate={refreshing ? { rotate: 360 } : {}}
            transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
          >
            <RefreshCw className="h-4 w-4 text-primary" />
          </motion.div>
          <span className="text-xs font-medium text-primary">
            {refreshing ? 'מרענן...' : 'שחרר לרענון'}
          </span>
        </motion.div>
      </motion.div>

      {/* Draggable content */}
      <motion.div
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 150 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="touch-pan-x"
      >
        {children}
      </motion.div>
    </div>
  );
}
