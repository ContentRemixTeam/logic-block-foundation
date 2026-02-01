// Level 1 - Suggested timeline with one-click acceptance

import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Settings2 } from 'lucide-react';
import { 
  LaunchPhaseDates, 
  calculateSuggestedTimeline, 
  calculateTotalLaunchTime,
  TimelineDuration,
} from '@/lib/launchHelpers';
import { TimelineVisualBar } from './TimelineVisualBar';
import { LaunchWizardV2Data } from '@/types/launchV2';

interface TimelineQuickSetupProps {
  cartOpensDate: string;
  timeline: TimelineDuration;
  onAccept: (phases: LaunchPhaseDates) => void;
  onCustomize: () => void;
  gapStart?: Date | null;
  gapEnd?: Date | null;
}

export function TimelineQuickSetup({
  cartOpensDate,
  timeline,
  onAccept,
  onCustomize,
  gapStart,
  gapEnd,
}: TimelineQuickSetupProps) {
  // Calculate suggested timeline
  const suggestedPhases = calculateSuggestedTimeline(cartOpensDate, timeline);
  const timeEstimate = calculateTotalLaunchTime(suggestedPhases);

  const handleAccept = () => {
    onAccept(suggestedPhases);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Suggested Timeline
        </CardTitle>
        <CardDescription>
          Based on your choices, here's what we suggest:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phase dates summary */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Runway starts:</span>
              <span className="ml-2 font-medium">
                {format(suggestedPhases.runwayStart, 'MMM d, yyyy')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Pre-launch:</span>
              <span className="ml-2 font-medium">
                {format(suggestedPhases.preLaunchStart, 'MMM d')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cart opens:</span>
              <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                {format(suggestedPhases.cartOpens, 'MMM d')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cart closes:</span>
              <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                {format(suggestedPhases.cartCloses, 'MMM d')}
              </span>
            </div>
          </div>
        </div>

        {/* Visual timeline */}
        <TimelineVisualBar 
          phases={suggestedPhases} 
          gapStart={gapStart}
          gapEnd={gapEnd}
        />

        {/* Time estimate */}
        <div className="text-sm text-center text-muted-foreground">
          Total promotion time: <span className="font-medium">{timeEstimate.totalDays} days</span>
          <span className="mx-1">·</span>
          <span className="font-medium">~{timeEstimate.totalHours} hours</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleAccept} 
            className="flex-1 h-11"
          >
            Use These Dates
          </Button>
          <Button 
            variant="outline" 
            onClick={onCustomize}
            className="flex-1 h-11"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Customize Instead
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
