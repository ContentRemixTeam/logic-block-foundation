// Step 2: Goal & Timeline (Q4-Q6)
// Captures launch timeline, dates, and revenue goal tier
// Now includes Level 1/Level 2 timeline customization

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';
import {
  LaunchWizardV2Data,
  LaunchTimeline,
  RevenueGoalTier,
  LAUNCH_TIMELINE_OPTIONS,
  REVENUE_GOAL_TIER_OPTIONS,
} from '@/types/launchV2';
import { 
  calculateCartCloseDate, 
  getRevenueFromTier,
} from '@/lib/launchV2Validation';
import {
  calculateSuggestedTimeline,
  LaunchPhaseDates,
  TimelineDuration,
} from '@/lib/launchHelpers';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { detectGapOverlap, GapOverlapResult } from '../utils/gapDetection';
import { formatCurrency } from '@/lib/wizardHelpers';
import {
  TimelineQuickSetup,
  TimelineCustomizer,
  FreeEventConfig,
  GapAcknowledgmentPrompt,
} from '../timeline';

interface StepGoalTimelineProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepGoalTimeline({ data, onChange }: StepGoalTimelineProps) {
  const { data: activeCycle } = useActiveCycle();
  const [isCustomizing, setIsCustomizing] = useState(data.useCustomTimeline);
  const [showGapPrompt, setShowGapPrompt] = useState(false);

  // Auto-calculate cart close when timeline or cart opens changes
  useEffect(() => {
    if (data.cartOpensDate && data.launchTimeline) {
      const calculatedClose = calculateCartCloseDate(data.cartOpensDate, data.launchTimeline);
      if (calculatedClose !== data.cartClosesDate) {
        onChange({ cartClosesDate: calculatedClose });
      }
    }
  }, [data.cartOpensDate, data.launchTimeline]);

  // Auto-detect GAP overlap when dates change
  const gapResult: GapOverlapResult | null = 
    data.cartOpensDate && data.cartClosesDate && activeCycle?.start_date
      ? detectGapOverlap(data.cartOpensDate, data.cartClosesDate, activeCycle.start_date)
      : null;

  // Update GAP detection state
  useEffect(() => {
    if (gapResult) {
      if (gapResult.overlaps !== data.gapOverlapDetected) {
        onChange({ gapOverlapDetected: gapResult.overlaps });
      }
      // Show GAP prompt if overlap detected and not yet acknowledged
      if (gapResult.overlaps && !data.gapAcknowledged && data.cartOpensDate) {
        setShowGapPrompt(true);
      }
    }
  }, [gapResult?.overlaps, data.cartOpensDate]);

  // Set revenue goal when tier changes
  const handleRevenueGoalTierChange = (tier: RevenueGoalTier) => {
    const revenue = getRevenueFromTier(tier);
    onChange({ 
      revenueGoalTier: tier,
      customRevenueGoal: revenue,
    });
  };

  // Handle accepting suggested timeline
  const handleAcceptSuggestedTimeline = (phases: LaunchPhaseDates) => {
    onChange({
      runwayStartDate: format(phases.runwayStart, 'yyyy-MM-dd'),
      runwayEndDate: format(phases.runwayEnd, 'yyyy-MM-dd'),
      preLaunchStartDate: format(phases.preLaunchStart, 'yyyy-MM-dd'),
      preLaunchEndDate: format(phases.preLaunchEnd, 'yyyy-MM-dd'),
      cartClosesDate: format(phases.cartCloses, 'yyyy-MM-dd'),
      postLaunchEndDate: format(phases.postLaunchEnd, 'yyyy-MM-dd'),
      useCustomTimeline: false,
    });
    setIsCustomizing(false);
  };

  // Handle switching to customize mode
  const handleCustomize = () => {
    // If no dates set yet, populate with suggested
    if (!data.runwayStartDate && data.cartOpensDate && data.launchTimeline) {
      const phases = calculateSuggestedTimeline(
        data.cartOpensDate, 
        data.launchTimeline as TimelineDuration
      );
      onChange({
        runwayStartDate: format(phases.runwayStart, 'yyyy-MM-dd'),
        runwayEndDate: format(phases.runwayEnd, 'yyyy-MM-dd'),
        preLaunchStartDate: format(phases.preLaunchStart, 'yyyy-MM-dd'),
        preLaunchEndDate: format(phases.preLaunchEnd, 'yyyy-MM-dd'),
        postLaunchEndDate: format(phases.postLaunchEnd, 'yyyy-MM-dd'),
      });
    }
    setIsCustomizing(true);
    onChange({ useCustomTimeline: true });
  };

  // Handle collapsing customizer
  const handleCollapseCustomizer = () => {
    setIsCustomizing(false);
  };

  // Handle GAP acknowledgment
  const handleGapContinue = () => {
    setShowGapPrompt(false);
  };

  // Calculate launch percentage of quarterly goal
  const launchPercentage = activeCycle?.revenue_goal && data.customRevenueGoal
    ? Math.round((data.customRevenueGoal / activeCycle.revenue_goal) * 100)
    : null;

  // Check if we should show the timeline section
  const canShowTimeline = data.launchTimeline && data.cartOpensDate;

  return (
    <div className="space-y-8">
      {/* 90-Day Cycle Context */}
      {activeCycle && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Your 90-Day Cycle Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeCycle.goal && (
              <div>
                <span className="text-sm text-muted-foreground">Goal: </span>
                <span className="text-sm font-medium">{activeCycle.goal}</span>
              </div>
            )}
            {activeCycle.revenue_goal && (
              <div>
                <span className="text-sm text-muted-foreground">Revenue Target: </span>
                <span className="text-sm font-medium">{formatCurrency(activeCycle.revenue_goal)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Q4: Launch Timeline */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          What's your launch timeline?
        </Label>
        <RadioGroup
          value={data.launchTimeline}
          onValueChange={(value) => onChange({ launchTimeline: value as LaunchTimeline })}
          className="space-y-3"
        >
          {LAUNCH_TIMELINE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-start space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`timeline-${option.value}`}
                className="mt-1"
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`timeline-${option.value}`} 
                  className="cursor-pointer font-medium"
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Custom timeline input */}
        {data.launchTimeline === 'other' && (
          <div className="mt-3">
            <Label htmlFor="other-timeline" className="text-sm">
              Describe your timeline
            </Label>
            <input
              id="other-timeline"
              type="text"
              value={data.otherLaunchTimeline || ''}
              onChange={(e) => onChange({ otherLaunchTimeline: e.target.value })}
              placeholder="e.g., 8 weeks, 10 days..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
            />
          </div>
        )}
      </div>

      {/* Q5: Cart Opens Date */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          When does your cart open?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          This is when people can start buying your offer.
        </p>
        <input
          type="date"
          value={data.cartOpensDate}
          onChange={(e) => onChange({ cartOpensDate: e.target.value })}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Free Event Config */}
      {canShowTimeline && (
        <FreeEventConfig data={data} onChange={onChange} />
      )}

      {/* Timeline Quick Setup or Customizer */}
      {canShowTimeline && !isCustomizing && (
        <TimelineQuickSetup
          cartOpensDate={data.cartOpensDate}
          timeline={data.launchTimeline as TimelineDuration}
          onAccept={handleAcceptSuggestedTimeline}
          onCustomize={handleCustomize}
          gapStart={gapResult?.gapStartDate ? new Date(gapResult.gapStartDate) : null}
          gapEnd={gapResult?.gapEndDate ? new Date(gapResult.gapEndDate) : null}
        />
      )}

      {canShowTimeline && isCustomizing && (
        <TimelineCustomizer
          data={data}
          onChange={onChange}
          onCollapse={handleCollapseCustomizer}
          gapResult={gapResult}
          isOpen={isCustomizing}
        />
      )}

      {/* GAP Acknowledgment Prompt (blocking) */}
      {showGapPrompt && gapResult?.overlaps && activeCycle?.start_date && (
        <GapAcknowledgmentPrompt
          gapResult={gapResult}
          data={data}
          onChange={onChange}
          cycleStartDate={activeCycle.start_date}
          onContinue={handleGapContinue}
        />
      )}

      {/* Q6: Revenue Goal Tier */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          What's your revenue goal for this launch?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Pick the tier that feels both exciting and slightly scary.
        </p>
        
        <RadioGroup
          value={data.revenueGoalTier}
          onValueChange={(value) => handleRevenueGoalTierChange(value as RevenueGoalTier)}
          className="space-y-3"
        >
          {REVENUE_GOAL_TIER_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`goal-${option.value}`}
              />
              <Label 
                htmlFor={`goal-${option.value}`} 
                className="cursor-pointer flex items-center gap-2"
              >
                {option.label}
                {option.value === 'testing' && (
                  <Badge variant="outline" className="text-xs">
                    No pressure mode
                  </Badge>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Custom revenue goal input */}
        {data.revenueGoalTier === 'custom' && (
          <div className="mt-3">
            <Label htmlFor="custom-revenue" className="text-sm">
              Your specific revenue goal ($)
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                id="custom-revenue"
                type="number"
                min="0"
                step="100"
                value={data.customRevenueGoal ?? ''}
                onChange={(e) => onChange({ customRevenueGoal: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 5000"
                className="flex h-10 w-full max-w-[200px] rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        )}

        {/* Teaching content based on tier */}
        {data.revenueGoalTier === 'first-sale' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>First sale mode.</strong> Your goal is proof of concept. One sale means your offer works. Everything else is bonus. Focus on learning, not earning.
            </p>
          </div>
        )}

        {data.revenueGoalTier === 'testing' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Testing mode activated.</strong> No revenue pressure. Focus on collecting feedback, understanding objections, and refining your messaging. Sales are a bonus.
            </p>
          </div>
        )}

        {data.revenueGoalTier === '2500-plus' && data.emailListStatus !== 'comfortable' && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Ambitious goal + smaller list = more effort.</strong> This is totally doable, but you'll need to lean heavily on direct outreach, collaborations, or paid traffic. We'll plan for that.
            </p>
          </div>
        )}

        {/* Cycle percentage indicator */}
        {launchPercentage !== null && launchPercentage > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm">
              💡 This launch would be <span className="font-semibold text-primary">{launchPercentage}%</span> of your quarterly revenue goal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
