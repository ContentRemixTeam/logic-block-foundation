import { useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface CycleTimelineProps {
  startDate: string;
  endDate: string;
  className?: string;
}

export function CycleTimeline({ startDate, endDate, className = '' }: CycleTimelineProps) {
  const { progress, daysElapsed, totalDays, daysRemaining } = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    const totalDays = differenceInDays(end, start);
    const daysElapsed = Math.max(0, differenceInDays(today, start));
    const daysRemaining = Math.max(0, differenceInDays(end, today));
    const progress = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 0;
    
    return { progress, daysElapsed, totalDays, daysRemaining };
  }, [startDate, endDate]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{format(new Date(startDate), 'MMM d')}</span>
        <span className="font-medium text-foreground">
          Day {Math.min(daysElapsed + 1, totalDays)} of {totalDays}
        </span>
        <span>{format(new Date(endDate), 'MMM d')}</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="text-center text-xs text-muted-foreground">
        {daysRemaining > 0 ? (
          <span>{daysRemaining} days remaining</span>
        ) : (
          <span className="text-primary font-medium">Cycle complete!</span>
        )}
      </div>
    </div>
  );
}
