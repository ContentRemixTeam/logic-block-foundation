import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MetricData {
  name: string | null;
  start: number | null;
  goal: number | null;
  target: number | null; // Weekly target
  actual: number | '';
  previousWeek: number | null;
  current: number | null;
  trend: 'up' | 'down' | 'stable';
  percentChange: number | null;
  history: (number | null)[];
}

interface EnhancedMetricsSectionProps {
  metrics: MetricData[];
  weekNumber: number;
  onMetricChange: (index: number, value: number | '') => void;
}

export function EnhancedMetricsSection({
  metrics,
  weekNumber,
  onMetricChange,
}: EnhancedMetricsSectionProps) {
  const isMobile = useIsMobile();

  const validMetrics = metrics.filter(m => m.name);

  if (validMetrics.length === 0) return null;

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

  const getProgressToGoal = (metric: MetricData): number | null => {
    if (metric.start === null || metric.goal === null || metric.current === null) {
      return null;
    }
    const totalNeeded = metric.goal - metric.start;
    if (totalNeeded === 0) return 100;
    const achieved = metric.current - metric.start;
    return Math.min(100, Math.max(0, (achieved / totalNeeded) * 100));
  };

  const calculateQuarterlyPace = (metric: MetricData): { projected: number; percentOfGoal: number } | null => {
    if (metric.start === null || metric.goal === null || metric.current === null || weekNumber === 0) {
      return null;
    }
    
    const weeksElapsed = weekNumber;
    const weeksRemaining = 13 - weeksElapsed;
    const currentGain = metric.current - metric.start;
    const weeklyRate = currentGain / weeksElapsed;
    const projectedFinal = metric.current + (weeklyRate * weeksRemaining);
    const percentOfGoal = ((projectedFinal - metric.start) / (metric.goal - metric.start)) * 100;
    
    return {
      projected: Math.round(projectedFinal),
      percentOfGoal: Math.min(100, Math.max(0, Math.round(percentOfGoal))),
    };
  };

  const getWeeklyTarget = (metric: MetricData): number | null => {
    if (metric.start === null || metric.goal === null) return null;
    const totalGain = metric.goal - metric.start;
    // Expected value by this week
    return Math.round(metric.start + (totalGain * weekNumber / 13));
  };

  // Mini sparkline component
  const Sparkline = ({ data }: { data: (number | null)[] }) => {
    const validData = data.filter((d): d is number => d !== null);
    if (validData.length < 2) return null;

    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const range = max - min || 1;

    return (
      <div className="flex items-end gap-0.5 h-6">
        {validData.slice(-6).map((val, idx) => {
          const height = ((val - min) / range) * 100;
          return (
            <div
              key={idx}
              className="w-2 bg-primary/60 rounded-t"
              style={{ height: `${Math.max(10, height)}%` }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Metrics - Week {weekNumber}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {weekNumber}/13 weeks
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {validMetrics.map((metric, idx) => {
          const progress = getProgressToGoal(metric);
          const pace = calculateQuarterlyPace(metric);
          const weeklyTarget = getWeeklyTarget(metric);
          const isOnTrack = weeklyTarget !== null && metric.current !== null && metric.current >= weeklyTarget;

          return (
            <div key={idx} className="space-y-4 pb-4 border-b last:border-b-0 last:pb-0">
              {/* Metric Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{metric.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(metric.trend)}
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs",
                      isOnTrack 
                        ? "bg-green-500/10 text-green-600"
                        : "bg-orange-500/10 text-orange-500"
                    )}
                  >
                    {isOnTrack ? 'On Track' : 'Behind'}
                  </Badge>
                </div>
              </div>

              {/* Metric Grid */}
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-1" : "grid-cols-2"
              )}>
                {/* Left: Inputs */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Weekly Target</Label>
                      <p className="text-lg font-bold">{weeklyTarget ?? '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Current Value</Label>
                      <Input
                        type="number"
                        value={metric.actual}
                        onChange={(e) => onMetricChange(idx, e.target.value ? Number(e.target.value) : '')}
                        placeholder="Enter value"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Last week: {metric.previousWeek ?? '—'}</span>
                    {metric.percentChange !== null && (
                      <span className={cn(
                        metric.percentChange > 0 && "text-green-600",
                        metric.percentChange < 0 && "text-red-500"
                      )}>
                        {metric.percentChange > 0 ? '+' : ''}{metric.percentChange}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Progress & Sparkline */}
                <div className="space-y-3">
                  {/* Progress to Goal */}
                  {progress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress to goal</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Start: {metric.start}</span>
                        <span>Goal: {metric.goal}</span>
                      </div>
                    </div>
                  )}

                  {/* Sparkline */}
                  {metric.history.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Trend</span>
                      <Sparkline data={metric.history} />
                    </div>
                  )}
                </div>
              </div>

              {/* Quarterly Pace */}
              {pace && (
                <div className={cn(
                  "rounded-lg p-3 text-sm",
                  pace.percentOfGoal >= 90 
                    ? "bg-green-500/10 border border-green-500/20"
                    : pace.percentOfGoal >= 70
                      ? "bg-orange-500/10 border border-orange-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                )}>
                  <p>
                    <span className="font-medium">Quarterly pace: </span>
                    At current rate, you'll reach {pace.projected} ({pace.percentOfGoal}% of goal)
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Overall Summary */}
        {validMetrics.length > 1 && (
          <div className="bg-muted/30 rounded-lg p-4 border-t">
            <p className="text-sm font-medium mb-2">Quarterly Summary</p>
            <div className="space-y-1">
              {validMetrics.map((metric, idx) => {
                const pace = calculateQuarterlyPace(metric);
                return (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{metric.name}</span>
                    <span className={cn(
                      "font-medium",
                      pace && pace.percentOfGoal >= 90 && "text-green-600",
                      pace && pace.percentOfGoal < 70 && "text-red-500"
                    )}>
                      {pace ? `${pace.percentOfGoal}% on pace` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
