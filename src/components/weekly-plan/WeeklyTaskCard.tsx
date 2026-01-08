import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Task, ENERGY_LEVELS, CONTEXT_TAGS } from '@/components/tasks/types';
import { cn } from '@/lib/utils';
import { GripVertical, Clock, Zap } from 'lucide-react';

interface WeeklyTaskCardProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  isDragging?: boolean;
}

export function WeeklyTaskCard({ task, onToggle, isDragging }: WeeklyTaskCardProps) {
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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 cursor-grab transition-all",
        isDragging && "opacity-50 scale-95",
        task.is_completed && "opacity-60 line-through"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={() => onToggle(task.task_id, task.is_completed)}
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm truncate",
          task.is_completed && "line-through text-muted-foreground"
        )}>
          {task.task_text}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {task.estimated_minutes && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            <Clock className="h-3 w-3 mr-0.5" />
            {formatDuration(task.estimated_minutes)}
          </Badge>
        )}

        {energyConfig && (
          <div className={cn("w-2 h-2 rounded-full", energyConfig.bgColor)} title={energyConfig.label} />
        )}

        {contextTags.slice(0, 2).map((tag) => (
          <span key={tag!.value} className="text-xs" title={tag!.label}>
            {tag!.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
