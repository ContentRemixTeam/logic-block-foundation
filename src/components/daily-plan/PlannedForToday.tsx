import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/components/tasks/types';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { Calendar, Clock, Edit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlannedForTodayProps {
  date?: Date;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
}

export function PlannedForToday({ date = new Date(), onTaskToggle }: PlannedForTodayProps) {
  const { data: allTasks = [], isLoading } = useTasks();
  const { toggleComplete } = useTaskMutations();
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const dateDisplay = format(date, 'EEEE, MMMM d');

  // Filter tasks planned for this day from shared data
  const tasks = useMemo(() => {
    return allTasks
      .filter((t: Task) => t.planned_day === dateStr && !t.is_completed && !t.is_recurring_parent)
      .sort((a: Task, b: Task) => (a.day_order || 0) - (b.day_order || 0));
  }, [allTasks, dateStr]);

  const handleToggle = async (taskId: string, currentCompleted: boolean) => {
    toggleComplete.mutate({ taskId });
    
    if (onTaskToggle) {
      onTaskToggle(taskId, currentCompleted);
    }
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return null; // Don't show if no planned tasks
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              📅 {dateDisplay}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} planned • {formatDuration(totalMinutes)} estimated
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/weekly-plan#plan-your-week">
              <Edit className="h-4 w-4 mr-1" />
              Edit in Weekly Plan
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {tasks.map((task) => (
            <div 
              key={task.task_id}
              className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
            >
              <Checkbox
                checked={task.is_completed}
                onCheckedChange={() => handleToggle(task.task_id, task.is_completed)}
              />
              <span className={cn(
                "flex-1 text-sm",
                task.is_completed && "line-through text-muted-foreground"
              )}>
                {task.task_text}
              </span>
              {task.estimated_minutes && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(task.estimated_minutes)}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}