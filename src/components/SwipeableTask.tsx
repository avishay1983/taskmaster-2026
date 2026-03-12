import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeableTaskProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

export function SwipeableTask({ children, onDelete, className = '' }: SwipeableTaskProps) {
  const isMobile = useIsMobile();
  const x = useMotionValue(0);
  const [swiping, setSwiping] = useState(false);
  const deleteThreshold = -100;

  // Background opacity based on swipe distance
  const bgOpacity = useTransform(x, [-150, -60, 0], [1, 0.6, 0]);
  const iconScale = useTransform(x, [-150, -80, 0], [1.2, 1, 0.5]);

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    setSwiping(false);
    if (info.offset.x < deleteThreshold) {
      onDelete();
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Delete background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end px-6 bg-destructive rounded-xl"
        style={{ opacity: bgOpacity }}
      >
        <motion.div style={{ scale: iconScale }}>
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -150, right: 0 }}
        dragElastic={0.1}
        onDragStart={() => setSwiping(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-background rounded-xl touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
