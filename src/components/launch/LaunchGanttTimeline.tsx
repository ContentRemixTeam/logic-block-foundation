// LaunchGanttTimeline - Visual horizontal timeline showing 4 launch phases
// Used in project detail page for launch projects

import { useMemo } from 'react';
import { format, parseISO, differenceInDays, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Rocket, Calendar, Flag, PartyPopper } from 'lucide-react';

export interface LaunchPhaseData {
  runwayStart: string | null;
  runwayEnd: string | null;
  preLaunchStart: string | null;
  preLaunchEnd: string | null;
  cartOpens: string;
  cartCloses: string;
  postLaunchEnd: string | null;
}

interface LaunchGanttTimelineProps {
  phases: LaunchPhaseData;
  className?: string;
  onPhaseClick?: (phase: string) => void;
}

interface PhaseConfig {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const PHASE_CONFIGS: PhaseConfig[] = [
  {
    key: 'runway',
    label: 'Runway',
    shortLabel: 'RW',
    color: 'bg-slate-500',
    bgColor: 'bg-slate-500/20',
    icon: <Calendar className="h-3 w-3" />,
  },
  {
    key: 'pre-launch',
    label: 'Pre-Launch',
    shortLabel: 'PL',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-500/20',
    icon: <Rocket className="h-3 w-3" />,
  },
  {
    key: 'cart-open',
    label: 'Cart Open',
    shortLabel: 'CO',
    color: 'bg-green-500',
    bgColor: 'bg-green-500/20',
    icon: <Flag className="h-3 w-3" />,
  },
  {
    key: 'post-launch',
    label: 'Post-Launch',
    shortLabel: 'PO',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-500/20',
    icon: <PartyPopper className="h-3 w-3" />,
  },
];

export function LaunchGanttTimeline({ 
  phases, 
  className,
  onPhaseClick 
}: LaunchGanttTimelineProps) {
  const today = new Date();

  const timelineData = useMemo(() => {
    const cartOpens = parseISO(phases.cartOpens);
    const cartCloses = parseISO(phases.cartCloses);
    
    // Build phase intervals with fallbacks
    const runwayStart = phases.runwayStart ? parseISO(phases.runwayStart) : null;
    const runwayEnd = phases.runwayEnd ? parseISO(phases.runwayEnd) : null;
    const preLaunchStart = phases.preLaunchStart ? parseISO(phases.preLaunchStart) : runwayEnd;
    const preLaunchEnd = phases.preLaunchEnd ? parseISO(phases.preLaunchEnd) : cartOpens;
    const postLaunchEnd = phases.postLaunchEnd ? parseISO(phases.postLaunchEnd) : null;

    // Calculate overall timeline bounds
    const overallStart = runwayStart || preLaunchStart || cartOpens;
    const overallEnd = postLaunchEnd || cartCloses;
    const totalDays = Math.max(1, differenceInDays(overallEnd, overallStart) + 1);

    // Build phase data
    const phaseData = [];

    // Runway phase
    if (runwayStart && runwayEnd) {
      const days = differenceInDays(runwayEnd, runwayStart) + 1;
      const startOffset = differenceInDays(runwayStart, overallStart);
      phaseData.push({
        ...PHASE_CONFIGS[0],
        startDate: runwayStart,
        endDate: runwayEnd,
        days,
        widthPercent: (days / totalDays) * 100,
        startPercent: (startOffset / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: runwayStart, end: runwayEnd }),
        isPast: isAfter(today, runwayEnd),
        isFuture: isBefore(today, runwayStart),
      });
    }

    // Pre-launch phase
    if (preLaunchStart && preLaunchEnd) {
      const days = differenceInDays(preLaunchEnd, preLaunchStart) + 1;
      const startOffset = differenceInDays(preLaunchStart, overallStart);
      phaseData.push({
        ...PHASE_CONFIGS[1],
        startDate: preLaunchStart,
        endDate: preLaunchEnd,
        days,
        widthPercent: (days / totalDays) * 100,
        startPercent: (startOffset / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: preLaunchStart, end: preLaunchEnd }),
        isPast: isAfter(today, preLaunchEnd),
        isFuture: isBefore(today, preLaunchStart),
      });
    }

    // Cart open phase
    {
      const days = differenceInDays(cartCloses, cartOpens) + 1;
      const startOffset = differenceInDays(cartOpens, overallStart);
      phaseData.push({
        ...PHASE_CONFIGS[2],
        startDate: cartOpens,
        endDate: cartCloses,
        days,
        widthPercent: (days / totalDays) * 100,
        startPercent: (startOffset / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: cartOpens, end: cartCloses }),
        isPast: isAfter(today, cartCloses),
        isFuture: isBefore(today, cartOpens),
      });
    }

    // Post-launch phase
    if (postLaunchEnd) {
      const postStart = new Date(cartCloses);
      postStart.setDate(postStart.getDate() + 1);
      const days = differenceInDays(postLaunchEnd, postStart) + 1;
      const startOffset = differenceInDays(postStart, overallStart);
      phaseData.push({
        ...PHASE_CONFIGS[3],
        startDate: postStart,
        endDate: postLaunchEnd,
        days,
        widthPercent: (days / totalDays) * 100,
        startPercent: (startOffset / totalDays) * 100,
        isCurrent: isWithinInterval(today, { start: postStart, end: postLaunchEnd }),
        isPast: isAfter(today, postLaunchEnd),
        isFuture: isBefore(today, postStart),
      });
    }

    // Calculate today marker position
    let todayPercent = null;
    if (today >= overallStart && today <= overallEnd) {
      todayPercent = (differenceInDays(today, overallStart) / totalDays) * 100;
    }

    return {
      phases: phaseData,
      totalDays,
      overallStart,
      overallEnd,
      todayPercent,
    };
  }, [phases]);

  const currentPhase = timelineData.phases.find(p => p.isCurrent);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current phase indicator */}
      {currentPhase && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
          currentPhase.bgColor
        )}>
          {currentPhase.icon}
          <span>Currently in {currentPhase.label}</span>
          <span className="text-muted-foreground">
            ({currentPhase.days} days • ends {format(currentPhase.endDate, 'MMM d')})
          </span>
        </div>
      )}

      {/* Timeline bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-10 bg-muted rounded-lg overflow-hidden relative">
          {/* Phase segments */}
          {timelineData.phases.map((phase) => (
            <button
              key={phase.key}
              onClick={() => onPhaseClick?.(phase.key)}
              className={cn(
                "absolute h-full transition-all duration-200",
                phase.color,
                phase.isPast && "opacity-50",
                phase.isCurrent && "ring-2 ring-offset-2 ring-primary",
                onPhaseClick && "hover:opacity-80 cursor-pointer"
              )}
              style={{
                left: `${phase.startPercent}%`,
                width: `${phase.widthPercent}%`,
              }}
              title={`${phase.label}: ${format(phase.startDate, 'MMM d')} - ${format(phase.endDate, 'MMM d')}`}
            >
              <div className="flex items-center justify-center h-full text-white text-xs font-medium">
                {phase.widthPercent > 15 ? phase.label : phase.shortLabel}
              </div>
            </button>
          ))}

          {/* Today marker */}
          {timelineData.todayPercent !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${timelineData.todayPercent}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-red-500 whitespace-nowrap">
                Today
              </div>
            </div>
          )}
        </div>

        {/* Date labels */}
        <div className="flex justify-between mt-6 text-xs text-muted-foreground">
          <span>{format(timelineData.overallStart, 'MMM d')}</span>
          <span>{format(timelineData.overallEnd, 'MMM d')}</span>
        </div>
      </div>

      {/* Phase legend */}
      <div className="flex flex-wrap gap-4 pt-2">
        {timelineData.phases.map((phase) => (
          <div key={phase.key} className="flex items-center gap-2 text-xs">
            <div className={cn("w-3 h-3 rounded", phase.color, phase.isPast && "opacity-50")} />
            <span className={cn(phase.isPast && "text-muted-foreground")}>
              {phase.label}
              <span className="text-muted-foreground ml-1">
                ({phase.days}d)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
