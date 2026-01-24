import { useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { Link } from 'react-router-dom';
import { Target, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CycleProgressBannerProps {
  className?: string;
  compact?: boolean;
}

export function CycleProgressBanner({ className, compact = false }: CycleProgressBannerProps) {
  const { data: cycle, isLoading } = useActiveCycle();

  const stats = useMemo(() => {
    if (!cycle?.start_date || !cycle?.end_date) return null;

    const start = new Date(cycle.start_date);
    const end = new Date(cycle.end_date);
    const today = new Date();

    const totalDays = differenceInDays(end, start);
    const daysElapsed = Math.max(0, differenceInDays(today, start));
    const daysRemaining = Math.max(0, differenceInDays(end, today));
    const progress = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 0;
    const currentWeek = Math.ceil((daysElapsed + 1) / 7);
    const totalWeeks = Math.ceil(totalDays / 7);

    return {
      progress,
      daysElapsed,
      daysRemaining,
      totalDays,
      currentDay: Math.min(daysElapsed + 1, totalDays),
      currentWeek,
      totalWeeks,
      startFormatted: format(start, 'MMM d'),
      endFormatted: format(end, 'MMM d'),
      isComplete: daysRemaining <= 0,
    };
  }, [cycle]);

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!cycle || !stats) {
    return (
      <Link 
        to="/cycle-setup"
        className={cn(
          "block rounded-lg border border-dashed bg-muted/30 p-4 hover:bg-muted/50 transition-colors",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Start Your 90-Day Cycle</p>
              <p className="text-sm text-muted-foreground">Set your goal and track your progress</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  if (compact) {
    return (
      <div className={cn("rounded-lg border bg-card p-3", className)}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Day {stats.currentDay} of {stats.totalDays}
              </span>
              <span className="text-xs font-semibold text-primary">
                {Math.round(stats.progress)}%
              </span>
            </div>
            <Progress value={stats.progress} className="h-2" />
          </div>
          <Link 
            to="/cycles"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4 md:p-5",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm md:text-base">90-Day Cycle Progress</h3>
            {cycle.goal && (
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
                {cycle.goal}
              </p>
            )}
          </div>
        </div>
        <Link 
          to="/cycles"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Details <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{stats.startFormatted}</span>
          <span className="font-medium text-foreground">
            Week {stats.currentWeek} of {stats.totalWeeks}
          </span>
          <span>{stats.endFormatted}</span>
        </div>
        <div className="relative">
          <Progress value={stats.progress} className="h-3 rounded-full" />
          {/* Progress marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-sm transition-all"
            style={{ left: `calc(${stats.progress}% - 8px)` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="text-center p-2 rounded-lg bg-background/60">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
            <Calendar className="h-3 w-3" />
          </div>
          <p className="text-lg md:text-xl font-bold text-foreground">
            {stats.currentDay}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Day</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-background/60">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
            <TrendingUp className="h-3 w-3" />
          </div>
          <p className="text-lg md:text-xl font-bold text-primary">
            {Math.round(stats.progress)}%
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Complete</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-background/60">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
            <Target className="h-3 w-3" />
          </div>
          <p className="text-lg md:text-xl font-bold text-foreground">
            {stats.daysRemaining}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Days Left</p>
        </div>
      </div>

      {/* Completion state */}
      {stats.isComplete && (
        <div className="mt-3 text-center py-2 px-3 rounded-lg bg-primary/10 text-primary text-sm font-medium">
          🎉 Cycle Complete! Time to review and plan your next 90 days.
        </div>
      )}
    </div>
  );
}
