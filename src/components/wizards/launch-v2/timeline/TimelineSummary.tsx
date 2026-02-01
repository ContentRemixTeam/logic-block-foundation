// Capacity check and time commitment summary

import { differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, CheckCircle2, AlertTriangle } from 'lucide-react';
import { 
  LaunchPhaseDates, 
  calculateTotalLaunchTime,
  getPhaseTaskEstimate,
  LaunchPhase,
} from '@/lib/launchHelpers';
import { GapOverlapResult } from '../utils/gapDetection';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface TimelineSummaryProps {
  phases: LaunchPhaseDates;
  gapResult?: GapOverlapResult | null;
  className?: string;
}

const INTENSITY_BARS: Record<number, string> = {
  1: '▁',
  2: '▂',
  3: '▃',
  4: '▅',
  5: '▆',
  6: '▇',
};

export function TimelineSummary({ phases, gapResult, className }: TimelineSummaryProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(!isMobile);

  const timeEstimate = calculateTotalLaunchTime(phases);
  
  // Build phase breakdown data
  const phaseBreakdown: { 
    phase: LaunchPhase; 
    label: string; 
    days: number; 
    dailyTime: string;
    intensity: 'LOW' | 'MEDIUM' | 'HIGH';
    intensityClass: string;
  }[] = [
    {
      phase: 'runway',
      label: 'Runway',
      days: timeEstimate.phases.runway.days,
      dailyTime: '30 min/day',
      intensity: 'LOW',
      intensityClass: 'text-green-600 dark:text-green-400',
    },
    {
      phase: 'pre-launch',
      label: 'Pre-Launch',
      days: timeEstimate.phases['pre-launch'].days,
      dailyTime: '1.5 hrs/day',
      intensity: 'MEDIUM',
      intensityClass: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      phase: 'cart-open',
      label: 'Cart Open',
      days: timeEstimate.phases['cart-open'].days,
      dailyTime: '2 hrs/day',
      intensity: 'HIGH',
      intensityClass: 'text-red-600 dark:text-red-400',
    },
    {
      phase: 'post-launch',
      label: 'Post-Launch',
      days: timeEstimate.phases['post-launch'].days,
      dailyTime: '1 hr/day',
      intensity: 'MEDIUM',
      intensityClass: 'text-yellow-600 dark:text-yellow-400',
    },
  ];

  // Build intensity visualization
  const intensityString = [
    ...Array(Math.min(3, phaseBreakdown[0].days)).fill(1),  // Runway - low
    ...Array(Math.min(3, phaseBreakdown[1].days)).fill(3),  // Pre-launch - medium
    ...Array(Math.min(4, phaseBreakdown[2].days)).fill(6),  // Cart open - high
    ...Array(Math.min(3, phaseBreakdown[3].days)).fill(3),  // Post-launch - medium
  ].map(v => INTENSITY_BARS[v] || '▁').join('');

  // Capacity check (simplified - in future could use actual user data)
  const isManageable = timeEstimate.totalHours < 60;

  // Recommendations
  const recommendations: string[] = [];
  if (phaseBreakdown[2].days >= 7) {
    recommendations.push('Consider blocking "deep work" time during Cart Open phase');
  }
  if (timeEstimate.totalHours > 40) {
    recommendations.push('Schedule lighter client work during launch period');
  }
  if (gapResult?.overlaps) {
    recommendations.push('Your GAP overlap requires extra mindset support');
  }
  if (phaseBreakdown[0].days < 7) {
    recommendations.push('Short runway - front-load content creation if possible');
  }

  const summaryContent = (
    <div className="space-y-4">
      {/* Phase breakdown */}
      <div className="space-y-2">
        {phaseBreakdown.map((phase) => (
          <div 
            key={phase.phase}
            className="grid grid-cols-4 gap-2 text-sm"
          >
            <span className="text-muted-foreground">{phase.label}</span>
            <span className="text-center">{phase.days} days</span>
            <span className="text-center text-muted-foreground">{phase.dailyTime}</span>
            <span className={cn('text-right font-medium', phase.intensityClass)}>
              {phase.intensity}
            </span>
          </div>
        ))}
      </div>

      {/* Intensity visualization */}
      <div className="text-center space-y-1">
        <div className="text-lg font-mono tracking-wide text-muted-foreground">
          {intensityString}
        </div>
        <div className="text-xs text-muted-foreground">
          LOW → MEDIUM → HIGH → MEDIUM
        </div>
      </div>

      {/* Capacity indicator */}
      <div className={cn(
        'flex items-center gap-2 p-3 rounded-lg',
        isManageable 
          ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
          : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
      )}>
        {isManageable ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                This timeline looks manageable
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Peak demand (2 hrs/day) during Cart Open phase
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Intensive launch schedule
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Consider extending timeline for more breathing room
              </p>
            </div>
          </>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">RECOMMENDATIONS:</p>
          <ul className="text-sm space-y-1">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // Mobile: Collapsible
  if (isMobile) {
    return (
      <Card className={className}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Launch Capacity Summary
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {timeEstimate.totalDays} days · ~{timeEstimate.totalHours}h
                  </Badge>
                  <ChevronDown className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {summaryContent}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  // Desktop: Always expanded
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Launch Capacity Summary
          </CardTitle>
          <Badge variant="secondary">
            {timeEstimate.totalDays} days · ~{timeEstimate.totalHours} hours
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {summaryContent}
      </CardContent>
    </Card>
  );
}
