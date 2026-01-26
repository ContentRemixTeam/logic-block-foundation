import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Minus, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MetricTrend {
  current: number | null;
  previous: number | null;
  start: number | null;
  goal: number | null;
}

interface CycleData {
  cycle_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  metric_1_name?: string | null;
  metric_2_name?: string | null;
  metric_3_name?: string | null;
}

interface WeeklyCycleAnalyticsProps {
  cycle: CycleData | null;
  weekNumber: number;
  metricTrends: {
    metric_1: MetricTrend;
    metric_2: MetricTrend;
    metric_3: MetricTrend;
  } | null;
}

export function WeeklyCycleAnalytics({ 
  cycle, 
  weekNumber, 
  metricTrends 
}: WeeklyCycleAnalyticsProps) {
  if (!cycle) {
    return null;
  }

  const today = new Date();
  const endDate = new Date(cycle.end_date);
  const startDate = new Date(cycle.start_date);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercent = Math.min(100, Math.max(0, ((totalDays - daysRemaining) / totalDays) * 100));

  const metrics = [
    { name: cycle.metric_1_name, trend: metricTrends?.metric_1 },
    { name: cycle.metric_2_name, trend: metricTrends?.metric_2 },
    { name: cycle.metric_3_name, trend: metricTrends?.metric_3 },
  ].filter(m => m.name);

  const getTrendIcon = (trend: MetricTrend) => {
    if (trend.current === null || trend.previous === null) {
      return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
    if (trend.current > trend.previous) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    }
    if (trend.current < trend.previous) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getProgressToGoal = (trend: MetricTrend) => {
    if (trend.start === null || trend.goal === null || trend.current === null) {
      return null;
    }
    const totalNeeded = trend.goal - trend.start;
    if (totalNeeded === 0) return 100;
    const achieved = trend.current - trend.start;
    return Math.min(100, Math.max(0, (achieved / totalNeeded) * 100));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Cycle Analytics</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Week {weekNumber} of 13
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Cycle Progress
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {daysRemaining} days remaining
          </p>
        </div>

        {/* Metric Summary */}
        {metrics.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Key Metrics
            </p>
            <div className="grid gap-2">
              {metrics.map((metric, idx) => {
                if (!metric.trend) return null;
                const progress = getProgressToGoal(metric.trend);
                
                return (
                  <div key={idx} className="bg-muted/30 rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(metric.trend)}
                        <span className="text-sm font-bold">
                          {metric.trend.current ?? '—'}
                        </span>
                      </div>
                    </div>
                    {progress !== null && (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Start: {metric.trend.start}</span>
                          <span>Goal: {metric.trend.goal}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Link to Progress Page */}
        <Link to="/progress">
          <Button variant="outline" size="sm" className="w-full">
            View Full Progress
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
