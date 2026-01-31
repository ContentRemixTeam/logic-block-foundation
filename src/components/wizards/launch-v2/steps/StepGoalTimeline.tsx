// Step 2: Goal & Timeline (Q4-Q6)
// Captures launch timeline, dates, and revenue goal tier

import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Target, TrendingUp, AlertTriangle } from 'lucide-react';
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
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { detectGapOverlap } from '../utils/gapDetection';
import { formatCurrency } from '@/lib/wizardHelpers';

interface StepGoalTimelineProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepGoalTimeline({ data, onChange }: StepGoalTimelineProps) {
  const { data: activeCycle } = useActiveCycle();

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
  useEffect(() => {
    if (data.cartOpensDate && data.cartClosesDate && activeCycle?.start_date) {
      const gapResult = detectGapOverlap(
        data.cartOpensDate,
        data.cartClosesDate,
        activeCycle.start_date
      );
      if (gapResult.overlaps !== data.gapOverlapDetected) {
        onChange({ gapOverlapDetected: gapResult.overlaps });
      }
    }
  }, [data.cartOpensDate, data.cartClosesDate, activeCycle?.start_date]);

  // Set revenue goal when tier changes
  const handleRevenueGoalTierChange = (tier: RevenueGoalTier) => {
    const revenue = getRevenueFromTier(tier);
    onChange({ 
      revenueGoalTier: tier,
      customRevenueGoal: revenue,
    });
  };

  // Calculate launch percentage of quarterly goal
  const launchPercentage = activeCycle?.revenue_goal && data.customRevenueGoal
    ? Math.round((data.customRevenueGoal / activeCycle.revenue_goal) * 100)
    : null;

  const gapResult = data.cartOpensDate && data.cartClosesDate && activeCycle?.start_date
    ? detectGapOverlap(data.cartOpensDate, data.cartClosesDate, activeCycle.start_date)
    : null;

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
      </div>

      {/* Q5: Launch Dates */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          When does your launch start?
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cart-opens" className="text-sm text-muted-foreground">
              Cart opens
            </Label>
            <Input
              id="cart-opens"
              type="date"
              value={data.cartOpensDate}
              onChange={(e) => onChange({ cartOpensDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-closes" className="text-sm text-muted-foreground">
              Cart closes (auto-calculated)
            </Label>
            <Input
              id="cart-closes"
              type="date"
              value={data.cartClosesDate}
              onChange={(e) => onChange({ cartClosesDate: e.target.value })}
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Adjust if needed
            </p>
          </div>
        </div>

        {/* GAP Warning */}
        {gapResult?.overlaps && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Launch overlaps with THE GAP
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {gapResult.message}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  We'll help you plan extra support in a later step.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

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
