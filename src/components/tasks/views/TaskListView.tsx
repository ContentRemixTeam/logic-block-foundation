import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  ListTodo, AlertTriangle, Sun, Sunrise, Calendar, Clock, 
  Inbox, CheckCircle2, ChevronRight, PartyPopper, Plus
} from 'lucide-react';
import { Task, FilterTab, EnergyLevel } from '../types';
import { TaskCard } from '../TaskCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  onAddTask?: () => void;
}

// Empty state component
function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description}
      </p>
      {action && action}
    </div>
  );
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
  onAddTask,
}: TaskListViewProps) {
  const [completedExpanded, setCompletedExpanded] = useState(false);

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
      if (task.is_completed) {
        groups.completed.push(task);
        return;
      }

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
  }, [filteredTasks]);

  const renderGroup = (
    key: string, 
    title: string, 
    tasks: Task[], 
    icon?: React.ReactNode,
    className?: string,
    showRescheduleAll?: boolean
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div key={key} className="space-y-3">
        <div className={cn("flex items-center justify-between", className)}>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold">{title}</h2>
            <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
          </div>
          {showRescheduleAll && tasks.length > 1 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs"
              onClick={() => {
                tasks.forEach(task => {
                  onQuickReschedule(task.task_id, new Date(), 'scheduled');
                });
              }}
            >
              Reschedule All to Today
            </Button>
          )}
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

  // Check if showing completed filter
  if (activeFilter === 'completed') {
    if (groupedTasks.completed.length === 0) {
      return (
        <EmptyState
          icon={CheckCircle2}
          title="No completed tasks yet"
          description="Complete some tasks and they'll appear here for review"
        />
      );
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Completed</h2>
          <Badge variant="outline">{groupedTasks.completed.length}</Badge>
        </div>
        <div className="space-y-2">
          {groupedTasks.completed.map(task => (
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
  }

  // Check for completely empty state
  const hasOpenTasks = groupedTasks.overdue.length > 0 || 
    groupedTasks.today.length > 0 || 
    groupedTasks.tomorrow.length > 0 || 
    groupedTasks.thisWeek.length > 0 || 
    groupedTasks.later.length > 0 || 
    groupedTasks.unscheduled.length > 0;

  if (!hasOpenTasks && groupedTasks.completed.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No tasks yet"
        description="Create your first task to start organizing your work"
        action={onAddTask && (
          <Button onClick={onAddTask}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        )}
      />
    );
  }

  // Filter-specific views
  if (activeFilter === 'today') {
    if (groupedTasks.today.length === 0 && groupedTasks.overdue.length === 0) {
      return (
        <EmptyState
          icon={PartyPopper}
          title="All caught up!"
          description="No tasks due today. Great work! 🎉"
        />
      );
    }
    return (
      <div className="space-y-8">
        {renderGroup(
          'overdue', 
          'Overdue', 
          groupedTasks.overdue,
          <AlertTriangle className="h-5 w-5 text-destructive" />,
          'text-destructive',
          true
        )}
        {renderGroup(
          'today', 
          'Today', 
          groupedTasks.today,
          <Sun className="h-5 w-5 text-amber-500" />
        )}
      </div>
    );
  }

  if (activeFilter === 'week') {
    const weekTasks = [...groupedTasks.today, ...groupedTasks.tomorrow, ...groupedTasks.thisWeek];
    if (weekTasks.length === 0 && groupedTasks.overdue.length === 0) {
      return (
        <EmptyState
          icon={Calendar}
          title="Week looks clear!"
          description="No tasks scheduled for this week"
        />
      );
    }
    return (
      <div className="space-y-8">
        {renderGroup(
          'overdue', 
          'Overdue', 
          groupedTasks.overdue,
          <AlertTriangle className="h-5 w-5 text-destructive" />,
          'text-destructive',
          true
        )}
        {renderGroup(
          'today', 
          'Today', 
          groupedTasks.today,
          <Sun className="h-5 w-5 text-amber-500" />
        )}
        {renderGroup(
          'tomorrow', 
          'Tomorrow', 
          groupedTasks.tomorrow,
          <Sunrise className="h-5 w-5 text-blue-500" />
        )}
        {renderGroup(
          'thisWeek', 
          'This Week', 
          groupedTasks.thisWeek,
          <Calendar className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    );
  }

  // All open tasks view
  return (
    <div className="space-y-8">
      {/* Overdue Section - Always show first with emphasis */}
      {groupedTasks.overdue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Overdue</h2>
              <Badge variant="destructive">{groupedTasks.overdue.length}</Badge>
            </div>
            {groupedTasks.overdue.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs"
                onClick={() => {
                  groupedTasks.overdue.forEach(task => {
                    onQuickReschedule(task.task_id, new Date(), 'scheduled');
                  });
                }}
              >
                Reschedule All to Today
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {groupedTasks.overdue.map(task => (
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
      )}

      {renderGroup(
        'today', 
        'Today', 
        groupedTasks.today,
        <Sun className="h-5 w-5 text-amber-500" />
      )}

      {renderGroup(
        'tomorrow', 
        'Tomorrow', 
        groupedTasks.tomorrow,
        <Sunrise className="h-5 w-5 text-blue-500" />
      )}

      {renderGroup(
        'thisWeek', 
        'This Week', 
        groupedTasks.thisWeek,
        <Calendar className="h-5 w-5 text-muted-foreground" />
      )}

      {renderGroup(
        'later', 
        'Later', 
        groupedTasks.later,
        <Calendar className="h-5 w-5 text-muted-foreground" />
      )}

      {renderGroup(
        'unscheduled', 
        'No Date', 
        groupedTasks.unscheduled,
        <Inbox className="h-5 w-5 text-muted-foreground" />
      )}

      {/* Completed Section - Collapsible at bottom */}
      {groupedTasks.completed.length > 0 && (
        <Collapsible open={completedExpanded} onOpenChange={setCompletedExpanded}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors">
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              completedExpanded && "rotate-90"
            )} />
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold text-muted-foreground">
              Completed
            </span>
            <Badge variant="outline">{groupedTasks.completed.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            {groupedTasks.completed.slice(0, 10).map(task => (
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
            {groupedTasks.completed.length > 10 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                And {groupedTasks.completed.length - 10} more completed tasks...
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
