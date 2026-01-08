import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Task, ENERGY_LEVELS, CONTEXT_TAGS } from '@/components/tasks/types';
import { cn } from '@/lib/utils';
import { GripVertical, Clock } from 'lucide-react';

interface WeeklyTaskCardProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  isDragging?: boolean;
  compact?: boolean;
}

export function WeeklyTaskCard({ task, onToggle, isDragging, compact = false }: WeeklyTaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const energyConfig = task.energy_level 
    ? ENERGY_LEVELS.find(e => e.value === task.energy_level)
    : null;

  const contextTags = task.context_tags?.map(tag => 
    CONTEXT_TAGS.find(c => c.value === tag)
  ).filter(Boolean) || [];

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
          "group flex items-center gap-1.5 rounded-md border bg-card transition-all",
          compact ? "p-1.5" : "p-2",
          isDragging && "opacity-50 scale-95 shadow-lg",
          isHovered && !isDragging && "shadow-md border-primary/30",
          task.is_completed && "opacity-50"
        )}
      >
        {/* Drag handle - visible on hover */}
        <div className={cn(
          "shrink-0 cursor-grab active:cursor-grabbing transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <GripVertical className={cn(
            "text-muted-foreground",
            compact ? "h-3 w-3" : "h-4 w-4"
          )} />
        </div>
        
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => onToggle(task.task_id, task.is_completed)}
          onClick={(e) => e.stopPropagation()}
          className={cn(compact && "h-3.5 w-3.5")}
        />
        
        <div className="flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className={cn(
                "truncate",
                compact ? "text-xs" : "text-sm",
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

        {/* Metadata badges */}
        <div className={cn(
          "flex items-center gap-1 shrink-0",
          compact && "gap-0.5"
        )}>
          {task.estimated_minutes && (
            <Badge 
              variant="secondary" 
              className={cn(
                "font-normal",
                compact ? "text-[10px] px-1 py-0 h-4" : "text-xs px-1.5 py-0"
              )}
            >
              <Clock className={cn(compact ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-0.5")} />
              {formatDuration(task.estimated_minutes)}
            </Badge>
          )}

          {task.priority && (
            <div 
              className={cn(
                "rounded-full",
                compact ? "w-1.5 h-1.5" : "w-2 h-2",
                priorityColors[task.priority] || 'bg-gray-400'
              )} 
              title={`${task.priority} priority`}
            />
          )}

          {energyConfig && !compact && (
            <div 
              className={cn("w-2 h-2 rounded-full", energyConfig.bgColor)} 
              title={energyConfig.label} 
            />
          )}

          {!compact && contextTags.slice(0, 1).map((tag) => (
            <span key={tag!.value} className="text-xs" title={tag!.label}>
              {tag!.icon}
            </span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}