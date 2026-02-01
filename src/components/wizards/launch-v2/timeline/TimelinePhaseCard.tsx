// Reusable phase editor card for timeline customization

import { differenceInDays, parseISO, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Rocket, Megaphone, ShoppingCart, Mail } from 'lucide-react';
import { LaunchPhase, PhaseIntensity, getPhaseTaskEstimate } from '@/lib/launchHelpers';
import { cn } from '@/lib/utils';

interface TimelinePhaseCardProps {
  phase: LaunchPhase;
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  minStartDate?: string;
  maxEndDate?: string;
  isGapAffected?: boolean;
  warnings?: string[];
  disabled?: boolean;
}

const PHASE_CONFIG: Record<LaunchPhase, {
  icon: React.ReactNode;
  title: string;
  description: string[];
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  'runway': {
    icon: <Rocket className="h-4 w-4" />,
    title: 'Runway',
    description: [
      'Build buzz quietly',
      'Segment your email list',
      'Prep your free event (if doing one)',
    ],
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  'pre-launch': {
    icon: <Megaphone className="h-4 w-4" />,
    title: 'Pre-Launch',
    description: [
      'Announce your launch publicly',
      'Heavy content promotion',
      'Host free event / workshop',
    ],
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  'cart-open': {
    icon: <ShoppingCart className="h-4 w-4" />,
    title: 'Cart Open',
    description: [
      'Daily offers & emails',
      'Handle objections',
      'Personal outreach to warm leads',
    ],
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  'post-launch': {
    icon: <Mail className="h-4 w-4" />,
    title: 'Post-Launch',
    description: [
      'Follow-up with buyers',
      'Nurture non-buyers',
      'Launch debrief & learnings',
    ],
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
};

const INTENSITY_BADGE: Record<PhaseIntensity, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  'low': { label: 'LOW', variant: 'secondary' },
  'medium': { label: 'MEDIUM', variant: 'default' },
  'high': { label: 'HIGH', variant: 'destructive' },
};

export function TimelinePhaseCard({
  phase,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  minStartDate,
  maxEndDate,
  isGapAffected = false,
  warnings = [],
  disabled = false,
}: TimelinePhaseCardProps) {
  const config = PHASE_CONFIG[phase];
  
  // Calculate duration and estimate
  const duration = startDate && endDate 
    ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1 
    : 0;
  const estimate = getPhaseTaskEstimate(phase, duration);
  const intensityConfig = INTENSITY_BADGE[estimate.intensity];

  // Format daily time display
  const dailyTimeDisplay = estimate.dailyMinutes < 60 
    ? `${estimate.dailyMinutes} min/day`
    : `${(estimate.dailyMinutes / 60).toFixed(1)} hrs/day`;

  return (
    <Card 
      className={cn(
        'transition-all',
        config.bgColor,
        isGapAffected && 'ring-2 ring-amber-400 dark:ring-amber-600',
        disabled && 'opacity-60'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center gap-2 text-base', config.color)}>
            {config.icon}
            {config.title}
          </CardTitle>
          <Badge variant={intensityConfig.variant} className="text-xs">
            {intensityConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date pickers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Start</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartChange(e.target.value)}
              min={minStartDate}
              disabled={disabled}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">End</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndChange(e.target.value)}
              max={maxEndDate}
              disabled={disabled}
              className="h-10"
            />
          </div>
        </div>

        {/* Duration & intensity */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{duration} days</span>
          <span className="mx-2">·</span>
          <span>~{dailyTimeDisplay}</span>
        </div>

        {/* What happens list */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">What happens:</p>
          <ul className="text-sm space-y-0.5">
            {config.description.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* GAP indicator */}
        {isGapAffected && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Overlaps with THE GAP (weeks 3-4)</span>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((warning, i) => (
              <div key={i} className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
