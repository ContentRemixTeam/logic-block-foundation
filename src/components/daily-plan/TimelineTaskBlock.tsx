import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/components/tasks/types';

interface TimelineTaskBlockProps {
  task: Task;
  compact?: boolean;
  onToggle?: (taskId: string, currentStatus: boolean) => void;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export function TimelineTaskBlock({ 
  task, 
  compact = false, 
  onToggle, 
  onClick,
  draggable = false,
  onDragStart 
}: TimelineTaskBlockProps) {
  const startTime = task.time_block_start ? parseISO(task.time_block_start) : null;
  const endTime = task.time_block_end ? parseISO(task.time_block_end) : null;

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'border-l-destructive bg-destructive/5';
      case 'medium': return 'border-l-warning bg-warning/5';
      case 'low': return 'border-l-success bg-success/5';
      default: return 'border-l-primary bg-primary/5';
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(task.task_id, task.is_completed);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.task_id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, task.task_id);
  };

  if (compact) {
    return (
      <div
        draggable={draggable}
        onDragStart={draggable ? handleDragStart : undefined}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all text-xs",
          "border-l-2 hover:shadow-md",
          draggable && "cursor-grab active:cursor-grabbing",
          task.is_completed ? "opacity-50" : "",
          getPriorityColor(task.priority)
        )}
      >
        {draggable && (
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
        )}
        <button onClick={handleToggle} className="shrink-0">
          {task.is_completed ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <span className={cn(
          "truncate flex-1 font-medium",
          task.is_completed && "line-through text-muted-foreground"
        )}>
          {task.task_text}
        </span>
        {task.estimated_minutes && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {task.estimated_minutes}m
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg p-3 cursor-pointer transition-all",
        "border-l-4 shadow-sm hover:shadow-md",
        task.is_completed ? "opacity-60" : "",
        getPriorityColor(task.priority)
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        {draggable && (
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        )}
        <button onClick={handleToggle} className="shrink-0">
          {task.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
          )}
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          {startTime && endTime ? (
            `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
          ) : task.estimated_minutes ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimated_minutes}m
            </span>
          ) : null}
        </span>
      </div>

      {/* Title */}
      <h4 className={cn(
        "font-semibold text-foreground",
        task.is_completed && "line-through text-muted-foreground"
      )}>
        {task.task_text}
      </h4>

      {/* Description */}
      {task.task_description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {task.task_description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2 text-xs">
        {task.priority && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1.5 py-0",
              task.priority === 'high' && "border-destructive/50 text-destructive",
              task.priority === 'medium' && "border-warning/50 text-warning",
              task.priority === 'low' && "border-success/50 text-success"
            )}
          >
            {task.priority}
          </Badge>
        )}
        {task.source && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {task.source === 'top_3' ? 'Top 3' : task.source}
          </Badge>
        )}
      </div>
    </div>
  );
}
