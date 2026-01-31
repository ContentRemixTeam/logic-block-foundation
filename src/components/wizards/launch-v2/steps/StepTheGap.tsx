// Step 8: THE GAP Check (Q22-Q23)
// Conditional step shown if launch overlaps with weeks 3-4 of 90-day cycle

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Lightbulb, Shield, TrendingDown } from 'lucide-react';
import {
  LaunchWizardV2Data,
  GapSupportType,
  GAP_SUPPORT_TYPE_OPTIONS,
} from '@/types/launchV2';
import { GAP_TEACHING_CONTENT } from '../utils/gapDetection';
import { useActiveCycle } from '@/hooks/useActiveCycle';

interface StepTheGapProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepTheGap({ data, onChange }: StepTheGapProps) {
  const { data: activeCycle } = useActiveCycle();
  
  // If no GAP overlap, show simple confirmation
  if (!data.gapOverlapDetected) {
    return (
      <div className="space-y-8">
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-green-800 dark:text-green-200">
              <Shield className="h-5 w-5" />
              Good news! No GAP overlap detected
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Your launch timing doesn't overlap with THE GAP (weeks 3-4 of your 90-day cycle). 
              You're in a good energy window!
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">What is THE GAP?</p>
            <p className="text-sm text-muted-foreground">
              {GAP_TEACHING_CONTENT.whatIsTheGap}
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          You can skip ahead to the next step. We've noted that your launch timing is optimized.
        </p>
      </div>
    );
  }

  // GAP overlap detected - show full step
  return (
    <div className="space-y-8">
      {/* Warning header */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5" />
            Your launch overlaps with THE GAP
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            Part of your launch falls during weeks 3-4 of your 90-day cycle. 
            This is when motivation typically dips. Let's plan for it.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* What is THE GAP */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">What is THE GAP?</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {GAP_TEACHING_CONTENT.whatIsTheGap}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Why it matters for your launch:</strong> {GAP_TEACHING_CONTENT.whyItMatters}
          </p>
        </CardContent>
      </Card>

      {/* Note: GAP strategy from cycle would be shown here if available */}

      {/* Q22: Acknowledgment */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <Checkbox
            id="gap-acknowledged"
            checked={data.gapAcknowledged}
            onCheckedChange={(checked) => onChange({ gapAcknowledged: checked as boolean })}
          />
          <Label 
            htmlFor="gap-acknowledged" 
            className="cursor-pointer text-sm leading-relaxed"
          >
            <strong>I understand</strong> that my launch overlaps with THE GAP. 
            I know my motivation might dip mid-launch, and this is normal - not a sign something's wrong.
          </Label>
        </div>
      </div>

      {/* Q23: Support type - only show if acknowledged */}
      {data.gapAcknowledged && (
        <div className="space-y-4">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            What extra support would help during THE GAP?
          </Label>
          <p className="text-sm text-muted-foreground -mt-2">
            We'll add specific support tasks based on your choice.
          </p>
          
          <RadioGroup
            value={data.gapSupportType}
            onValueChange={(value) => onChange({ gapSupportType: value as GapSupportType })}
            className="space-y-3"
          >
            {GAP_SUPPORT_TYPE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem 
                  value={option.value} 
                  id={`gap-support-${option.value}`}
                />
                <Label 
                  htmlFor={`gap-support-${option.value}`} 
                  className="cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Support-specific details */}
          {data.gapSupportType === 'daily-motivation' && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Daily motivation selected!</strong> We'll add a quick 5-minute mindset task each morning 
                during the GAP overlap period. These will include affirmations and reframes specific to launch energy.
              </p>
            </div>
          )}

          {data.gapSupportType === 'mid-week-check' && (
            <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                <strong>Check-in scheduled!</strong> We'll add a mid-launch check-in task. 
                Use this for a quick call with an accountability partner, coach, or even a solo journaling session.
              </p>
            </div>
          )}

          {data.gapSupportType === 'thought-work' && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Thought work activated!</strong> We'll pre-populate some CTFAR entries 
                specifically about launch energy and THE GAP. Do these before you hit the dip.
              </p>
            </div>
          )}

          {data.gapSupportType === 'keep-tasks' && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <strong>You got this!</strong> Standard tasks it is. We'll note the GAP overlap 
                in your timeline so you're aware, but won't add extra support tasks.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Strategies list */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">General strategies for launching during THE GAP:</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-sm text-muted-foreground space-y-1">
            {GAP_TEACHING_CONTENT.strategies.map((strategy, index) => (
              <li key={index}>• {strategy}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
