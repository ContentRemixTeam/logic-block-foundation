import { useNavigate } from 'react-router-dom';
import { useLaunchDebrief } from '@/hooks/useLaunchDebrief';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Rocket, TrendingUp, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function LaunchHistoryWidget() {
  const navigate = useNavigate();
  const { allLaunches, isLoading } = useLaunchDebrief();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            Launch History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allLaunches.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            Launch History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No completed launches yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalRevenue = allLaunches.reduce((sum, l) => sum + (l.debrief?.actual_revenue || 0), 0);
  const totalSales = allLaunches.reduce((sum, l) => sum + (l.debrief?.actual_sales || 0), 0);
  const completedDebriefs = allLaunches.filter(l => l.debrief).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            Launch History
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedDebriefs}/{allLaunches.length} debriefed
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-semibold">${totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Sales</p>
            <p className="text-lg font-semibold">{totalSales}</p>
          </div>
        </div>

        {/* Recent Launches */}
        <div className="space-y-2">
          {allLaunches.slice(0, 3).map((launch) => {
            const hasDebrief = !!launch.debrief;
            const revenueProgress = launch.debrief?.actual_revenue && launch.revenue_goal
              ? Math.min(100, (launch.debrief.actual_revenue / launch.revenue_goal) * 100)
              : 0;

            return (
              <div
                key={launch.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  hasDebrief 
                    ? "bg-card hover:bg-muted/50" 
                    : "bg-accent/5 border-accent/30 hover:bg-accent/10"
                )}
                onClick={() => navigate(`/launch-debrief/${launch.id}`)}
              >
                <div className="flex-shrink-0">
                  {hasDebrief ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-accent" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{launch.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(launch.cart_closes), 'MMM d, yyyy')}
                  </p>
                  {hasDebrief && launch.revenue_goal && (
                    <div className="mt-1.5">
                      <Progress value={revenueProgress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${launch.debrief?.actual_revenue?.toLocaleString() || 0} / ${launch.revenue_goal.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            );
          })}
        </div>

        {allLaunches.length > 3 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground"
            onClick={() => navigate('/launches')}
          >
            View all {allLaunches.length} launches
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
