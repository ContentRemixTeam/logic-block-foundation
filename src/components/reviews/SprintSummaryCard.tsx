import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { useActiveSprint } from '@/hooks/useActiveSprint';
import { formatCurrency } from '@/types/moneyMomentum';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseISO, differenceInDays } from 'date-fns';

export function SprintSummaryCard() {
  const { data: sprintData, isLoading } = useActiveSprint();

  if (isLoading || !sprintData) {
    return null;
  }

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

  // Calculate on-track status
  const sprintStart = parseISO(sprint.sprint_start_date!);
  const today = new Date();
  const expectedDays = differenceInDays(today, sprintStart) + 1;
  const expectedRevenue = dailyTarget * expectedDays;
  const isOnTrack = totalRevenue >= expectedRevenue * 0.8;

  // Calculate completion stats
  const daysLogged = dailyProgress.filter(p => p.actual_revenue !== null && p.actual_revenue > 0).length;
  const daysHitTarget = dailyProgress.filter(p => (p.actual_revenue || 0) >= dailyTarget).length;

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            Revenue Sprint Summary
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sprint-dashboard">Full Dashboard</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress */}
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Sprint Progress</span>
            <Badge 
              variant="outline" 
              className={cn(
                isOnTrack 
                  ? "bg-emerald-500/10 text-emerald-600" 
                  : "bg-amber-500/10 text-amber-600"
              )}
            >
              {isOnTrack ? 'On Track' : 'Behind Pace'}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-muted-foreground">
              / {formatCurrency(revenueGoal)}
            </span>
          </div>
          <Progress value={percentComplete} className="h-2 mt-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {percentComplete}% of goal achieved
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{currentDay}/{totalDays}</div>
            <p className="text-xs text-muted-foreground">Days</p>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{daysLogged}</div>
            <p className="text-xs text-muted-foreground">Days Logged</p>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
            <div className="text-lg font-bold">{daysHitTarget}</div>
            <p className="text-xs text-muted-foreground">Targets Hit</p>
          </div>
        </div>

        {/* Daily Target */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Daily Target
          </span>
          <span className="font-medium">{formatCurrency(dailyTarget)}</span>
        </div>

        {/* Remaining */}
        {daysRemaining > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            {daysRemaining} days remaining • {formatCurrency(revenueGoal - totalRevenue)} to go
          </div>
        )}
      </CardContent>
    </Card>
  );
}
