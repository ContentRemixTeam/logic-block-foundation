import { useEffect } from 'react';
import { StepProps } from '../CycleWizardTypes';
import { calculateFocusArea } from '../CycleWizardData';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, DollarSign, Target, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const FUNNEL_STAGES = [
  {
    key: 'discover' as const,
    label: 'Discover',
    icon: Eye,
    question: 'How easily do people find you?',
    description: 'Visibility, reach, and new eyeballs on your content',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'nurture' as const,
    label: 'Nurture',
    icon: Heart,
    question: 'How well do you convert followers to fans?',
    description: 'Trust-building, engagement, and relationship depth',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    key: 'convert' as const,
    label: 'Convert',
    icon: DollarSign,
    question: 'How confidently do you make offers?',
    description: 'Sales skills, offer clarity, and closing ability',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

export function StepDiagnostic({ data, setData }: StepProps) {
  // Auto-calculate focus area when scores change
  useEffect(() => {
    const focusArea = calculateFocusArea(data.discoverScore, data.nurtureScore, data.convertScore);
    if (focusArea !== data.focusArea) {
      setData({ focusArea });
    }
  }, [data.discoverScore, data.nurtureScore, data.convertScore, data.focusArea, setData]);

  const getScoreLabel = (score: number) => {
    if (score <= 3) return 'Needs work';
    if (score <= 6) return 'Getting there';
    if (score <= 8) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-6">
      {/* Teaching Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">The Business Funnel</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            Every business moves people through three stages:{' '}
            <span className="font-medium text-blue-500">Discover</span> →{' '}
            <span className="font-medium text-purple-500">Nurture</span> →{' '}
            <span className="font-medium text-green-500">Convert</span>. 
            Rate yourself honestly to find where to focus this quarter.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Sliders */}
      <div className="space-y-8">
        {FUNNEL_STAGES.map((stage) => {
          const scoreKey = `${stage.key}Score` as 'discoverScore' | 'nurtureScore' | 'convertScore';
          const score = data[scoreKey];
          const Icon = stage.icon;
          const isLowest = data.focusArea === stage.key;

          return (
            <div
              key={stage.key}
              className={cn(
                'p-4 rounded-lg transition-colors',
                isLowest ? stage.bgColor : 'bg-muted/30'
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', stage.bgColor)}>
                  <Icon className={cn('h-5 w-5', stage.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-base font-medium">{stage.label}</Label>
                    {isLowest && (
                      <Badge variant="secondary" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        Focus Area
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{stage.question}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Slider
                  value={[score]}
                  onValueChange={([value]) => setData({ [scoreKey]: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="touch-action-manipulation"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{stage.description}</span>
                  <span className={cn('text-sm font-medium', stage.color)}>
                    {score}/10 • {getScoreLabel(score)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Focus Area Summary */}
      {data.focusArea && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <p className="font-medium">
                Your focus this quarter:{' '}
                <span className="text-primary capitalize">{data.focusArea}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              We'll prioritize metrics and strategies that improve your {data.focusArea} skills.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
