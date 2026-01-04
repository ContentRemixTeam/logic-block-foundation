import { useEffect, useState } from 'react';
import { isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface CurrentTimeIndicatorProps {
  selectedDate: Date;
  startHour: number;
  hourHeight: number;
  className?: string;
}

export function CurrentTimeIndicator({
  selectedDate,
  startHour,
  hourHeight,
  className,
}: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (!isToday(selectedDate)) {
        setPosition(null);
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (currentHour < startHour || currentHour > 22) {
        setPosition(null);
        return;
      }

      // Calculate position based on hours since start
      const hoursSinceStart = currentHour - startHour;
      const minuteOffset = currentMinute / 60;
      const totalOffset = (hoursSinceStart + minuteOffset) * hourHeight;

      setPosition(totalOffset);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [selectedDate, startHour, hourHeight]);

  if (position === null) return null;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-20 pointer-events-none",
        className
      )}
      style={{ top: `${position}px` }}
    >
      <div className="relative w-full h-0.5 bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)]">
        {/* Circle indicator */}
        <div className="absolute -left-1.5 -top-1.5 w-4 h-4 bg-destructive rounded-full shadow-lg" />
      </div>
    </div>
  );
}
