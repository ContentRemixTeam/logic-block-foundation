import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from '../TaskCard';
import { Task } from '../types';
import { cn } from '@/lib/utils';
import { 
  Target, 
  Calendar, 
  Inbox, 
  Clock, 
  CloudSun,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    id: 'focus', 
    title: 'Focus', 
    icon: Target, 
    color: 'text-rose-600 dark:text-rose-400',
    headerBg: 'bg-gradient-to-r from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20',
    accentColor: 'border-l-rose-500',
    maxTasks: 3 
  },
  { 
    id: 'scheduled', 
    title: 'Scheduled', 
    icon: Calendar, 
    color: 'text-blue-600 dark:text-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
    accentColor: 'border-l-blue-500'
  },
  { 
    id: 'backlog', 
    title: 'Backlog', 
    icon: Inbox, 
    color: 'text-amber-600 dark:text-amber-400',
    headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
    accentColor: 'border-l-amber-500'
  },
  { 
    id: 'waiting', 
    title: 'Waiting', 
    icon: Clock, 
    color: 'text-purple-600 dark:text-purple-400',
    headerBg: 'bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
    accentColor: 'border-l-purple-500'
  },
  { 
    id: 'someday', 
    title: 'Someday', 
    icon: CloudSun, 
    color: 'text-slate-500 dark:text-slate-400',
    headerBg: 'bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-700/20',
    accentColor: 'border-l-slate-400'
  },
];

export function TaskKanbanView({
  tasks,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onOpenDetail,
  onAddTask,
  onQuickReschedule,
}: TaskKanbanViewProps) {
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    columns.forEach(col => {
      grouped[col.id] = [];
    });

    tasks.forEach(task => {
      if (task.is_completed) return;
      const status = task.status || 'backlog';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['backlog'].push(task);
      }
    });

    // Sort by position_in_column
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => {
        if (a.position_in_column !== null && b.position_in_column !== null) {
          return a.position_in_column - b.position_in_column;
        }
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
    if (taskId) {
      onUpdateTask(taskId, { status: columnId as Task['status'] });
    }
  };

  return (
    <div className="flex gap-4 p-4 h-full min-h-0 overflow-x-auto pb-6">
      {columns.map((column) => {
        const columnTasks = tasksByStatus[column.id] || [];
        const Icon = column.icon;
        const isAtLimit = column.maxTasks && columnTasks.length >= column.maxTasks;

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-[300px]"
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
                      isAtLimit && "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
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
                      {column.id === 'focus' 
                        ? 'Drag tasks here to focus on today'
                        : column.id === 'waiting'
                        ? 'Tasks blocked or delegated'
                        : column.id === 'someday'
                        ? 'Tasks for later'
                        : 'No tasks'}
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
