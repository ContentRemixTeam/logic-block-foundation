import { useMemo } from 'react';
import { format, parseISO, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ListTodo, AlertTriangle, Sun, Sunrise, Calendar, Clock } from 'lucide-react';
import { Task, FilterTab, EnergyLevel } from '../types';
import { TaskCard } from '../TaskCard';

interface TaskListViewProps {
  tasks: Task[];
  activeFilter: FilterTab;
  energyFilter: EnergyLevel[];
  tagsFilter: string[];
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onQuickReschedule: (taskId: string, date: Date | null, status?: string) => void;
}

export function TaskListView({
  tasks,
  activeFilter,
  energyFilter,
  tagsFilter,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onOpenDetail,
  onQuickReschedule,
}: TaskListViewProps) {
  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => !task.is_recurring_parent);

    // Apply energy filter
    if (energyFilter.length > 0) {
      result = result.filter(task => 
        task.energy_level && energyFilter.includes(task.energy_level)
      );
    }

    // Apply tags filter
    if (tagsFilter.length > 0) {
      result = result.filter(task => 
        task.context_tags?.some(tag => tagsFilter.includes(tag))
      );
    }

    return result;
  }, [tasks, energyFilter, tagsFilter]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      unscheduled: [],
      completed: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach(task => {
      if (activeFilter === 'completed') {
        if (task.is_completed) groups.completed.push(task);
        return;
      }

      if (task.is_completed) return;

      if (!task.scheduled_date) {
        groups.unscheduled.push(task);
        return;
      }

      const taskDate = parseISO(task.scheduled_date);

      if (isPast(taskDate) && !isToday(taskDate)) {
        groups.overdue.push(task);
      } else if (isToday(taskDate)) {
        groups.today.push(task);
      } else if (isTomorrow(taskDate)) {
        groups.tomorrow.push(task);
      } else if (isThisWeek(taskDate, { weekStartsOn: 1 })) {
        groups.thisWeek.push(task);
      } else {
        groups.later.push(task);
      }
    });

    return groups;
  }, [filteredTasks, activeFilter]);

  const renderGroup = (
    key: string, 
    title: string, 
    tasks: Task[], 
    icon?: React.ReactNode,
    className?: string
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div key={key} className="mb-6">
        <div className={cn("flex items-center gap-2 mb-3", className)}>
          {icon}
          <h3 className="text-sm font-medium uppercase tracking-wide">{title}</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskCard
              key={task.task_id}
              task={task}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onOpenDetail={onOpenDetail}
              onQuickReschedule={onQuickReschedule}
            />
          ))}
        </div>
      </div>
    );
  };

  const hasNoTasks = Object.values(groupedTasks).every(g => g.length === 0);

  if (hasNoTasks) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          {activeFilter === 'completed' ? (
            <>
              <h3 className="font-medium mb-2">No completed tasks yet</h3>
              <p className="text-muted-foreground text-sm">Complete some tasks and they'll appear here</p>
            </>
          ) : (
            <>
              <h3 className="font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground text-sm">
                Use the quick add above or #task in your scratch pad
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (activeFilter === 'completed') {
    return renderGroup(
      'completed', 
      'Completed', 
      groupedTasks.completed,
      undefined,
      'text-muted-foreground'
    );
  }

  return (
    <div>
      {renderGroup(
        'overdue', 
        'Overdue', 
        groupedTasks.overdue,
        <AlertTriangle className="h-4 w-4 text-destructive" />,
        'text-destructive'
      )}
      {renderGroup(
        'today', 
        'Today', 
        groupedTasks.today,
        <Sun className="h-4 w-4 text-warning" />
      )}
      {renderGroup(
        'tomorrow', 
        'Tomorrow', 
        groupedTasks.tomorrow,
        <Sunrise className="h-4 w-4 text-muted-foreground" />
      )}
      {renderGroup(
        'thisWeek', 
        'This Week', 
        groupedTasks.thisWeek,
        <Calendar className="h-4 w-4 text-muted-foreground" />
      )}
      {renderGroup(
        'later', 
        'Later', 
        groupedTasks.later,
        <Calendar className="h-4 w-4 text-muted-foreground" />
      )}
      {renderGroup(
        'unscheduled', 
        'Unscheduled', 
        groupedTasks.unscheduled,
        <Clock className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
