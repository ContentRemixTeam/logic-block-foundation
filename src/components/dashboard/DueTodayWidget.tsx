import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { CalendarCheck, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DueTodayWidget() {
  const { data: allTasks = [], isLoading } = useTasks();
  const { toggleComplete } = useTaskMutations();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Get tasks due/scheduled/planned for today
  const dueTodayTasks = useMemo(() => {
    return allTasks
      .filter(task => {
        if (task.is_recurring_parent) return false;
        
        // Check scheduled_date or planned_day
        return task.scheduled_date === todayStr || task.planned_day === todayStr;
      })
      .sort((a, b) => {
        // Completed tasks at bottom
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }
        // Then by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        return aPriority - bPriority;
      })
      .slice(0, 5);
  }, [allTasks, todayStr]);

  const completedCount = dueTodayTasks.filter(t => t.is_completed).length;
  const totalCount = dueTodayTasks.length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (dueTodayTasks.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="h-12 w-12 rounded-full bg-green-500/10 mx-auto flex items-center justify-center mb-3">
          <CalendarCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-sm text-muted-foreground">Nothing due today!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {dueTodayTasks.map((task) => (
          <div 
            key={task.task_id}
            className={cn(
              "flex items-start gap-2 p-2 rounded-lg transition-colors",
              task.is_completed 
                ? "bg-green-500/5" 
                : "bg-muted/30 hover:bg-muted/50"
            )}
          >
            <Checkbox
              checked={task.is_completed}
              onCheckedChange={() => toggleComplete.mutate({ taskId: task.task_id })}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm leading-tight",
                task.is_completed && "line-through text-muted-foreground"
              )}>
                {task.task_text}
              </p>
              {task.time_block_start && (
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.time_block_start}
                </div>
              )}
            </div>
            {task.priority === 'high' && !task.is_completed && (
              <Badge variant="destructive" className="text-xs px-1.5 h-5">
                !
              </Badge>
            )}
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" className="w-full gap-2 group" asChild>
        <Link to="/daily-plan">
          View daily plan
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  );
}
