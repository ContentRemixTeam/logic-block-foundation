import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Eye, Heart, DollarSign, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosticScores, FocusArea, FOCUS_AREA_OPTIONS } from '@/types/wizard';
import { determineFocusArea } from '@/lib/wizardHelpers';

interface BusinessDiagnosticProps {
  scores: DiagnosticScores;
  focusArea: FocusArea;
  onScoresChange: (scores: DiagnosticScores) => void;
  onFocusAreaChange: (area: FocusArea) => void;
  className?: string;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Very weak',
  2: 'Weak',
  3: 'Below average',
  4: 'Slightly below',
  5: 'Average',
  6: 'Slightly above',
  7: 'Above average',
  8: 'Strong',
  9: 'Very strong',
  10: 'Excellent',
};

export function BusinessDiagnostic({
  scores,
  focusArea,
  onScoresChange,
  onFocusAreaChange,
  className,
}: BusinessDiagnosticProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const suggestedFocus = determineFocusArea(scores);
  const isOverridden = focusArea !== suggestedFocus;

  const handleScoreChange = (key: keyof DiagnosticScores, value: number) => {
    const newScores = { ...scores, [key]: value };
    onScoresChange(newScores);
    
    // Auto-update focus area if not manually overridden
    if (!isOverridden) {
      onFocusAreaChange(determineFocusArea(newScores));
    }
  };

  const sliders: { key: keyof DiagnosticScores; label: string; question: string; icon: React.ReactNode }[] = [
    {
      key: 'discover',
      label: 'Discover',
      question: 'Do enough people know you exist?',
      icon: <Eye className="h-4 w-4" />,
    },
    {
      key: 'nurture',
      label: 'Nurture',
      question: 'Are you helping people for free effectively?',
      icon: <Heart className="h-4 w-4" />,
    },
    {
      key: 'convert',
      label: 'Convert',
      question: 'Are you making enough offers?',
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate Your Business</CardTitle>
          <CardDescription>
            Be honest—this helps identify where to focus your energy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {sliders.map(slider => (
            <div key={slider.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-muted">
                    {slider.icon}
                  </div>
                  <Label className="font-medium">{slider.label}</Label>
                </div>
                <Badge variant="outline" className="font-mono">
                  {scores[slider.key]}/10
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{slider.question}</p>
              <Slider
                value={[scores[slider.key]]}
                onValueChange={([value]) => handleScoreChange(slider.key, value)}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Not at all</span>
                <span className="font-medium text-foreground">
                  {SCORE_LABELS[scores[slider.key]]}
                </span>
                <span>Absolutely</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={cn(
        'border-2 transition-colors',
        focusArea === 'discover' && 'border-primary/50 bg-primary/5',
        focusArea === 'nurture' && 'border-accent/50 bg-accent/5',
        focusArea === 'convert' && 'border-secondary/50 bg-secondary/5',
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Your Focus Area</span>
            {isOverridden && (
              <Badge variant="secondary">Custom</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Based on your scores, we recommend focusing on:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={focusArea} onValueChange={(v) => onFocusAreaChange(v as FocusArea)}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOCUS_AREA_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {option.value === suggestedFocus && (
                      <Badge variant="secondary" className="text-xs">Suggested</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-sm text-muted-foreground">
            {FOCUS_AREA_OPTIONS.find(o => o.value === focusArea)?.description}
          </p>

          {isOverridden && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onFocusAreaChange(suggestedFocus)}
              className="text-xs"
            >
              Reset to suggested ({suggestedFocus})
            </Button>
          )}
        </CardContent>
      </Card>

      <Collapsible open={showExplanation} onOpenChange={setShowExplanation}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Explain how this works
            </span>
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              showExplanation && 'rotate-180'
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 bg-muted/50">
            <CardContent className="pt-4 text-sm text-muted-foreground space-y-3">
              <p>
                <strong>The Discover-Nurture-Convert Model:</strong> Every business 
                grows through three stages. First, people need to <em>discover</em> you 
                exist. Then you <em>nurture</em> them by providing value. Finally, you 
                <em>convert</em> them into paying customers.
              </p>
              <p>
                Your lowest score indicates your biggest bottleneck. That's where 
                focusing your energy will have the most impact on your business growth.
              </p>
              <p>
                <strong>Be real about it.</strong> Most people overestimate their 
                nurture and convert scores. If you're not making enough sales, the 
                problem is usually earlier in the funnel.
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
