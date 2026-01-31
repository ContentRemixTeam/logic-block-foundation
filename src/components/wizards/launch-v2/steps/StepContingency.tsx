// Step 7: Contingency Planning (Q19-Q21)
// Captures fears, zero sales meaning, and backup plan

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Brain, Heart } from 'lucide-react';
import {
  LaunchWizardV2Data,
  BiggestFear,
  ZeroSalesMeaning,
  ZeroSalesPlan,
  BIGGEST_FEAR_OPTIONS,
  ZERO_SALES_MEANING_OPTIONS,
  ZERO_SALES_PLAN_OPTIONS,
  TEACHING_CONTENT,
} from '@/types/launchV2';
import { FEAR_REFRAME_MAP } from '../utils/fearPrompts';
import { CONTINGENCY_TEACHING } from '../utils/fearPrompts';

interface StepContingencyProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepContingency({ data, onChange }: StepContingencyProps) {
  const handleFearToggle = (fear: BiggestFear, checked: boolean) => {
    let newFears = [...data.biggestFears];
    
    if (fear === 'no-fear') {
      // If selecting "no fear", clear all others
      newFears = checked ? ['no-fear'] : [];
    } else {
      // If selecting another fear, remove "no fear" if present
      newFears = newFears.filter(f => f !== 'no-fear');
      
      if (checked) {
        newFears.push(fear);
      } else {
        newFears = newFears.filter(f => f !== fear);
      }
    }
    
    onChange({ biggestFears: newFears });
  };

  const hasNoFear = data.biggestFears.includes('no-fear');
  const selectedFearsWithReframes = data.biggestFears
    .filter(f => f !== 'no-fear')
    .slice(0, 3); // Show reframes for up to 3 fears

  return (
    <div className="space-y-8">
      {/* Teaching intro */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
            <Shield className="h-5 w-5" />
            Let's get real about launch fears
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            {CONTINGENCY_TEACHING.intro}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Q19: Biggest Fears */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5" />
          What's your biggest fear about this launch?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Choose all that apply. Being honest here helps us support you.
        </p>
        
        <div className="space-y-3">
          {BIGGEST_FEAR_OPTIONS.map((option) => (
            <div 
              key={option.value} 
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                data.biggestFears.includes(option.value)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <Checkbox
                id={`fear-${option.value}`}
                checked={data.biggestFears.includes(option.value)}
                onCheckedChange={(checked) => handleFearToggle(option.value, checked as boolean)}
                disabled={option.value !== 'no-fear' && hasNoFear}
                className="mt-0.5"
              />
              <Label 
                htmlFor={`fear-${option.value}`} 
                className="cursor-pointer flex-1"
              >
                <span className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </span>
              </Label>
            </div>
          ))}
        </div>

        {/* Reframes for selected fears */}
        {selectedFearsWithReframes.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium">💡 Reframes for your fears:</p>
            {selectedFearsWithReframes.map((fear) => (
              <div 
                key={fear}
                className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800"
              >
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>{BIGGEST_FEAR_OPTIONS.find(o => o.value === fear)?.icon}</strong>{' '}
                  {FEAR_REFRAME_MAP[fear]}
                </p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              We'll add these as thought work prompts to your plan.
            </p>
          </div>
        )}
      </div>

      {/* Q20 & Q21 - Only show if they have fears */}
      {!hasNoFear && data.biggestFears.length > 0 && (
        <>
          {/* Q20: Zero Sales Meaning */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5" />
              If you get $0 in sales, what would that mean to you?
            </Label>
            <p className="text-sm text-muted-foreground -mt-2">
              Be honest. We're building self-awareness here.
            </p>
            
            <RadioGroup
              value={data.zeroSalesMeaning}
              onValueChange={(value) => onChange({ zeroSalesMeaning: value as ZeroSalesMeaning })}
              className="space-y-3"
            >
              {ZERO_SALES_MEANING_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem 
                    value={option.value} 
                    id={`meaning-${option.value}`}
                  />
                  <Label 
                    htmlFor={`meaning-${option.value}`} 
                    className="cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Meaning-based teaching */}
            {data.zeroSalesMeaning && data.zeroSalesMeaning !== 'just-data' && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {TEACHING_CONTENT.zeroSalesMeaning[data.zeroSalesMeaning as keyof typeof TEACHING_CONTENT.zeroSalesMeaning]}
                </p>
              </div>
            )}

            {data.zeroSalesMeaning === 'just-data' && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✨ {TEACHING_CONTENT.zeroSalesMeaning['just-data']}
                </p>
              </div>
            )}
          </div>

          {/* Q21: Zero Sales Plan */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">
              What will you do if nobody buys?
            </Label>
            <p className="text-sm text-muted-foreground -mt-2">
              Having a plan reduces anxiety and keeps you in action mode.
            </p>
            
            <RadioGroup
              value={data.zeroSalesPlan}
              onValueChange={(value) => onChange({ zeroSalesPlan: value as ZeroSalesPlan })}
              className="space-y-3"
            >
              {ZERO_SALES_PLAN_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem 
                    value={option.value} 
                    id={`plan-${option.value}`}
                  />
                  <Label 
                    htmlFor={`plan-${option.value}`} 
                    className="cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {data.zeroSalesPlan === 'no-plan' && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>That's honest.</strong> Let's make a simple plan right now: 
                  If zero sales → take one day to feel disappointed → then ask yourself "What would I do differently?" → make one adjustment → try again.
                </p>
              </div>
            )}

            {data.zeroSalesPlan === 'figure-out-retry' && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Growth mindset!</strong> This is exactly the right approach. 
                  We'll add a "post-mortem" task to your debrief to make this easy.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Summary for those with no fear */}
      {hasNoFear && (
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Love the confidence!</strong> 💪 You're ready to launch without the mental drama. 
              We'll still add a debrief task so you can celebrate and learn.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contingency summary */}
      {data.biggestFears.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">What we'll add to your plan:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {!hasNoFear && (
                <>
                  <li>• Thought work prompts for {Math.min(data.biggestFears.length, 3)} fear(s)</li>
                  <li>• Pre-launch mindset prep task</li>
                  <li>• Mid-launch mental check-in</li>
                </>
              )}
              <li>• Post-launch debrief with reflection prompts</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
