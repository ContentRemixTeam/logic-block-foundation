// Step 6: Post-Launch Strategy (Q17-Q18)
// Captures promotion duration and follow-up willingness

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageCircle, Lightbulb } from 'lucide-react';
import {
  LaunchWizardV2Data,
  PromotionDuration,
  FollowUpWillingness,
  PROMOTION_DURATION_OPTIONS,
  FOLLOW_UP_WILLINGNESS_OPTIONS,
} from '@/types/launchV2';

interface StepPostLaunchProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepPostLaunch({ data, onChange }: StepPostLaunchProps) {
  const getFollowUpTaskCount = (): number => {
    if (!data.followUpWillingness) return 0;
    
    const taskMap: Record<string, number> = {
      'one-email': 1,
      'multiple-emails': 4,
      'personal-outreach': 7,
      'simple': 1,
      'unsure': 2,
      'none-planned': 0,
    };
    
    return taskMap[data.followUpWillingness] || 2;
  };

  return (
    <div className="space-y-8">
      {/* Teaching intro */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">The sale isn't over when cart closes</p>
              <p className="text-sm text-muted-foreground">
                Follow-up is where many sales are made. Let's plan what happens after.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Q17: Promotion Duration */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          How long will your launch promotion run?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          From first cart-open email to final push.
        </p>
        
        <RadioGroup
          value={data.promotionDuration}
          onValueChange={(value) => onChange({ promotionDuration: value as PromotionDuration })}
          className="space-y-3"
        >
          {PROMOTION_DURATION_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`duration-${option.value}`}
              />
              <Label 
                htmlFor={`duration-${option.value}`} 
                className="cursor-pointer flex items-center gap-2"
              >
                {option.label}
                {option.value === '1-week' && (
                  <Badge variant="secondary" className="text-xs">Classic launch</Badge>
                )}
                {option.value === 'ongoing' && (
                  <Badge variant="outline" className="text-xs">Evergreen</Badge>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Other duration input */}
        {data.promotionDuration === 'other' && (
          <div className="mt-3">
            <Label htmlFor="other-duration" className="text-sm">
              Describe your promotion duration
            </Label>
            <Input
              id="other-duration"
              value={data.otherPromotionDuration || ''}
              onChange={(e) => onChange({ otherPromotionDuration: e.target.value })}
              placeholder="e.g., 3 days, 10 days, until I feel done..."
              className="mt-1"
            />
          </div>
        )}

        {data.promotionDuration === 'until-goal' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Goal-focused!</strong> We'll add a daily check-in task to track progress. 
              Once you hit your goal, you can close early or keep going.
            </p>
          </div>
        )}

        {data.promotionDuration === 'ongoing' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Evergreen approach!</strong> This is less of a "launch" and more of a sales system. 
              We'll focus on consistent promotion rather than urgency.
            </p>
          </div>
        )}
      </div>

      {/* Q18: Follow-Up Willingness */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          What follow-up are you willing to do?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          For people who didn't buy during the main launch.
        </p>
        
        <RadioGroup
          value={data.followUpWillingness}
          onValueChange={(value) => onChange({ followUpWillingness: value as FollowUpWillingness })}
          className="space-y-3"
        >
          {FOLLOW_UP_WILLINGNESS_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`followup-${option.value}`}
              />
              <Label 
                htmlFor={`followup-${option.value}`} 
                className="cursor-pointer flex items-center gap-2"
              >
                {option.label}
                {option.value === 'personal-outreach' && (
                  <Badge variant="outline" className="text-xs border-purple-500 text-purple-600">
                    Highest conversion
                  </Badge>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Other follow-up input */}
        {data.followUpWillingness === 'other' && (
          <div className="mt-3">
            <Label htmlFor="other-followup" className="text-sm">
              Describe your follow-up approach
            </Label>
            <Input
              id="other-followup"
              value={data.otherFollowUpWillingness || ''}
              onChange={(e) => onChange({ otherFollowUpWillingness: e.target.value })}
              placeholder="e.g., Survey non-buyers, offer a smaller entry point..."
              className="mt-1"
            />
          </div>
        )}

        {data.followUpWillingness === 'unsure' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Normal!</strong> A good baseline is 2-3 emails after cart closes. 
              One "last chance" email, one addressing common objections, and one asking for feedback.
            </p>
          </div>
        )}

        {data.followUpWillingness === 'personal-outreach' && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>High-touch approach!</strong> We'll add daily outreach tasks. 
              Focus on people who clicked but didn't buy, or who replied with questions.
            </p>
          </div>
        )}

        {data.followUpWillingness === 'none-planned' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-950/30 rounded-lg border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-800 dark:text-gray-200">
              <strong>One-and-done approach.</strong> That's okay! Some launches are designed to be clean breaks. We'll skip the follow-up tasks and focus on the debrief instead.
            </p>
          </div>
        )}

        {/* Task count preview */}
        {getFollowUpTaskCount() > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm">
              📋 Follow-up tasks we'll create: <strong>{getFollowUpTaskCount()}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Debrief Date */}
      <div className="space-y-3">
        <Label htmlFor="debrief-date" className="text-lg font-semibold">
          When will you do your launch debrief?
        </Label>
        <p className="text-sm text-muted-foreground -mt-1">
          Schedule time to review what worked and what didn't. Usually 2-5 days after cart closes.
        </p>
        <Input
          id="debrief-date"
          type="date"
          value={data.debriefDate}
          onChange={(e) => onChange({ debriefDate: e.target.value })}
          className="w-48"
        />
        {data.cartClosesDate && !data.debriefDate && (
          <p className="text-xs text-muted-foreground">
            💡 Suggestion: {(() => {
              const closeDate = new Date(data.cartClosesDate);
              closeDate.setDate(closeDate.getDate() + 3);
              return closeDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            })()}
          </p>
        )}
      </div>

      {/* Post-Launch Summary */}
      {data.promotionDuration && data.followUpWillingness && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Your post-launch plan:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {data.promotionDuration === 'ongoing' ? 'Ongoing sales (no hard deadline)' : 
                    `${data.promotionDuration.replace('-', ' ')} promotion period`}</li>
              <li>• {getFollowUpTaskCount()} follow-up task{getFollowUpTaskCount() !== 1 ? 's' : ''}</li>
              {data.debriefDate && <li>• Debrief scheduled for {new Date(data.debriefDate).toLocaleDateString()}</li>}
              <li>• Automatic "What's next?" planning task</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
