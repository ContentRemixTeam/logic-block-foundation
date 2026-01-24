import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, Calendar } from 'lucide-react';
import { GoalProgress, CycleGoalProgress } from '@/hooks/useFinancialGoals';
import { cn } from '@/lib/utils';

interface GoalProgressCardProps {
  monthlyProgress: GoalProgress | null;
  cycleProgress: CycleGoalProgress | null;
  onSetMonthlyGoal: () => void;
  onStartRecoveryWizard?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusConfig = (status: 'ahead' | 'on-track' | 'behind' | 'critical') => {
  switch (status) {
    case 'ahead':
      return {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
        progressColor: 'bg-emerald-500',
        icon: Sparkles,
        label: 'Ahead of goal!',
      };
    case 'on-track':
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        progressColor: 'bg-blue-500',
        icon: CheckCircle2,
        label: 'On track',
      };
    case 'behind':
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
        progressColor: 'bg-amber-500',
        icon: TrendingUp,
        label: 'Slightly behind',
      };
    case 'critical':
      return {
        color: 'text-rose-600',
        bgColor: 'bg-rose-500/20',
        borderColor: 'border-rose-500/30',
        progressColor: 'bg-rose-500',
        icon: AlertTriangle,
        label: 'Needs attention',
      };
  }
};

export function GoalProgressCard({ 
  monthlyProgress, 
  cycleProgress, 
  onSetMonthlyGoal,
  onStartRecoveryWizard 
}: GoalProgressCardProps) {
  const showRecoveryPrompt = monthlyProgress?.status === 'behind' || 
    monthlyProgress?.status === 'critical' ||
    cycleProgress?.cycleStatus === 'behind' ||
    cycleProgress?.cycleStatus === 'critical';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Monthly Goal */}
      <Card className={cn(
        'relative overflow-hidden',
        monthlyProgress ? getStatusConfig(monthlyProgress.status).borderColor : ''
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Monthly Revenue Goal
            </CardTitle>
            {monthlyProgress && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs',
                  getStatusConfig(monthlyProgress.status).color,
                  getStatusConfig(monthlyProgress.status).bgColor
                )}
              >
                {getStatusConfig(monthlyProgress.status).label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {monthlyProgress ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(monthlyProgress.currentRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    of {formatCurrency(monthlyProgress.revenueGoal)} goal
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {monthlyProgress.revenueProgress.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthlyProgress.daysRemaining} days left
                  </p>
                </div>
              </div>

              <Progress 
                value={monthlyProgress.revenueProgress} 
                className={cn('h-2', getStatusConfig(monthlyProgress.status).progressColor)}
              />

              {monthlyProgress.daysRemaining > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily target to hit goal:</span>
                  <span className={cn('font-medium', getStatusConfig(monthlyProgress.status).color)}>
                    {formatCurrency(monthlyProgress.dailyRevenueNeeded)}/day
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Set a monthly revenue goal to track your progress
              </p>
              <Button onClick={onSetMonthlyGoal} size="sm" className="gap-2">
                <Target className="h-4 w-4" />
                Set Monthly Goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 90-Day Cycle Goal */}
      <Card className={cn(
        'relative overflow-hidden',
        cycleProgress ? getStatusConfig(cycleProgress.cycleStatus).borderColor : ''
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              90-Day Revenue Goal
            </CardTitle>
            {cycleProgress && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs',
                  getStatusConfig(cycleProgress.cycleStatus).color,
                  getStatusConfig(cycleProgress.cycleStatus).bgColor
                )}
              >
                {getStatusConfig(cycleProgress.cycleStatus).label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cycleProgress?.cycleRevenueGoal ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(cycleProgress.cycleCurrentRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    of {formatCurrency(cycleProgress.cycleRevenueGoal)} goal
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {cycleProgress.cycleProgress.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cycleProgress.cycleDaysRemaining} days left
                  </p>
                </div>
              </div>

              <Progress 
                value={cycleProgress.cycleProgress} 
                className={cn('h-2', getStatusConfig(cycleProgress.cycleStatus).progressColor)}
              />

              {cycleProgress.cycleDaysRemaining > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily target to hit goal:</span>
                  <span className={cn('font-medium', getStatusConfig(cycleProgress.cycleStatus).color)}>
                    {formatCurrency(cycleProgress.cycleDailyRevenueNeeded)}/day
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Set up your 90-day cycle to track long-term revenue goals
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Wizard Prompt */}
      {showRecoveryPrompt && onStartRecoveryWizard && (
        <Card className="md:col-span-2 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-amber-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Behind on your goals?</p>
                  <p className="text-sm text-muted-foreground">
                    Let's create an action plan to get back on track
                  </p>
                </div>
              </div>
              <Button onClick={onStartRecoveryWizard} className="gap-2 shrink-0">
                <Sparkles className="h-4 w-4" />
                Start Recovery Wizard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
