// Step 5: Launch Week Strategy (Q14-Q16)
// Captures launch method, offer frequency, and live components

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, MessageSquare, Video, Zap } from 'lucide-react';
import {
  LaunchWizardV2Data,
  LaunchMethod,
  OfferFrequency,
  LiveComponent,
  LAUNCH_METHOD_OPTIONS,
  OFFER_FREQUENCY_OPTIONS,
  LIVE_COMPONENT_OPTIONS,
} from '@/types/launchV2';

interface StepLaunchWeekProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepLaunchWeek({ data, onChange }: StepLaunchWeekProps) {
  const getDailyTaskEstimate = (): string => {
    if (!data.offerFrequency) return '';
    
    const taskMap: Record<string, number> = {
      'once': 1,
      'daily': 2,
      'multiple-daily': 4,
      'every-other-day': 1,
      'unsure': 2,
    };
    
    let count = taskMap[data.offerFrequency] || 2;
    
    // Add live event prep tasks
    if (data.liveComponent === 'one') count += 1;
    if (data.liveComponent === 'multiple') count += 2;
    
    return `~${count} tasks/day`;
  };

  return (
    <div className="space-y-8">
      {/* Teaching intro */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Rocket className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">This is the main event!</p>
              <p className="text-sm text-muted-foreground">
                Launch week is about making offers consistently. Let's plan how aggressive you want to be.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Q14: Launch Method */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          How will you launch?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Pick your primary launch method. You can always do more.
        </p>
        
        <RadioGroup
          value={data.launchMethod}
          onValueChange={(value) => onChange({ launchMethod: value as LaunchMethod })}
          className="space-y-3"
        >
          {LAUNCH_METHOD_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`method-${option.value}`}
              />
              <Label 
                htmlFor={`method-${option.value}`} 
                className="cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {data.launchMethod === 'outreach-email' && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>High-touch approach!</strong> Direct outreach converts well but takes more time. 
              We'll add daily conversation tasks to your plan.
            </p>
          </div>
        )}
      </div>

      {/* Q15: Offer Frequency */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          How frequently will you make offers during launch week?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          More offers = more sales (usually). But pick what feels authentic to you.
        </p>
        
        <RadioGroup
          value={data.offerFrequency}
          onValueChange={(value) => onChange({ offerFrequency: value as OfferFrequency })}
          className="space-y-3"
        >
          {OFFER_FREQUENCY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`frequency-${option.value}`}
              />
              <Label 
                htmlFor={`frequency-${option.value}`} 
                className="cursor-pointer flex items-center gap-2"
              >
                {option.label}
                {option.value === 'daily' && (
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                )}
                {option.value === 'multiple-daily' && (
                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                    High intensity
                  </Badge>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {data.offerFrequency === 'once' && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>One offer?</strong> That's pretty light. Most people need to see an offer 7+ times before buying. 
              Consider at least daily during cart-open period.
            </p>
          </div>
        )}

        {data.offerFrequency === 'unsure' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Start with daily.</strong> One email + one social post per day is a good baseline. 
              You can always do more as you build confidence.
            </p>
          </div>
        )}
      </div>

      {/* Q16: Live Component */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Video className="h-5 w-5" />
          Are you doing a live component?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Webinars, live Q&As, workshops, etc.
        </p>
        
        <RadioGroup
          value={data.liveComponent}
          onValueChange={(value) => onChange({ liveComponent: value as LiveComponent })}
          className="space-y-3"
        >
          {LIVE_COMPONENT_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`live-${option.value}`}
              />
              <Label 
                htmlFor={`live-${option.value}`} 
                className="cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {(data.liveComponent === 'one' || data.liveComponent === 'multiple') && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Live events boost conversions!</strong> We'll add prep tasks (2 days before) and follow-up tasks to your plan.
            </p>
          </div>
        )}

        {data.liveComponent === 'considering' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>On the fence?</strong> Even a simple 30-minute live Q&A can boost conversions. 
              We'll add a "Decide on live event" task early in your timeline.
            </p>
          </div>
        )}
      </div>

      {/* Task estimate */}
      {getDailyTaskEstimate() && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm">
              📋 Estimated launch week load: <strong>{getDailyTaskEstimate()}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              These are offer-focused tasks only. You'll still have your regular business tasks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
