import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccuracyMetrics } from '@/hooks/useTimeAnalytics';

interface TimeAccuracyCardProps {
  metrics: AccuracyMetrics;
}

export function TimeAccuracyCard({ metrics }: TimeAccuracyCardProps) {
  const {
    overall_accuracy_percent,
    tendency,
    tendency_percent,
    best_estimated_tag,
    best_estimated_accuracy,
    worst_estimated_tag,
    worst_estimated_accuracy,
  } = metrics;

  const hasData = overall_accuracy_percent !== null;

  const getAccuracyColor = (accuracy: number | null) => {
    if (accuracy === null) return 'text-muted-foreground';
    if (accuracy >= 80) return 'text-success';
    if (accuracy >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getTendencyIcon = () => {
    if (tendency === 'underestimate') return <TrendingDown className="h-4 w-4 text-warning" />;
    if (tendency === 'overestimate') return <TrendingUp className="h-4 w-4 text-primary" />;
    return <Target className="h-4 w-4 text-success" />;
  };

  const getTendencyMessage = () => {
    if (tendency === 'underestimate') {
      return `You tend to underestimate by ~${tendency_percent}%`;
    }
    if (tendency === 'overestimate') {
      return `You tend to overestimate by ~${tendency_percent}%`;
    }
    return 'Your estimates are accurate!';
  };

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Estimation Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete tasks with time tracking to see your estimation accuracy.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Estimation Accuracy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main accuracy score */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "text-4xl font-bold",
            getAccuracyColor(overall_accuracy_percent)
          )}>
            {overall_accuracy_percent}%
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm">
              {getTendencyIcon()}
              <span>{getTendencyMessage()}</span>
            </div>
            {tendency !== 'accurate' && (
              <p className="text-xs text-muted-foreground mt-1">
                Consider adding a {tendency_percent}% buffer to your estimates.
              </p>
            )}
          </div>
        </div>

        {/* Best and worst categories */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {best_estimated_tag && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Best estimated</p>
              <p className="text-sm font-medium capitalize">{best_estimated_tag}</p>
              <p className={cn("text-xs", getAccuracyColor(best_estimated_accuracy))}>
                {best_estimated_accuracy}% accurate
              </p>
            </div>
          )}
          {worst_estimated_tag && worst_estimated_tag !== best_estimated_tag && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Needs improvement
              </p>
              <p className="text-sm font-medium capitalize">{worst_estimated_tag}</p>
              <p className={cn("text-xs", getAccuracyColor(worst_estimated_accuracy))}>
                {worst_estimated_accuracy}% accurate
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
