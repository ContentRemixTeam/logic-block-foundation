// Step 9: Review & Complete (Q24-Q25)
// Captures readiness score and what they need, shows summary with task preview

import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle, Calendar, DollarSign, Target, ListChecks } from 'lucide-react';
import {
  LaunchWizardV2Data,
  WhatYouNeed,
  WHAT_YOU_NEED_OPTIONS,
  getReadinessMessage,
  OFFER_TYPE_OPTIONS,
  LAUNCH_TIMELINE_OPTIONS,
  REVENUE_GOAL_TIER_OPTIONS,
} from '@/types/launchV2';
import { WizardContentType } from '@/types/wizardAIGeneration';
import { formatCurrency } from '@/lib/wizardHelpers';
import { WizardTaskPreview } from '@/components/wizards/shared/WizardTaskPreview';
import { ContentNeedsHub } from '@/components/wizards/shared/ContentNeedsHub';
import { generateLaunchV2TasksPreview, LAUNCH_V2_PHASE_CONFIG } from '@/lib/launchV2TaskGenerator';

interface StepReviewCompleteProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepReviewComplete({ data, onChange }: StepReviewCompleteProps) {
  const [sliderValue, setSliderValue] = useState([data.readinessScore || 5]);
  const [generatedContent, setGeneratedContent] = useState<Record<string, boolean>>({});
  
  // Generate task preview
  const allTasks = useMemo(() => generateLaunchV2TasksPreview(data), [data]);
  const selectedTaskCount = allTasks.filter(t => !(data.excludedTasks || []).includes(t.id)).length;
  
  // Handle AI generation completion
  const handleGenerationComplete = (contentType: WizardContentType) => {
    setGeneratedContent(prev => ({ ...prev, [contentType]: true }));
  };
  
  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    onChange({ readinessScore: value[0] });
  };

  const readinessMessage = getReadinessMessage(sliderValue[0]);
  const offerTypeLabel = data.offerType === 'other' 
    ? data.otherOfferType 
    : OFFER_TYPE_OPTIONS.find(o => o.value === data.offerType)?.label;
  const timelineLabel = LAUNCH_TIMELINE_OPTIONS.find(o => o.value === data.launchTimeline)?.label;
  const revenueLabel = REVENUE_GOAL_TIER_OPTIONS.find(o => o.value === data.revenueGoalTier)?.label;

  return (
    <div className="space-y-8">
      {/* Q24: Readiness Score */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          On a scale of 1-10, how ready do you feel?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          There's no wrong answer. This just helps us calibrate your support.
        </p>
        
        <div className="py-6 px-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">😰 Not ready</span>
            <span className="text-3xl font-bold text-primary">{sliderValue[0]}</span>
            <span className="text-sm text-muted-foreground">Let's go! 🚀</span>
          </div>
          <Slider
            value={sliderValue}
            onValueChange={handleSliderChange}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>

        {/* Readiness message */}
        <div className={`mt-4 p-4 rounded-lg border ${
          sliderValue[0] <= 5 
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' 
            : sliderValue[0] <= 7
            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
            : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
        }`}>
          <p className={`text-sm font-medium ${
            sliderValue[0] <= 5 
              ? 'text-amber-800 dark:text-amber-200' 
              : sliderValue[0] <= 7
              ? 'text-blue-800 dark:text-blue-200'
              : 'text-green-800 dark:text-green-200'
          }`}>
            {readinessMessage}
          </p>
        </div>
      </div>

      {/* Q25: What You Need */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          What's ONE thing you need from this plan?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          We'll prioritize based on your answer.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHAT_YOU_NEED_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                data.whatYouNeed === option.value 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border'
              }`}
              onClick={() => onChange({ whatYouNeed: option.value as WhatYouNeed })}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-xl">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Launch Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-5 w-5 text-primary" />
            Your Launch Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Offer</span>
              </div>
              <p className="text-sm font-medium">{data.name || 'Unnamed'}</p>
              <Badge variant="outline" className="text-xs mt-1">{offerTypeLabel}</Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Price</span>
              </div>
              <p className="text-sm font-medium">
                {data.pricePoint ? formatCurrency(data.pricePoint) : 'Not set'}
                {data.hasPaymentPlan && ' (+ payment plan)'}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Timeline</span>
              </div>
              <p className="text-sm font-medium">{timelineLabel}</p>
              <p className="text-xs text-muted-foreground">
                {data.cartOpensDate && new Date(data.cartOpensDate).toLocaleDateString()} 
                {data.cartOpensDate && data.cartClosesDate && ' → '}
                {data.cartClosesDate && new Date(data.cartClosesDate).toLocaleDateString()}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Goal</span>
              </div>
              <p className="text-sm font-medium">{revenueLabel}</p>
              {data.salesNeeded > 0 && (
                <p className="text-xs text-muted-foreground">{data.salesNeeded} sales needed</p>
              )}
            </div>
          </div>

          {/* Flags */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Key flags:</p>
            <div className="flex flex-wrap gap-2">
              {data.launchExperience === 'first-time' && (
                <Badge variant="outline" className="border-green-500 text-green-600">First launch</Badge>
              )}
              {data.emailListStatus === 'starting-zero' && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">Building list</Badge>
              )}
              {data.gapOverlapDetected && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">GAP overlap</Badge>
              )}
              {data.hasLimitations === 'limited-spots' && (
                <Badge variant="outline" className="border-purple-500 text-purple-600">{data.spotLimit} spots</Badge>
              )}
              {sliderValue[0] <= 5 && (
                <Badge variant="outline" className="border-blue-500 text-blue-600">Extra mindset support</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content to Create Hub */}
      <ContentNeedsHub 
        data={data}
        generatedContent={generatedContent}
        onGenerationComplete={handleGenerationComplete}
      />

      {/* Task Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-5 w-5 text-primary" />
            Tasks to Create ({selectedTaskCount} selected)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WizardTaskPreview
            tasks={allTasks}
            excludedTasks={data.excludedTasks || []}
            dateOverrides={data.taskDateOverrides || []}
            onExcludedTasksChange={(excludedTasks) => onChange({ excludedTasks })}
            onDateOverridesChange={(taskDateOverrides) => onChange({ taskDateOverrides })}
            phaseOrder={LAUNCH_V2_PHASE_CONFIG}
            defaultExpandedPhases={['pre_launch', 'launch']}
            maxHeight="350px"
          />
        </CardContent>
      </Card>

      {/* Final CTA hint */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 inline mr-1 text-green-500" />
          Click "Create Launch" to generate your project and {selectedTaskCount} tasks.
        </p>
      </div>
    </div>
  );
}
