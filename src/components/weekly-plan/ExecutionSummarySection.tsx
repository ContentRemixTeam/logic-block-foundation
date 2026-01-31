import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, DollarSign, CheckSquare, Activity,
  Flame, CheckCircle2, Circle
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ExecutionSummarySectionProps {
  weekStart: string;
  weekEnd: string;
  contentCreated: {
    platform: string;
    count: number;
  }[];
  offersAndSales: {
    offers_count: number;
    sales_count: number;
    revenue: number;
    streak: number;
  };
  taskExecution: {
    priority_completed: number;
    priority_total: number;
    strategic_completed: number;
    strategic_total: number;
  };
  habitGrid: {
    habitName: string;
    habitId: string;
    days: boolean[];
  }[];
}

export function ExecutionSummarySection({
  contentCreated,
  offersAndSales,
  taskExecution,
  habitGrid,
}: ExecutionSummarySectionProps) {
  const isMobile = useIsMobile();

  const totalContent = contentCreated.reduce((sum, c) => sum + c.count, 0);
  const priorityPercent = taskExecution.priority_total > 0 
    ? Math.round((taskExecution.priority_completed / taskExecution.priority_total) * 100)
    : 0;
  const strategicPercent = taskExecution.strategic_total > 0
    ? Math.round((taskExecution.strategic_completed / taskExecution.strategic_total) * 100)
    : 0;

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}K`;
    return `$${val}`;
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 90) return <Badge className="bg-green-500/10 text-green-600 text-xs">✓</Badge>;
    if (percent >= 70) return <Badge className="bg-orange-500/10 text-orange-500 text-xs">⚠</Badge>;
    return <Badge className="bg-red-500/10 text-red-500 text-xs">✗</Badge>;
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">This Week by the Numbers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"
        )}>
          {/* Content Created */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Content Created
            </div>
            {contentCreated.length > 0 ? (
              <div className="space-y-1">
                {contentCreated.map((c, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="capitalize">{c.platform}</span>
                    <span className="font-medium">{c.count}</span>
                  </div>
                ))}
                <div className="border-t pt-1 mt-1 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>{totalContent}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No content logged</p>
            )}
          </div>

          {/* Offers & Sales */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Offers & Sales
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Offers made</span>
                <span className="font-medium">{offersAndSales.offers_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sales</span>
                <span className="font-medium">{offersAndSales.sales_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Revenue</span>
                <span className="font-medium">{formatCurrency(offersAndSales.revenue)}</span>
              </div>
              {offersAndSales.streak > 0 && (
                <div className="flex items-center gap-1 pt-1 text-orange-500">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-medium">{offersAndSales.streak} day streak</span>
                </div>
              )}
            </div>
          </div>

          {/* Task Execution */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckSquare className="h-4 w-4" />
              Task Execution
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Priority tasks</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {taskExecution.priority_completed}/{taskExecution.priority_total}
                  </span>
                  {taskExecution.priority_total > 0 && getStatusBadge(priorityPercent)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Strategic tasks</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {taskExecution.strategic_completed}/{taskExecution.strategic_total}
                  </span>
                  {taskExecution.strategic_total > 0 && getStatusBadge(strategicPercent)}
                </div>
              </div>
            </div>
          </div>

          {/* Habits */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              Habit Tracking
            </div>
            {habitGrid.length > 0 ? (
              <div className="space-y-2">
                {/* Day labels */}
                <div className="flex gap-1 justify-end pr-1">
                  {dayLabels.map((day, idx) => (
                    <span key={idx} className="text-[10px] text-muted-foreground w-4 text-center">
                      {day}
                    </span>
                  ))}
                </div>
                {/* Habit rows */}
                {habitGrid.slice(0, 3).map((habit) => {
                  const completed = habit.days.filter(Boolean).length;
                  return (
                    <div key={habit.habitId} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1 max-w-[80px]">{habit.habitName}</span>
                      <div className="flex gap-1">
                        {habit.days.map((done, idx) => (
                          done ? (
                            <CheckCircle2 key={idx} className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle key={idx} className="h-4 w-4 text-muted-foreground/30" />
                          )
                        ))}
                      </div>
                    </div>
                  );
                })}
                {habitGrid.length > 3 && (
                  <p className="text-xs text-muted-foreground text-right">
                    +{habitGrid.length - 3} more habits
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No habits tracked</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
