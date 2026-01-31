import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Sparkles, Flame, Users, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface FocusAreaDeepDiveProps {
  focusArea: 'discover' | 'nurture' | 'convert' | null;
  weekNumber: number;
  focusActions: {
    title: string;
    completed: boolean;
  }[];
  focusMetrics: {
    name: string;
    current: number | null;
    previous: number | null;
    trend: 'up' | 'down' | 'stable';
  }[];
  progressRating: number | null;
  confidenceRating: number | null;
  progressWhy: string;
  onProgressRatingChange: (value: number | null) => void;
  onConfidenceRatingChange: (value: number | null) => void;
  onProgressWhyChange: (value: string) => void;
}

export function FocusAreaDeepDiveSection({
  focusArea,
  weekNumber,
  focusMetrics,
  progressRating,
  confidenceRating,
  progressWhy,
  onProgressRatingChange,
  onConfidenceRatingChange,
  onProgressWhyChange,
}: FocusAreaDeepDiveProps) {
  const isMobile = useIsMobile();

  if (!focusArea) return null;

  const focusConfig: Record<string, { label: string; icon: typeof Sparkles; color: string }> = {
    discover: { label: 'DISCOVER', icon: Sparkles, color: 'text-blue-600' },
    nurture: { label: 'NURTURE', icon: Flame, color: 'text-primary' },
    convert: { label: 'CONVERT', icon: Users, color: 'text-green-600' },
  };

  const config = focusConfig[focusArea.toLowerCase()] || focusConfig.nurture;
  const Icon = config.icon;

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Determine data assessment
  const upCount = focusMetrics.filter(m => m.trend === 'up').length;
  const downCount = focusMetrics.filter(m => m.trend === 'down').length;
  const totalMetrics = focusMetrics.length;

  let dataAssessment: 'working' | 'not_working' | 'mixed' = 'mixed';
  if (totalMetrics > 0) {
    if (upCount > totalMetrics / 2) dataAssessment = 'working';
    else if (downCount > totalMetrics / 2) dataAssessment = 'not_working';
  }

  // The Gap messaging for weeks 3-4
  const isInTheGap = weekNumber >= 3 && weekNumber <= 4;
  const showGapWarning = isInTheGap && confidenceRating !== null && confidenceRating < 6;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", config.color)} />
          <CardTitle className="text-lg">Your Focus: {config.label}</CardTitle>
          <Badge variant="outline" className="ml-auto text-xs">
            Week {weekNumber}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Rating */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            How would you rate your progress on {config.label} this week?
          </Label>
          <div className="space-y-2">
            <Slider
              value={progressRating !== null ? [progressRating] : [5]}
              onValueChange={(values) => onProgressRatingChange(values[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>No progress</span>
              <span className="font-medium text-foreground">
                {progressRating ?? '—'}/10
              </span>
              <span>Great progress</span>
            </div>
          </div>
        </div>

        {/* Why This Rating */}
        <div className="space-y-2">
          <Label htmlFor="progress-why" className="text-sm font-medium">
            Why this rating?
          </Label>
          <Textarea
            id="progress-why"
            value={progressWhy}
            onChange={(e) => onProgressWhyChange(e.target.value)}
            placeholder="What contributed to or held back your progress?"
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Focus Metrics */}
        {focusMetrics.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {config.label} Data
              </Label>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  dataAssessment === 'working' && "bg-green-500/10 text-green-600",
                  dataAssessment === 'not_working' && "bg-red-500/10 text-red-500",
                  dataAssessment === 'mixed' && "bg-orange-500/10 text-orange-500"
                )}
              >
                {dataAssessment === 'working' && '✓ Trending Up'}
                {dataAssessment === 'not_working' && '✗ Trending Down'}
                {dataAssessment === 'mixed' && '→ Mixed'}
              </Badge>
            </div>
            <div className={cn(
              "grid gap-2",
              isMobile ? "grid-cols-1" : "grid-cols-2"
            )}>
              {focusMetrics.map((metric, idx) => (
                <div key={idx} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm">{metric.name}</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(metric.trend)}
                    <span className="font-medium">{metric.current ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Rating */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-sm font-medium">
            How confident are you that {config.label} is the right focus?
          </Label>
          <div className="space-y-2">
            <Slider
              value={confidenceRating !== null ? [confidenceRating] : [5]}
              onValueChange={(values) => onConfidenceRatingChange(values[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Wrong focus</span>
              <span className="font-medium text-foreground">
                {confidenceRating ?? '—'}/10
              </span>
              <span>Right focus</span>
            </div>
          </div>
        </div>

        {/* The Gap Warning */}
        {showGapWarning && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-orange-600">You're in THE GAP (Week {weekNumber})</p>
                <p className="text-sm text-muted-foreground">
                  Weeks 3-4 are when self-doubt peaks. This is expected and normal. 
                  Your strategy isn't broken — your belief is being tested.
                </p>
                <p className="text-sm font-medium">
                  Recommendation: Keep your focus on {config.label} until Week 6, then reassess with real data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Assessment */}
        {totalMetrics > 0 && confidenceRating !== null && (
          <div className={cn(
            "rounded-lg p-4 border",
            dataAssessment === 'working' && confidenceRating >= 6
              ? "bg-green-500/5 border-green-500/20"
              : "bg-muted/30 border-border"
          )}>
            {dataAssessment === 'working' && confidenceRating >= 6 && (
              <p className="text-sm">
                ✓ <span className="font-medium">Your data and instincts align.</span> Keep executing on {config.label}.
              </p>
            )}
            {dataAssessment === 'working' && confidenceRating < 6 && !showGapWarning && (
              <p className="text-sm">
                Your data shows {config.label} is improving, but you feel uncertain. 
                This might be a mindset block, not a strategy issue.
              </p>
            )}
            {dataAssessment === 'not_working' && confidenceRating >= 6 && (
              <p className="text-sm">
                Your intuition is strong, but your metrics aren't supporting it yet. 
                Consider if you need more time or a slight adjustment.
              </p>
            )}
            {dataAssessment === 'not_working' && confidenceRating < 6 && !showGapWarning && (
              <p className="text-sm">
                Both data and feeling suggest {config.label} needs attention. 
                At Week 6, we'll have enough data to make a strategic decision.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
