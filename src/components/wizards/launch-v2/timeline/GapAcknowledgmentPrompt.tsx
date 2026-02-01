// Blocking prompt when GAP overlap is detected

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Calendar, Shield, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { LaunchWizardV2Data } from '@/types/launchV2';
import { GapOverlapResult, calculateGapAdjustment } from '../utils/gapDetection';
import { cn } from '@/lib/utils';

interface GapAcknowledgmentPromptProps {
  gapResult: GapOverlapResult;
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
  cycleStartDate: string;
  onContinue: () => void;
}

type GapChoice = 'continue' | 'adjust-dates' | 'add-support';

export function GapAcknowledgmentPrompt({
  gapResult,
  data,
  onChange,
  cycleStartDate,
  onContinue,
}: GapAcknowledgmentPromptProps) {
  const [selectedChoice, setSelectedChoice] = useState<GapChoice | null>(
    data.gapResponse === 'continue' ? 'continue' :
    data.gapResponse === 'adjust-dates' ? 'adjust-dates' :
    data.gapResponse === 'add-support' ? 'add-support' : null
  );
  const [acknowledged, setAcknowledged] = useState(data.gapAcknowledged || false);

  // Calculate suggested adjustment
  const adjustment = cycleStartDate && data.cartOpensDate 
    ? calculateGapAdjustment(data.cartOpensDate, cycleStartDate)
    : null;

  const handleChoiceChange = (choice: GapChoice) => {
    setSelectedChoice(choice);
    onChange({ gapResponse: choice });

    // If they chose to adjust, apply the suggested dates
    if (choice === 'adjust-dates' && adjustment) {
      onChange({
        cartOpensDate: adjustment.suggestedDate,
        gapResponse: choice,
      });
    }
  };

  const handleAcknowledgeChange = (checked: boolean) => {
    setAcknowledged(checked);
    onChange({ gapAcknowledged: checked });
  };

  const handleContinue = () => {
    if (selectedChoice && acknowledged) {
      onContinue();
    }
  };

  const canContinue = selectedChoice !== null && acknowledged;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          Your Launch Overlaps with THE GAP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Explanation */}
        <div className="space-y-2">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Your launch dates fall during <strong>weeks 3-4 of your 90-day cycle</strong>. 
            This is when motivation typically dips and self-doubt peaks.
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {gapResult.message}
          </p>
        </div>

        {/* Choices */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-amber-900 dark:text-amber-100">
            What would you like to do?
          </Label>
          <RadioGroup
            value={selectedChoice || ''}
            onValueChange={(value) => handleChoiceChange(value as GapChoice)}
            className="space-y-3"
          >
            {/* Continue anyway */}
            <div className={cn(
              'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
              selectedChoice === 'continue' 
                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400'
                : 'border-transparent hover:bg-amber-100/50 dark:hover:bg-amber-900/20'
            )}>
              <RadioGroupItem value="continue" id="gap-continue" className="mt-1" />
              <div className="flex-1">
                <Label 
                  htmlFor="gap-continue" 
                  className="cursor-pointer font-medium flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  I understand the risk – continue with these dates
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You're aware of THE GAP and will push through
                </p>
              </div>
            </div>

            {/* Adjust dates */}
            {adjustment && (
              <div className={cn(
                'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
                selectedChoice === 'adjust-dates' 
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-400'
                  : 'border-transparent hover:bg-green-100/50 dark:hover:bg-green-900/20'
              )}>
                <RadioGroupItem value="adjust-dates" id="gap-adjust" className="mt-1" />
                <div className="flex-1">
                  <Label 
                    htmlFor="gap-adjust" 
                    className="cursor-pointer font-medium flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Adjust my timeline to avoid THE GAP
                  </Label>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    → Suggested: Move cart open to{' '}
                    <strong>{format(new Date(adjustment.suggestedDate), 'MMM d')}</strong>
                    {' '}({adjustment.daysShifted} days {adjustment.direction})
                  </p>
                </div>
              </div>
            )}

            {/* Add support */}
            <div className={cn(
              'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
              selectedChoice === 'add-support' 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400'
                : 'border-transparent hover:bg-blue-100/50 dark:hover:bg-blue-900/20'
            )}>
              <RadioGroupItem value="add-support" id="gap-support" className="mt-1" />
              <div className="flex-1">
                <Label 
                  htmlFor="gap-support" 
                  className="cursor-pointer font-medium flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Add extra support tasks (daily mindset check-ins)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We'll add daily mindset prompts during THE GAP overlap
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Acknowledgment checkbox */}
        <div className="flex items-start space-x-3 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
          <Checkbox
            id="gap-acknowledge"
            checked={acknowledged}
            onCheckedChange={handleAcknowledgeChange}
            className="mt-0.5"
          />
          <Label 
            htmlFor="gap-acknowledge" 
            className="cursor-pointer text-sm text-amber-900 dark:text-amber-100"
          >
            I acknowledge this may require extra effort and mental preparation
          </Label>
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full h-11"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
