import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Target, Brain, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AlignmentCheckSectionProps {
  cycleGoal: string;
  focusArea?: string | null;
  alignmentReflection: string;
  alignmentRating: number | null;
  onReflectionChange: (value: string) => void;
  onRatingChange: (value: number | null) => void;
  // Enhanced props
  previousCTFARSession?: {
    thought: string;
    date: string;
  } | null;
  weeklyAlignmentAverage?: number | null;
  onOpenCTFAR?: () => void;
  celebrationText?: string;
  onCelebrationTextChange?: (value: string) => void;
}

export function AlignmentCheckSection({
  cycleGoal,
  focusArea,
  alignmentReflection,
  alignmentRating,
  onReflectionChange,
  onRatingChange,
  previousCTFARSession,
  weeklyAlignmentAverage,
  onOpenCTFAR,
  celebrationText,
  onCelebrationTextChange,
}: AlignmentCheckSectionProps) {
  const isMobile = useIsMobile();
  const [ctfarFeedback, setCTFARFeedback] = useState<'yes' | 'somewhat' | 'no' | null>(null);

  // Determine if low alignment (1-6) or high (7-10)
  const isLowAlignment = alignmentRating !== null && alignmentRating <= 6;
  const isHighAlignment = alignmentRating !== null && alignmentRating >= 7;

  const getRatingLabel = (rating: number | null): string => {
    if (rating === null) return 'Rate your alignment';
    if (rating <= 2) return 'Off track';
    if (rating <= 4) return 'Struggled';
    if (rating <= 6) return 'Okay';
    if (rating <= 8) return 'Good';
    return 'Excellent';
  };

  const getRatingColor = (rating: number | null): string => {
    if (rating === null) return 'text-muted-foreground';
    if (rating <= 3) return 'text-red-500';
    if (rating <= 6) return 'text-orange-500';
    return 'text-green-600';
  };

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          <CardTitle className="text-lg">90-Day Alignment Check</CardTitle>
        </div>
        <CardDescription>
          Reflect on how your actions this week supported your quarterly goal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Goal Reminder */}
        {cycleGoal && (
          <div className="bg-muted/50 rounded-md p-3 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Your 90-Day Goal
            </p>
            <p className="text-sm font-medium">{cycleGoal}</p>
            {focusArea && (
              <p className="text-xs text-muted-foreground mt-1">
                Focus Area: <span className="capitalize font-medium">{focusArea}</span>
              </p>
            )}
          </div>
        )}

        {/* Weekly Alignment Average */}
        {weeklyAlignmentAverage !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Daily alignment average this week:</span>
            <span className={cn(
              "font-medium",
              getRatingColor(weeklyAlignmentAverage)
            )}>
              {weeklyAlignmentAverage}/10
            </span>
          </div>
        )}

        {/* Alignment Rating Slider (1-10) */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            How aligned were your actions with this goal?
          </Label>
          <div className="space-y-2">
            <Slider
              value={alignmentRating !== null ? [alignmentRating] : [5]}
              onValueChange={(values) => onRatingChange(values[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not aligned</span>
              <span className={cn(
                "font-medium text-base",
                getRatingColor(alignmentRating)
              )}>
                {alignmentRating ?? '—'}/10 · {getRatingLabel(alignmentRating)}
              </span>
              <span>Fully aligned</span>
            </div>
          </div>
        </div>

        {/* Previous CTFAR Session Feedback */}
        {previousCTFARSession && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Brain className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">You worked through this belief earlier:</p>
                <p className="text-sm text-muted-foreground italic mt-1">
                  "{previousCTFARSession.thought}"
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Did working through it help?</p>
              <div className={cn(
                "flex gap-2",
                isMobile ? "flex-col" : "flex-row"
              )}>
                {[
                  { value: 'yes' as const, label: 'Yes, it helped' },
                  { value: 'somewhat' as const, label: 'Somewhat' },
                  { value: 'no' as const, label: 'Still stuck' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={ctfarFeedback === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCTFARFeedback(option.value)}
                    className="flex-1"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {ctfarFeedback === 'yes' && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Great! That's real progress in your mindset.
                </p>
              )}
              {(ctfarFeedback === 'somewhat' || ctfarFeedback === 'no') && onOpenCTFAR && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Want to work through it again?
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={onOpenCTFAR}
                    className="gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Self-Coach Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Low Alignment - Offer CTFAR */}
        {isLowAlignment && !previousCTFARSession && onOpenCTFAR && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-600">Low alignment this week</p>
                <p className="text-sm text-muted-foreground mt-1">
                  What got in the way? Let's work through it.
                </p>
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onOpenCTFAR}
              className="w-full gap-2"
            >
              <Brain className="h-4 w-4" />
              Self-Coach Now
            </Button>
          </div>
        )}

        {/* High Alignment - Celebration */}
        {isHighAlignment && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              <p className="font-medium text-green-600">Strong alignment! 🎉</p>
            </div>
            {onCelebrationTextChange && (
              <div className="space-y-2">
                <Label htmlFor="celebration" className="text-sm">
                  What made this week work?
                </Label>
                <Textarea
                  id="celebration"
                  value={celebrationText || ''}
                  onChange={(e) => onCelebrationTextChange(e.target.value)}
                  placeholder="Capture what you'll want to remember..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Reflection Textarea */}
        <div className="space-y-2">
          <Label htmlFor="alignment-reflection" className="text-sm font-medium">
            How did your actions this week support your 90-day goal?
          </Label>
          <Textarea
            id="alignment-reflection"
            value={alignmentReflection}
            onChange={(e) => onReflectionChange(e.target.value)}
            placeholder="Reflect on what you did this week that moved you closer to your quarterly goal. What worked? What could be improved?"
            rows={4}
            className="resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
