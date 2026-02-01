// Horizontal visual representation of all launch phases

import { differenceInDays, parseISO, format } from 'date-fns';
import { LaunchPhaseDates, LaunchPhase } from '@/lib/launchHelpers';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimelineVisualBarProps {
  phases: LaunchPhaseDates;
  gapStart?: Date | null;
  gapEnd?: Date | null;
  className?: string;
}

interface PhaseSegment {
  phase: LaunchPhase;
  label: string;
  start: Date;
  end: Date;
  days: number;
  color: string;
  bgClass: string;
  textClass: string;
}

export function TimelineVisualBar({ 
  phases, 
  gapStart, 
  gapEnd,
  className,
}: TimelineVisualBarProps) {
  const isMobile = useIsMobile();

  // Build phase segments
  const segments: PhaseSegment[] = [
    {
      phase: 'runway',
      label: 'Runway',
      start: phases.runwayStart,
      end: phases.runwayEnd,
      days: differenceInDays(phases.runwayEnd, phases.runwayStart) + 1,
      color: 'blue',
      bgClass: 'bg-blue-500',
      textClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      phase: 'pre-launch',
      label: 'Pre-Launch',
      start: phases.preLaunchStart,
      end: phases.preLaunchEnd,
      days: differenceInDays(phases.preLaunchEnd, phases.preLaunchStart) + 1,
      color: 'purple',
      bgClass: 'bg-purple-500',
      textClass: 'text-purple-600 dark:text-purple-400',
    },
    {
      phase: 'cart-open',
      label: 'Cart Open',
      start: phases.cartOpens,
      end: phases.cartCloses,
      days: differenceInDays(phases.cartCloses, phases.cartOpens) + 1,
      color: 'green',
      bgClass: 'bg-green-500',
      textClass: 'text-green-600 dark:text-green-400',
    },
    {
      phase: 'post-launch',
      label: 'Post-Launch',
      start: phases.cartCloses, // starts day after cart closes
      end: phases.postLaunchEnd,
      days: differenceInDays(phases.postLaunchEnd, phases.cartCloses),
      color: 'orange',
      bgClass: 'bg-orange-500',
      textClass: 'text-orange-600 dark:text-orange-400',
    },
  ];

  const totalDays = segments.reduce((sum, s) => sum + s.days, 0);

  // Check if segment overlaps with GAP
  const isGapAffected = (segment: PhaseSegment): boolean => {
    if (!gapStart || !gapEnd) return false;
    return segment.start <= gapEnd && segment.end >= gapStart;
  };

  // Mobile: Vertical list
  if (isMobile) {
    return (
      <div className={cn('space-y-2', className)}>
        {segments.map((segment) => (
          <div 
            key={segment.phase}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg',
              isGapAffected(segment) 
                ? 'bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700' 
                : 'bg-muted/50'
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', segment.bgClass)} />
              <span className={cn('text-sm font-medium', segment.textClass)}>
                {segment.label}
              </span>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{segment.days} days</div>
              <div className="text-xs">
                {format(segment.start, 'MMM d')} - {format(segment.end, 'MMM d')}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Horizontal bar
  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        {/* Date range header */}
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{format(phases.runwayStart, 'MMM d')}</span>
          <span>{format(phases.postLaunchEnd, 'MMM d')}</span>
        </div>

        {/* Phase bar */}
        <div className="flex h-10 rounded-lg overflow-hidden border">
          {segments.map((segment) => {
            const widthPercent = (segment.days / totalDays) * 100;
            const affected = isGapAffected(segment);

            return (
              <Tooltip key={segment.phase}>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      'flex items-center justify-center transition-all cursor-pointer',
                      'hover:brightness-110',
                      segment.bgClass,
                      affected && 'ring-2 ring-inset ring-amber-400'
                    )}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="text-white text-xs font-medium truncate px-1">
                      {widthPercent > 15 ? segment.label : ''}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <div className="font-medium">{segment.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(segment.start, 'MMM d')} - {format(segment.end, 'MMM d')}
                    </div>
                    <div className="text-xs">{segment.days} days</div>
                    {affected && (
                      <div className="text-xs text-amber-500 mt-1">⚠️ GAP overlap</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Duration labels */}
        <div className="flex text-xs text-muted-foreground">
          {segments.map((segment) => {
            const widthPercent = (segment.days / totalDays) * 100;
            return (
              <div 
                key={segment.phase}
                className="text-center"
                style={{ width: `${widthPercent}%` }}
              >
                {widthPercent > 10 && `${segment.days}d`}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
