import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from '../TaskCard';
import { Task } from '../types';
import { cn } from '@/lib/utils';
import { 
  Inbox, 
  Zap,
  CalendarDays, 
  CalendarRange,
  CalendarClock,
  CloudSun,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, addWeeks, addMonths } from 'date-fns';

interface TaskKanbanViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onAddTask: () => void;
  onQuickReschedule?: (taskId: string, date: Date | null, status?: string) => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  headerBg: string;
  accentColor: string;
  maxTasks?: number;
}

const columns: KanbanColumn[] = [
  { 
    id: 'unscheduled', 
    title: 'Unscheduled', 
    icon: Inbox, 
    color: 'text-status-unscheduled',
    headerBg: 'bg-gradient-to-r from-muted/40 to-muted/20',
    accentColor: 'border-l-muted-foreground/50'
  },
  { 
    id: 'today', 
    title: 'Today / ASAP', 
    icon: Zap, 
    color: 'text-status-today',
    headerBg: 'bg-gradient-to-r from-status-today/10 to-status-today/5',
    accentColor: 'border-l-status-today',
    maxTasks: 5 
  },
  { 
    id: 'this_week', 
    title: 'This Week', 
    icon: CalendarDays, 
    color: 'text-status-this-week',
    headerBg: 'bg-gradient-to-r from-status-this-week/10 to-status-this-week/5',
    accentColor: 'border-l-status-this-week'
  },
  { 
    id: 'next_week', 
    title: 'Next Week', 
    icon: CalendarRange, 
    color: 'text-status-next-week',
    headerBg: 'bg-gradient-to-r from-status-next-week/10 to-status-next-week/5',
    accentColor: 'border-l-status-next-week'
  },
  { 
    id: 'next_quarter', 
    title: 'Next Quarter', 
    icon: CalendarClock, 
    color: 'text-status-next-quarter',
    headerBg: 'bg-gradient-to-r from-status-next-quarter/10 to-status-next-quarter/5',
    accentColor: 'border-l-status-next-quarter'
  },
  { 
    id: 'someday', 
    title: 'Someday', 
    icon: CloudSun, 
    color: 'text-status-someday',
    headerBg: 'bg-gradient-to-r from-status-someday/10 to-status-someday/5',
    accentColor: 'border-l-status-someday'
  },
];

// Helper to determine which column a task belongs to based on its date
function getTaskColumn(task: Task): string {
  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(thisWeekStart, 1);
  const nextWeekEnd = addWeeks(thisWeekEnd, 1);
  const quarterEnd = addMonths(now, 3);

  // Check for someday status first
  if (task.status === 'someday') {
    return 'someday';
  }

  // Get the effective date (planned_day takes priority, then scheduled_date)
  const dateStr = task.planned_day || task.scheduled_date;
  
  // No date = unscheduled
  if (!dateStr) {
    return 'unscheduled';
  }

  const taskDate = startOfDay(new Date(dateStr));

  // Today
  if (taskDate >= today && taskDate <= todayEnd) {
    return 'today';
  }

  // Past due - show in today
  if (taskDate < today) {
    return 'today';
  }

  // This week (after today)
  if (taskDate > todayEnd && taskDate <= thisWeekEnd) {
    return 'this_week';
  }

  // Next week
  if (taskDate >= nextWeekStart && taskDate <= nextWeekEnd) {
    return 'next_week';
  }

  // Next quarter (anything in the next 3 months after next week)
  if (taskDate > nextWeekEnd && taskDate <= quarterEnd) {
    return 'next_quarter';
  }

  // Beyond next quarter = someday
  return 'someday';
}

// Get the target date for a column drop
function getColumnTargetDate(columnId: string): { date: string | null; status?: string } {
  const now = new Date();
  const today = startOfDay(now);
  
  switch (columnId) {
    case 'unscheduled':
      return { date: null };
    case 'today':
      return { date: today.toISOString().split('T')[0] };
    case 'this_week': {
      // Set to tomorrow or next available weekday
      const tomorrow = addDays(today, 1);
      return { date: tomorrow.toISOString().split('T')[0] };
    }
    case 'next_week': {
      const nextMonday = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
      return { date: nextMonday.toISOString().split('T')[0] };
    }
    case 'next_quarter': {
      // Set to 1 month from now
      const nextMonth = addMonths(now, 1);
      return { date: nextMonth.toISOString().split('T')[0] };
    }
    case 'someday':
      return { date: null, status: 'someday' };
    default:
      return { date: null };
  }
}

export function TaskKanbanView({
  tasks,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onOpenDetail,
  onAddTask,
  onQuickReschedule,
}: TaskKanbanViewProps) {
  // Group tasks by scheduling bucket
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    columns.forEach(col => {
      grouped[col.id] = [];
    });

    tasks.forEach(task => {
      if (task.is_completed) return;
      const columnId = getTaskColumn(task);
      if (grouped[columnId]) {
        grouped[columnId].push(task);
      } else {
        grouped['unscheduled'].push(task);
      }
    });

    // Sort by position_in_column or day_order, then by created_at
    Object.keys(grouped).forEach(columnId => {
      grouped[columnId].sort((a, b) => {
        // Priority order first for today column
        if (columnId === 'today') {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
        }
        
        // Then by day_order or position_in_column
        const aOrder = a.day_order ?? a.position_in_column ?? 9999;
        const bOrder = b.day_order ?? b.position_in_column ?? 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.task_id);
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('opacity-50', 'scale-95');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const target = getColumnTargetDate(columnId);
    
    if (onQuickReschedule) {
      // Use reschedule for date-based columns
      const targetDate = target.date ? new Date(target.date) : null;
      onQuickReschedule(taskId, targetDate, target.status);
    } else {
      // Fallback to update
      const updates: Partial<Task> = {};
      if (target.date) {
        updates.planned_day = target.date;
        updates.scheduled_date = target.date;
      } else {
        updates.planned_day = null;
        updates.scheduled_date = null;
      }
      if (target.status) {
        updates.status = target.status as Task['status'];
      } else if (columnId !== 'someday') {
        // Clear someday status when moving to a date-based column
        updates.status = null;
      }
      onUpdateTask(taskId, updates);
    }
  };

  const getEmptyMessage = (columnId: string): string => {
    switch (columnId) {
      case 'unscheduled':
        return 'Tasks without a date';
      case 'today':
        return 'Drag tasks to focus on today';
      case 'this_week':
        return 'Tasks for this week';
      case 'next_week':
        return 'Plan ahead for next week';
      case 'next_quarter':
        return 'Long-term tasks';
      case 'someday':
        return 'Tasks for later';
      default:
        return 'No tasks';
    }
  };

  return (
    <div className="flex gap-4 p-4 h-full min-h-0 overflow-x-auto pb-6">
      {columns.map((column) => {
        const columnTasks = tasksByColumn[column.id] || [];
        const Icon = column.icon;
        const isAtLimit = column.maxTasks && columnTasks.length >= column.maxTasks;

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-[280px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <Card className={cn(
              "flex flex-col h-full rounded-xl border-0",
              "bg-card/50 backdrop-blur-sm",
              "shadow-sm hover:shadow-md transition-shadow duration-200",
              "ring-1 ring-border/40"
            )}>
              <CardHeader className={cn(
                "py-3 px-4 rounded-t-xl border-b border-border/50",
                column.headerBg
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-lg bg-background/80 shadow-sm",
                      column.color
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold tracking-tight">
                      {column.title}
                    </CardTitle>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "h-6 min-w-[24px] justify-center font-medium text-xs",
                      "bg-background/80 shadow-sm",
                      isAtLimit && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {columnTasks.length}
                    {column.maxTasks && `/${column.maxTasks}`}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-2 overflow-y-auto min-h-0 space-y-2">
                {columnTasks.length === 0 ? (
                  <div className={cn(
                    "flex flex-col items-center justify-center py-8 px-4",
                    "text-muted-foreground/60"
                  )}>
                    <Icon className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs text-center">
                      {getEmptyMessage(column.id)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs gap-1"
                      onClick={onAddTask}
                    >
                      <Plus className="h-3 w-3" />
                      Add task
                    </Button>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.task_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "cursor-grab active:cursor-grabbing",
                        "transition-all duration-150",
                        "hover:-translate-y-0.5"
                      )}
                    >
                      <TaskCard
                        task={task}
                        onToggleComplete={onToggleComplete}
                        onUpdate={onUpdateTask}
                        onDelete={onDeleteTask}
                        onOpenDetail={onOpenDetail}
                        onQuickReschedule={onQuickReschedule || (() => {})}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
