// LaunchTimelineBar - Compact timeline bar for dashboard showing current phase
// Used in LaunchZone to show launch progress at a glance

import { useMemo } from 'react';
import { format, parseISO, differenceInDays, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { ActiveLaunch } from '@/hooks/useActiveLaunches';

interface LaunchTimelineBarProps {
  launch: ActiveLaunch;
  className?: string;
}

interface PhaseSegment {
  key: string;
  label: string;
  color: string;
  startPercent: number;
  widthPercent: number;
  isCurrent: boolean;
  isPast: boolean;
}

export function LaunchTimelineBar({ launch, className }: LaunchTimelineBarProps) {
  const today = new Date();

  const segments = useMemo((): PhaseSegment[] => {
    const cartOpens = parseISO(launch.cart_opens);
    const cartCloses = parseISO(launch.cart_closes);
    
    // Build phase intervals with fallbacks
    const runwayStart = launch.runway_start_date ? parseISO(launch.runway_start_date) : null;
    const runwayEnd = launch.runway_end_date ? parseISO(launch.runway_end_date) : null;
    const preLaunchStart = launch.pre_launch_start_date ? parseISO(launch.pre_launch_start_date) : runwayEnd;
    const preLaunchEnd = launch.pre_launch_end_date ? parseISO(launch.pre_launch_end_date) : cartOpens;
    const postLaunchEnd = launch.post_launch_end_date ? parseISO(launch.post_launch_end_date) : null;

    // Calculate overall timeline bounds
    const overallStart = runwayStart || preLaunchStart || cartOpens;
    const overallEnd = postLaunchEnd || cartCloses;
    const totalDays = Math.max(1, differenceInDays(overallEnd, overallStart) + 1);

    const result: PhaseSegment[] = [];

    // Runway phase
    if (runwayStart && runwayEnd) {
      const days = differenceInDays(runwayEnd, runwayStart) + 1;
      const startOffset = differenceInDays(runwayStart, overallStart);
      result.push({
        key: 'runway',
        label: 'Runway',
        color: 'bg-slate-500',
        startPercent: (startOffset / totalDays) * 100,
        widthPercent: (days / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: runwayStart, end: runwayEnd }),
        isPast: isAfter(today, runwayEnd),
      });
    }

    // Pre-launch phase
    if (preLaunchStart && preLaunchEnd) {
      const days = differenceInDays(preLaunchEnd, preLaunchStart) + 1;
      const startOffset = differenceInDays(preLaunchStart, overallStart);
      result.push({
        key: 'pre-launch',
        label: 'Pre-Launch',
        color: 'bg-amber-500',
        startPercent: (startOffset / totalDays) * 100,
        widthPercent: (days / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: preLaunchStart, end: preLaunchEnd }),
        isPast: isAfter(today, preLaunchEnd),
      });
    }

    // Cart open phase
    {
      const days = differenceInDays(cartCloses, cartOpens) + 1;
      const startOffset = differenceInDays(cartOpens, overallStart);
      result.push({
        key: 'cart-open',
        label: 'Cart Open',
        color: 'bg-green-500',
        startPercent: (startOffset / totalDays) * 100,
        widthPercent: (days / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: cartOpens, end: cartCloses }),
        isPast: isAfter(today, cartCloses),
      });
    }

    // Post-launch phase
    if (postLaunchEnd) {
      const postStart = new Date(cartCloses);
      postStart.setDate(postStart.getDate() + 1);
      const days = differenceInDays(postLaunchEnd, postStart) + 1;
      const startOffset = differenceInDays(postStart, overallStart);
      result.push({
        key: 'post-launch',
        label: 'Post-Launch',
        color: 'bg-purple-500',
        startPercent: (startOffset / totalDays) * 100,
        widthPercent: (days / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: postStart, end: postLaunchEnd }),
        isPast: isAfter(today, postLaunchEnd),
      });
    }

    return result;
  }, [launch]);

  const currentPhase = segments.find(s => s.isCurrent);
  const totalDays = useMemo(() => {
    const cartOpens = parseISO(launch.cart_opens);
    const cartCloses = parseISO(launch.cart_closes);
    const runwayStart = launch.runway_start_date ? parseISO(launch.runway_start_date) : cartOpens;
    const postLaunchEnd = launch.post_launch_end_date ? parseISO(launch.post_launch_end_date) : cartCloses;
    const overallStart = runwayStart;
    const overallEnd = postLaunchEnd;
    const elapsed = Math.max(0, differenceInDays(today, overallStart));
    const total = Math.max(1, differenceInDays(overallEnd, overallStart) + 1);
    return { elapsed, total, percent: Math.min(100, (elapsed / total) * 100) };
  }, [launch]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Current phase label */}
      {currentPhase && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Current phase:</span>
          <span className={cn(
            "font-medium px-2 py-0.5 rounded text-white",
            currentPhase.color
          )}>
            {currentPhase.label}
          </span>
        </div>
      )}

      {/* Timeline bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden relative">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cn(
              "absolute h-full transition-all",
              segment.color,
              segment.isPast && "opacity-40",
              segment.isCurrent && "opacity-100"
            )}
            style={{
              left: `${segment.startPercent}%`,
              width: `${segment.widthPercent}%`,
            }}
          />
        ))}
        
        {/* Today marker */}
        {totalDays.percent > 0 && totalDays.percent < 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground"
            style={{ left: `${totalDays.percent}%` }}
          />
        )}
      </div>

      {/* Progress text */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Day {totalDays.elapsed + 1} of {totalDays.total}</span>
        <span>{Math.round(totalDays.percent)}% complete</span>
      </div>
    </div>
  );
}
