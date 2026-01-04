import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Target, Calendar, Inbox, Clock } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { TaskCard } from '../TaskCard';

interface TaskKanbanViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onQuickReschedule: (taskId: string, date: Date | null) => void;
}

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  maxTasks?: number;
}

const columns: KanbanColumn[] = [
  { 
    id: 'focus', 
    title: "Today's Focus", 
    icon: <Target className="h-4 w-4" />, 
    color: 'border-t-primary',
    maxTasks: 5
  },
  { 
    id: 'scheduled', 
    title: 'Scheduled', 
    icon: <Calendar className="h-4 w-4" />, 
    color: 'border-t-success'
  },
  { 
    id: 'backlog', 
    title: 'Backlog', 
    icon: <Inbox className="h-4 w-4" />, 
    color: 'border-t-muted-foreground'
  },
  { 
    id: 'waiting', 
    title: 'Waiting On', 
    icon: <Clock className="h-4 w-4" />, 
    color: 'border-t-warning'
  },
];

export function TaskKanbanView({
  tasks,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onOpenDetail,
  onQuickReschedule,
}: TaskKanbanViewProps) {
  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      focus: [],
      scheduled: [],
      backlog: [],
      waiting: [],
    };

    tasks.forEach(task => {
      if (task.is_completed) return;
      
      const status = task.status || 'backlog';
      if (groups[status as TaskStatus]) {
        groups[status as TaskStatus].push(task);
      } else {
        groups.backlog.push(task);
      }
    });

    // Sort by position within column
    Object.keys(groups).forEach(key => {
      groups[key as TaskStatus].sort((a, b) => 
        (a.position_in_column || 0) - (b.position_in_column || 0)
      );
    });

    return groups;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onUpdateTask(taskId, { status });
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
      {columns.map(column => {
        const columnTasks = groupedTasks[column.id];
        const isOverLimit = column.maxTasks && columnTasks.length > column.maxTasks;

        return (
          <Card 
            key={column.id}
            className={cn("flex flex-col border-t-4", column.color)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {column.icon}
                  {column.title}
                </span>
                <Badge 
                  variant={isOverLimit ? "destructive" : "secondary"} 
                  className="text-xs"
                >
                  {columnTasks.length}
                  {column.maxTasks && ` / ${column.maxTasks}`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 px-2 pb-2 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2 px-2">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {column.id === 'focus' 
                        ? 'Drag tasks here to focus on today'
                        : column.id === 'waiting'
                        ? 'Tasks blocked or delegated'
                        : 'No tasks'}
                    </div>
                  ) : (
                    columnTasks.map(task => (
                      <div
                        key={task.task_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.task_id)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <TaskCard
                          task={task}
                          onToggleComplete={onToggleComplete}
                          onUpdate={onUpdateTask}
                          onDelete={onDeleteTask}
                          onOpenDetail={onOpenDetail}
                          onQuickReschedule={onQuickReschedule}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
