import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Task } from '@/components/tasks/types';
import { cn } from '@/lib/utils';
import { GripVertical, Clock } from 'lucide-react';

interface WeeklyTaskCardProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  isDragging?: boolean;
  compact?: boolean;
  isHighlighted?: boolean;
}

export function WeeklyTaskCard({ task, onToggle, isDragging, compact = false, isHighlighted = false }: WeeklyTaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.task_id);
    e.dataTransfer.setData('fromPlannedDay', task.planned_day || '');
    e.dataTransfer.effectAllowed = 'move';
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  return (
    <TooltipProvider>
      <div
        draggable
        onDragStart={handleDragStart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group flex items-center gap-2 rounded-md border bg-card transition-all cursor-grab active:cursor-grabbing",
          compact ? "px-2 py-1.5" : "p-2.5",
          isDragging && "opacity-50 scale-95 shadow-lg",
          isHovered && !isDragging && "shadow-sm border-primary/20",
          task.is_completed && "opacity-60",
          isHighlighted && "ring-2 ring-primary ring-offset-2 animate-pulse"
        )}
        data-task-id={task.task_id}
      >
        {/* Drag handle - visible on hover */}
        <div className={cn(
          "shrink-0 transition-opacity",
          isHovered ? "opacity-60" : "opacity-0",
          compact && "hidden sm:block"
        )}>
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => onToggle(task.task_id, task.is_completed)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className={cn(
                "truncate leading-tight",
                compact ? "text-sm" : "text-sm",
                task.is_completed && "line-through text-muted-foreground"
              )}>
                {task.task_text}
              </p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {task.task_text}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Compact metadata: just time + priority dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.estimated_minutes && (
            <span className={cn(
              "text-muted-foreground flex items-center gap-0.5",
              compact ? "text-xs" : "text-xs"
            )}>
              <Clock className="h-3 w-3" />
              {formatDuration(task.estimated_minutes)}
            </span>
          )}

          {task.priority && (
            <div 
              className={cn(
                "rounded-full w-2 h-2",
                priorityColors[task.priority] || 'bg-gray-400'
              )} 
              title={`${task.priority} priority`}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
