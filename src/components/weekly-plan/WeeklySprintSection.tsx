import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { ActiveSprintData } from '@/hooks/useActiveSprint';
import { formatCurrency } from '@/types/moneyMomentum';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInDays } from 'date-fns';

interface WeeklySprintSectionProps {
  sprintData: ActiveSprintData;
}

export function WeeklySprintSection({ sprintData }: WeeklySprintSectionProps) {
  const { 
    sprint, 
    dailyProgress,
    currentDay, 
    totalDays, 
    daysRemaining,
    totalRevenue,
    dailyTarget, 
    percentComplete,
  } = sprintData;

  const revenueGoal = sprint.gap_to_close || 0;

  // Calculate this week's stats
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const thisWeekProgress = dailyProgress.filter(p => {
    const date = parseISO(p.date);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  });

  const weekRevenue = thisWeekProgress.reduce((sum, p) => sum + (p.actual_revenue || 0), 0);
  const weekTarget = dailyTarget * 7; // Simplified weekly target
  const weekPercentage = weekTarget > 0 ? Math.round((weekRevenue / weekTarget) * 100) : 0;

  // On track calculation
  const sprintStart = parseISO(sprint.sprint_start_date!);
  const expectedDays = differenceInDays(today, sprintStart) + 1;
  const expectedRevenue = dailyTarget * expectedDays;
  const isOnTrack = totalRevenue >= expectedRevenue * 0.8; // Within 80% of expected

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            Revenue Sprint Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                isOnTrack 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              )}
            >
              {isOnTrack ? '✅ On Track' : '⚠️ Behind Pace'}
            </Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sprint-dashboard">Full Dashboard</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sprint Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              This Week
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(weekRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {formatCurrency(weekTarget)}
            </p>
          </div>
          
          <div className="p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Sprint Total
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Goal: {formatCurrency(revenueGoal)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Day {currentDay} of {totalDays}
            </span>
            <span className="font-medium text-emerald-600">
              {percentComplete}% to goal
            </span>
          </div>
          <Progress value={percentComplete} className="h-2" />
        </div>

        {/* Week Summary */}
        {thisWeekProgress.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {thisWeekProgress.length} days logged this week
            </span>
            {weekPercentage >= 100 && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                Week target hit! 🎉
              </Badge>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
          <span className="text-muted-foreground">
            {daysRemaining} days remaining in sprint
          </span>
          <span className="font-medium">
            Daily target: {formatCurrency(dailyTarget)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
