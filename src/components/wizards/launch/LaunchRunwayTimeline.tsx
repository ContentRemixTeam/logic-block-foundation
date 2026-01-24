import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Calendar, Lightbulb, Rocket } from 'lucide-react';
import { 
  LaunchWizardData, 
  RUNWAY_WEEKS_OPTIONS, 
  WARM_UP_STRATEGY_OPTIONS,
  WARM_UP_FREQUENCY_OPTIONS 
} from '@/types/launch';
import { format, subWeeks, parseISO } from 'date-fns';
import { useEffect } from 'react';

interface LaunchRunwayTimelineProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchRunwayTimeline({ data, onChange }: LaunchRunwayTimelineProps) {
  // Auto-calculate runway start date when cartOpens or runwayWeeks changes
  useEffect(() => {
    if (data.cartOpens && data.runwayWeeks) {
      const cartOpenDate = parseISO(data.cartOpens);
      const runwayStart = subWeeks(cartOpenDate, data.runwayWeeks);
      onChange({ runwayStartDate: format(runwayStart, 'yyyy-MM-dd') });
    }
  }, [data.cartOpens, data.runwayWeeks]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header context */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Rocket className="h-4 w-4 text-primary" />
            Your Launch Timeline
          </CardTitle>
          <CardDescription>
            Cart opens: <span className="font-medium text-foreground">{formatDisplayDate(data.cartOpens)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.runwayStartDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Runway starts: <span className="font-medium">{formatDisplayDate(data.runwayStartDate)}</span></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Runway weeks selection */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">When Should Your Runway Start?</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Most successful launches have a 4-6 week runway. This is when you start warming up your audience BEFORE announcing the launch.
          </p>
        </div>
        
        <RadioGroup
          value={String(data.runwayWeeks)}
          onValueChange={(value) => onChange({ runwayWeeks: Number(value) as 2 | 4 | 6 | 8 })}
          className="grid gap-3"
        >
          {RUNWAY_WEEKS_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                data.runwayWeeks === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value={String(option.value)} id={`runway-${option.value}`} className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor={`runway-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              {option.value === 4 && (
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              )}
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Why runway matters */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Why a runway matters:</p>
              <p className="text-sm text-muted-foreground">
                People need time to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Realize they have the problem you solve</li>
                <li>Trust you as the solution</li>
                <li>See proof it works</li>
                <li>Get excited about the transformation</li>
                <li>Clear objections before you ask for the sale</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warm-up strategy */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">What's your primary warm-up strategy?</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the main way you'll engage your audience before cart opens.
          </p>
        </div>

        <RadioGroup
          value={data.warmUpStrategy}
          onValueChange={(value) => onChange({ warmUpStrategy: value as LaunchWizardData['warmUpStrategy'] })}
          className="grid gap-3"
        >
          {WARM_UP_STRATEGY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                data.warmUpStrategy === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value={option.value} id={`strategy-${option.value}`} className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor={`strategy-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Frequency */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">How often will you show up?</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Be honest about what you can sustain. Consistency beats intensity.
          </p>
        </div>

        <RadioGroup
          value={data.warmUpFrequency}
          onValueChange={(value) => onChange({ warmUpFrequency: value as LaunchWizardData['warmUpFrequency'] })}
          className="grid grid-cols-2 gap-3"
        >
          {WARM_UP_FREQUENCY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                data.warmUpFrequency === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value={option.value} id={`freq-${option.value}`} className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor={`freq-${option.value}`} className="font-medium cursor-pointer text-sm">
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}