import { StepProps } from '../CycleWizardTypes';
import { IDENTITY_PROMPTS, FEELING_SUGGESTIONS } from '../CycleWizardData';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, Heart } from 'lucide-react';

export function StepIdentity({ data, setData }: StepProps) {
  const toggleFeeling = (feeling: string) => {
    const current = data.targetFeeling;
    if (current === feeling) {
      setData({ targetFeeling: '' });
    } else {
      setData({ targetFeeling: feeling });
    }
  };

  return (
    <div className="space-y-6">
      {/* Teaching Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Identity-Based Goals</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            "Every action you take is a vote for the type of person you wish to become." — James Clear.
            When you anchor to who you're becoming, goals feel like self-expression rather than hard work.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Identity Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identity" className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Who do you need to become to achieve this goal?
          </Label>
          <Textarea
            id="identity"
            value={data.identity}
            onChange={(e) => setData({ identity: e.target.value })}
            placeholder="e.g., Someone who shows up consistently and trusts the process..."
            className="min-h-[100px] text-base resize-none"
            maxLength={300}
          />
          <div className="flex flex-wrap gap-2">
            {IDENTITY_PROMPTS.map((prompt) => (
              <Badge
                key={prompt}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                onClick={() => setData({ identity: prompt })}
              >
                {prompt}
              </Badge>
            ))}
          </div>
        </div>

        {/* Feeling Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            How do you want to feel at the end of 90 days?
          </Label>
          <div className="flex flex-wrap gap-2">
            {FEELING_SUGGESTIONS.map((feeling) => (
              <Badge
                key={feeling}
                variant={data.targetFeeling === feeling ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
                onClick={() => toggleFeeling(feeling)}
              >
                {feeling}
              </Badge>
            ))}
          </div>
          {data.targetFeeling && (
            <p className="text-sm text-muted-foreground">
              You want to feel <span className="font-medium text-primary">{data.targetFeeling}</span> at the end of this cycle.
            </p>
          )}
        </div>
      </div>

      {/* Preview */}
      {data.identity && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4">
            <p className="text-lg font-medium italic text-center">
              "I am becoming {data.identity}"
            </p>
            {data.targetFeeling && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                And I will feel {data.targetFeeling}.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
