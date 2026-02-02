import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  DollarSign, 
  Target, 
  Calendar, 
  TrendingUp, 
  Pause, 
  Play, 
  Square,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Flame,
  Zap,
  Snowflake,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useActiveSprint, useSprintMutations } from '@/hooks/useActiveSprint';
import { formatCurrency } from '@/types/moneyMomentum';
import { format, parseISO, eachDayOfInterval, isToday, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import { MastermindGate } from '@/components/membership/MastermindGate';

function getRoiIcon(rating: string | null) {
  switch (rating) {
    case 'hot':
      return <Flame className="h-4 w-4 text-orange-500" />;
    case 'warm':
      return <Zap className="h-4 w-4 text-yellow-500" />;
    case 'cold':
      return <Snowflake className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
}

export default function SprintDashboardPage() {
  const { data: sprintData, isLoading } = useActiveSprint();
  const { pauseSprint, resumeSprint, endSprintEarly, updateActionMetrics } = useSprintMutations();
  
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [attempts, setAttempts] = useState('');
  const [responses, setResponses] = useState('');
  const [conversions, setConversions] = useState('');
  const [actionRevenue, setActionRevenue] = useState('');

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (!sprintData) {
    return (
      <Layout>
        <MastermindGate>
          <div className="text-center py-12">
            <div className="h-20 w-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <DollarSign className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Active Sprint</h2>
            <p className="text-muted-foreground mb-4">
              Start a Money Momentum sprint to track your revenue progress.
            </p>
            <Button asChild>
              <Link to="/wizards/money-momentum">Start a Sprint</Link>
            </Button>
          </div>
        </MastermindGate>
      </Layout>
    );
  }

  const { 
    sprint, 
    dailyProgress,
    actionMetrics,
    currentDay, 
    totalDays, 
    daysRemaining,
    totalRevenue,
    dailyTarget, 
    percentComplete,
  } = sprintData;

  const isPaused = sprint.status === 'paused';
  const revenueGoal = sprint.gap_to_close || 0;
  const selectedActions = (sprint.selected_actions as any[]) || [];

  // Build daily progress data for chart
  const startDate = parseISO(sprint.sprint_start_date!);
  const endDate = parseISO(sprint.sprint_end_date!);
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  const dailyData = allDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const progress = dailyProgress.find(p => p.date === dateStr);
    return {
      date: day,
      dateStr,
      revenue: progress?.actual_revenue || 0,
      hitTarget: progress?.hit_target || false,
      target: dailyTarget,
    };
  });

  // Average daily revenue
  const daysWithRevenue = dailyData.filter(d => d.revenue > 0);
  const avgDailyRevenue = daysWithRevenue.length > 0 
    ? daysWithRevenue.reduce((sum, d) => sum + d.revenue, 0) / daysWithRevenue.length
    : 0;

  const handleUpdateMetrics = async () => {
    if (!selectedAction) return;
    
    await updateActionMetrics.mutateAsync({
      sprintId: sprint.id,
      actionName: selectedAction.action,
      attempts: parseInt(attempts) || 0,
      responses: parseInt(responses) || 0,
      conversions: parseInt(conversions) || 0,
      revenue: parseFloat(actionRevenue) || 0,
    });
    
    setMetricsDialogOpen(false);
    setSelectedAction(null);
    setAttempts('');
    setResponses('');
    setConversions('');
    setActionRevenue('');
  };

  const openMetricsDialog = (action: any) => {
    const existing = actionMetrics.find(m => m.action_name === action.action);
    setSelectedAction(action);
    setAttempts(existing?.attempts?.toString() || '');
    setResponses(existing?.responses?.toString() || '');
    setConversions(existing?.conversions?.toString() || '');
    setActionRevenue(existing?.revenue_generated?.toString() || '');
    setMetricsDialogOpen(true);
  };

  return (
    <Layout>
      <MastermindGate>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Sprint Dashboard</h1>
                <p className="text-muted-foreground">
                  {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Badge 
              variant={isPaused ? "destructive" : "default"}
              className={isPaused ? "" : "bg-emerald-500"}
            >
              {isPaused ? "Paused" : `Day ${currentDay} of ${totalDays}`}
            </Badge>
          </div>

          {/* Pause Banner */}
          {isPaused && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Pause className="h-4 w-4 text-amber-500" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Sprint paused on {sprint.paused_at ? format(parseISO(sprint.paused_at), 'MMM d') : 'recently'}.
                  {sprint.pause_reason && ` Reason: ${sprint.pause_reason}`}
                </span>
                <Button 
                  size="sm" 
                  onClick={() => resumeSprint.mutate(sprint.id)}
                  disabled={resumeSprint.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Resume Sprint
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(revenueGoal)}</div>
                <Progress value={percentComplete} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{percentComplete}% complete</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(revenueGoal - totalRevenue)} remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dailyTarget)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {formatCurrency(avgDailyRevenue)}/day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Days Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysRemaining}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentDay} days completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 overflow-x-auto pb-2">
                {dailyData.map((day, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col items-center min-w-[40px]",
                      isToday(day.date) && "ring-2 ring-primary rounded-lg"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                        day.hitTarget && "bg-emerald-500 text-white",
                        !day.hitTarget && day.revenue > 0 && "bg-amber-500 text-white",
                        !day.hitTarget && day.revenue === 0 && isPast(day.date) && !isToday(day.date) && "bg-muted",
                        isFuture(day.date) && "border border-dashed"
                      )}
                    >
                      {day.hitTarget ? <CheckCircle2 className="h-4 w-4" /> : 
                       day.revenue > 0 ? `$${Math.round(day.revenue)}` :
                       isPast(day.date) && !isToday(day.date) ? <XCircle className="h-3 w-3 text-muted-foreground" /> : 
                       format(day.date, 'd')}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {format(day.date, 'EEE')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" /> Hit target
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500" /> Some revenue
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-muted" /> Missed
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Action Performance
              </CardTitle>
              <CardDescription>
                Track metrics for each revenue action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedActions.map((action: any, i: number) => {
                  const metrics = actionMetrics.find(m => m.action_name === action.action);
                  const roi = metrics?.roi_rating;
                  
                  return (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getRoiIcon(roi)}
                        <div>
                          <p className="font-medium">{action.action}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Attempts: {metrics?.attempts || 0}</span>
                            <span>Conversions: {metrics?.conversions || 0}</span>
                            <span>Revenue: {formatCurrency(metrics?.revenue_generated || 0)}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openMetricsDialog(action)}
                      >
                        Update
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sprint Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Sprint Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              {!isPaused && (
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => pauseSprint.mutate({ sprintId: sprint.id })}
                  disabled={pauseSprint.isPending}
                >
                  <Pause className="h-4 w-4" />
                  Pause Sprint
                </Button>
              )}
              <Button 
                variant="outline" 
                className="gap-2 text-destructive"
                onClick={() => endSprintEarly.mutate(sprint.id)}
                disabled={endSprintEarly.isPending}
              >
                <Square className="h-4 w-4" />
                End Sprint Early
              </Button>
            </CardContent>
          </Card>

          {/* Metrics Dialog */}
          <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Metrics</DialogTitle>
                <DialogDescription>
                  Track performance for: {selectedAction?.action}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="attempts">How many times did you attempt this?</Label>
                  <Input
                    id="attempts"
                    type="number"
                    value={attempts}
                    onChange={(e) => setAttempts(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="responses">How many responded/engaged?</Label>
                  <Input
                    id="responses"
                    type="number"
                    value={responses}
                    onChange={(e) => setResponses(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="conversions">How many bought?</Label>
                  <Input
                    id="conversions"
                    type="number"
                    value={conversions}
                    onChange={(e) => setConversions(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="action-revenue">Revenue from this action</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="action-revenue"
                      type="number"
                      value={actionRevenue}
                      onChange={(e) => setActionRevenue(e.target.value)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMetricsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateMetrics}
                  disabled={updateActionMetrics.isPending}
                >
                  {updateActionMetrics.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Metrics
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MastermindGate>
    </Layout>
  );
}
