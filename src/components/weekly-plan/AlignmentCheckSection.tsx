import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Target, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlignmentCheckSectionProps {
  cycleGoal: string;
  focusArea?: string | null;
  alignmentReflection: string;
  alignmentRating: number | null;
  onReflectionChange: (value: string) => void;
  onRatingChange: (value: number | null) => void;
}

export function AlignmentCheckSection({
  cycleGoal,
  focusArea,
  alignmentReflection,
  alignmentRating,
  onReflectionChange,
  onRatingChange,
}: AlignmentCheckSectionProps) {
  const ratingLabels = [
    { value: 1, label: 'Off track' },
    { value: 2, label: 'Struggled' },
    { value: 3, label: 'Okay' },
    { value: 4, label: 'Good' },
    { value: 5, label: 'Excellent' },
  ];

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
      <CardContent className="space-y-4">
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

        {/* Alignment Rating */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            How aligned were your actions with this goal?
          </Label>
          <div className="flex gap-1">
            {ratingLabels.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onRatingChange(alignmentRating === value ? null : value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 p-2 rounded-md border transition-colors',
                  alignmentRating === value
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border hover:bg-muted/50'
                )}
              >
                <Star
                  className={cn(
                    'h-5 w-5',
                    alignmentRating !== null && value <= alignmentRating
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  )}
                />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

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
