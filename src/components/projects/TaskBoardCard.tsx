import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/components/tasks/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GripVertical, 
  Calendar, 
  Clock, 
  Flag, 
  Zap,
  MoreHorizontal,
  Trash2,
  Edit,
  CalendarPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';

interface TaskBoardCardProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onReschedule?: (task: Task) => void;
}

export function TaskBoardCard({ 
  task, 
  onToggle, 
  onEdit, 
  onDelete,
  onReschedule 
}: TaskBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.task_id,
    data: {
      type: 'task',
      task,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate due date display and color
  const dueDateInfo = useMemo(() => {
    if (!task.scheduled_date) return null;
    
    const date = new Date(task.scheduled_date);
    const today = startOfDay(new Date());
    const dueDate = startOfDay(date);
    
    let label: string;
    let colorClass: string;
    
    if (isToday(date)) {
      label = 'Today';
      colorClass = 'text-amber-600 dark:text-amber-500';
    } else if (isTomorrow(date)) {
      label = 'Tomorrow';
      colorClass = 'text-blue-600 dark:text-blue-500';
    } else if (isPast(dueDate) && !isToday(date)) {
      label = format(date, 'MMM d');
      colorClass = 'text-destructive font-medium';
    } else {
      label = format(date, 'MMM d');
      colorClass = 'text-muted-foreground';
    }
    
    return { label, colorClass };
  }, [task.scheduled_date]);

  // Calculate subtask progress
  const subtaskProgress = useMemo(() => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(st => st.completed).length;
    const total = task.subtasks.length;
    const percentage = (completed / total) * 100;
    return { completed, total, percentage };
  }, [task.subtasks]);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return 'border-destructive/50 text-destructive bg-destructive/10';
      case 'medium':
        return 'border-amber-500/50 text-amber-600 bg-amber-500/10';
      case 'low':
        return 'border-green-500/50 text-green-600 bg-green-500/10';
      default:
        return '';
    }
  };

  const getEnergyIcon = (energy: string | null) => {
    switch (energy) {
      case 'high_focus':
        return <Zap className="h-3 w-3 text-destructive" />;
      case 'medium':
        return <Zap className="h-3 w-3 text-amber-500" />;
      case 'low_energy':
        return <Zap className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing group',
        'hover:shadow-md hover:border-primary/20 transition-all duration-200',
        isDragging && 'opacity-50 shadow-lg rotate-2 scale-105',
        task.is_completed && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        </div>
        
        {/* Checkbox */}
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => onToggle(task.task_id)}
          className="mt-0.5 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {/* Task Title */}
          <p className={cn(
            'text-sm font-medium leading-tight',
            task.is_completed && 'line-through text-muted-foreground'
          )}>
            {task.task_text}
          </p>
          
          {/* Description Preview */}
          {task.task_description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {task.task_description}
            </p>
          )}
          
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Due Date */}
            {dueDateInfo && (
              <div className={cn('flex items-center gap-1 text-xs', dueDateInfo.colorClass)}>
                <Calendar className="h-3 w-3" />
                <span>{dueDateInfo.label}</span>
              </div>
            )}
            
            {/* Time Estimate */}
            {task.estimated_minutes && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{task.estimated_minutes >= 60 ? `${Math.floor(task.estimated_minutes / 60)}h` : `${task.estimated_minutes}m`}</span>
              </div>
            )}
            
            {/* Priority */}
            {task.priority && (
              <Badge 
                variant="outline" 
                className={cn('text-xs px-1.5 py-0', getPriorityColor(task.priority))}
              >
                <Flag className="h-2.5 w-2.5 mr-0.5" />
                {task.priority}
              </Badge>
            )}
            
            {/* Energy Level */}
            {task.energy_level && (
              <div className="flex items-center">
                {getEnergyIcon(task.energy_level)}
              </div>
            )}
          </div>
          
          {/* Context Tags */}
          {task.context_tags && task.context_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.context_tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {task.context_tags.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{task.context_tags.length - 2}
                </Badge>
              )}
            </div>
          )}
          
          {/* Subtask Progress */}
          {subtaskProgress && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${subtaskProgress.percentage}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {subtaskProgress.completed}/{subtaskProgress.total}
              </span>
            </div>
          )}
        </div>
        
        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onReschedule && (
              <DropdownMenuItem onClick={() => onReschedule(task)}>
                <CalendarPlus className="h-4 w-4 mr-2" />
                Reschedule
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(task.task_id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
