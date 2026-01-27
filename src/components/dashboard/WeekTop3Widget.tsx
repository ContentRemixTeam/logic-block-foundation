import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { ListTodo, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WeekTop3Widget() {
  const { data: allTasks = [], isLoading } = useTasks();
  const { toggleComplete } = useTaskMutations();

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Get top 3 priority tasks for this week (incomplete, scheduled within week)
  const weekTop3 = useMemo(() => {
    return allTasks
      .filter(task => {
        if (task.is_completed || task.is_recurring_parent) return false;
        if (!task.planned_day) return false;
        
        const taskDate = new Date(task.planned_day);
        return taskDate >= weekStart && taskDate <= weekEnd;
      })
      .sort((a, b) => {
        // Sort by priority first (high > medium > low)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Then by day_order
        return (a.day_order || 999) - (b.day_order || 999);
      })
      .slice(0, 3);
  }, [allTasks, weekStart, weekEnd]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (weekTop3.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
          <ListTodo className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-3">No tasks planned this week</p>
        <Button size="sm" variant="outline" className="gap-2 group" asChild>
          <Link to="/weekly-plan">
            Plan Week
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {weekTop3.map((task, index) => (
        <div 
          key={task.task_id}
          className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <Checkbox
            checked={task.is_completed}
            onCheckedChange={() => toggleComplete.mutate(task.task_id)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm leading-tight",
              task.is_completed && "line-through text-muted-foreground"
            )}>
              {task.task_text}
            </p>
            {task.planned_day && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(task.planned_day), 'EEE')}
              </p>
            )}
          </div>
          {task.priority === 'high' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">
              !
            </span>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" className="w-full gap-2 mt-2 group" asChild>
        <Link to="/weekly-plan">
          View all
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  );
}
