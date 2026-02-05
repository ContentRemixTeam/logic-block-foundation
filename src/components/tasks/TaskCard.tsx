import { useState, useRef, useEffect } from 'react';
import { format, parseISO, isToday, isTomorrow, isPast, startOfDay, differenceInDays } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Clock, 
  GripVertical, 
  Trash2, 
  RefreshCw, 
  ClipboardList,
  Zap,
  Battery,
  BatteryLow,
  MoreHorizontal,
  CalendarClock,
  ArrowRight,
  Inbox,
  Folder,
  Flag,
  Eye,
  Edit2,
  FileText
} from 'lucide-react';
import { Task, ENERGY_LEVELS, DURATION_OPTIONS } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TaskTimerButton } from '@/components/timer';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onQuickReschedule: (taskId: string, date: Date | null, status?: string) => void;
  isDragging?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (taskId: string) => void;
  showSelectionCheckbox?: boolean;
}

// Format due date with relative time
function formatDueDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const today = startOfDay(new Date());
  const dueDate = startOfDay(date);
  const diffDays = differenceInDays(dueDate, today);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  
  return format(date, 'MMM d');
}

// Get color class based on due date
function getDueDateStyles(dateStr: string): string {
  const date = parseISO(dateStr);
  const today = startOfDay(new Date());
  const dueDate = startOfDay(date);
  const diffDays = differenceInDays(dueDate, today);

  if (diffDays < 0) return 'text-destructive font-medium'; // Overdue
  if (diffDays === 0) return 'text-amber-600 dark:text-amber-500 font-medium'; // Today
  if (diffDays === 1) return 'text-blue-600 dark:text-blue-400'; // Tomorrow
  
  return 'text-muted-foreground'; // Future
}

export function TaskCard({ 
  task, 
  onToggleComplete, 
  onUpdate,
  onDelete, 
  onOpenDetail,
  onQuickReschedule,
  isDragging = false,
  isSelected = false,
  onToggleSelection,
  showSelectionCheckbox = false
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.task_text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== task.task_text) {
      onUpdate(task.task_id, { task_text: editText.trim() } as Partial<Task>);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditText(task.task_text);
      setIsEditing(false);
    }
  };

  const getEnergyIcon = () => {
    switch (task.energy_level) {
      case 'high_focus': return <Zap className="h-3.5 w-3.5" />;
      case 'medium': return <Battery className="h-3.5 w-3.5" />;
      case 'low_energy': return <BatteryLow className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const getEnergyLabel = () => {
    const level = ENERGY_LEVELS.find(e => e.value === task.energy_level);
    return level?.label || '';
  };

  const getPriorityStyles = () => {
    switch (task.priority) {
      case 'high': return { border: 'border-l-destructive', bg: 'bg-destructive/5', badge: 'destructive' as const };
      case 'medium': return { border: 'border-l-amber-500', bg: 'bg-amber-500/5', badge: 'default' as const };
      case 'low': return { border: 'border-l-muted-foreground', bg: 'bg-muted/30', badge: 'secondary' as const };
      default: return { border: 'border-l-transparent', bg: '', badge: 'outline' as const };
    }
  };

  const getDurationLabel = () => {
    if (!task.estimated_minutes) return null;
    const option = DURATION_OPTIONS.find(d => d.value === task.estimated_minutes);
    return option?.label || `${task.estimated_minutes}m`;
  };

  const getSubtaskProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(s => s.completed).length;
    const total = task.subtasks.length;
    return { completed, total, percent: (completed / total) * 100 };
  };

  const subtaskProgress = getSubtaskProgress();
  const priorityStyles = getPriorityStyles();

  return (
    <div 
      className={cn(
        "group relative flex items-start gap-3 p-4 rounded-lg border bg-card",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "hover:border-primary/30 border-l-4",
        task.is_completed && "opacity-60 bg-muted/30",
        isDragging && "shadow-lg ring-2 ring-primary/20 scale-[1.02]",
        isSelected && "ring-2 ring-primary/50 bg-primary/5",
        priorityStyles.border,
        priorityStyles.bg || ""
      )}
    >
      {/* Selection checkbox */}
      {showSelectionCheckbox && (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection?.(task.task_id)}
            className="mt-0.5 h-5 w-5"
          />
        </div>
      )}

      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab mt-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => onToggleComplete(task.task_id)}
          className={cn(
            "mt-0.5 h-5 w-5 transition-all",
            task.is_completed && "bg-primary border-primary"
          )}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0" onClick={() => !isEditing && onOpenDetail(task)}>
        {/* Task Title */}
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="h-8 text-base font-medium"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 
            className={cn(
              "font-medium text-base leading-tight line-clamp-2 mb-1",
              task.is_completed && "line-through text-muted-foreground"
            )}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {task.task_text}
          </h3>
        )}

        {/* Task Metadata Row */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-2">
          {/* Due Date */}
          {task.scheduled_date && (
            <div className={cn("flex items-center gap-1.5", getDueDateStyles(task.scheduled_date))}>
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{formatDueDate(task.scheduled_date)}</span>
            </div>
          )}

          {/* Time Estimate */}
          {task.estimated_minutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{getDurationLabel()}</span>
            </div>
          )}

          {/* Timer Button */}
          <TaskTimerButton task={{ task_id: task.task_id, task_text: task.task_text }} />

          {/* Priority */}
          {task.priority && (
            <Badge variant={priorityStyles.badge} className="gap-1 text-xs px-1.5 py-0 h-5">
              <Flag className="w-3 h-3" />
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
          )}

          {/* Energy Level */}
          {task.energy_level && (
            <div className="flex items-center gap-1.5">
              {getEnergyIcon()}
              <span className="text-xs">{getEnergyLabel()}</span>
            </div>
          )}

          {/* Project */}
          {task.project && (
            <div className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{task.project.name}</span>
            </div>
          )}

          {/* SOP badge */}
          {task.sop && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-primary/10 border-primary/30 text-primary">
              <ClipboardList className="h-3 w-3 mr-1" />
              SOP
            </Badge>
          )}

          {/* Recurring indicator */}
          {task.parent_task_id && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
              <RefreshCw className="h-3 w-3" />
            </Badge>
          )}

          {/* Context tags */}
          {task.context_tags && task.context_tags.length > 0 && (
            <div className="flex items-center gap-1">
              {task.context_tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 h-5">
                  #{tag}
                </Badge>
              ))}
              {task.context_tags.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                  +{task.context_tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Waiting on */}
          {task.waiting_on && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              ⏳ {task.waiting_on}
            </Badge>
          )}
        </div>

        {/* Content Calendar indicator */}
        {task.content_type && (
          <div className="flex flex-wrap items-center gap-2 text-sm mt-2">
            <Badge 
              variant="outline" 
              className="text-xs px-1.5 py-0 h-5 bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400"
            >
              <FileText className="h-3 w-3 mr-1" />
              {task.content_type}
            </Badge>
            {task.content_channel && (
              <span className="text-xs text-muted-foreground">
                • {task.content_channel}
              </span>
            )}
            {(task.content_creation_date || task.content_publish_date) && (
              <span className="text-xs text-muted-foreground">
                {task.content_creation_date && `Create: ${format(parseISO(task.content_creation_date), 'MMM d')}`}
                {task.content_creation_date && task.content_publish_date && ' → '}
                {task.content_publish_date && `Publish: ${format(parseISO(task.content_publish_date), 'MMM d')}`}
              </span>
            )}
          </div>
        )}

        {/* Task Description (truncated) */}
        {task.task_description && !task.is_completed && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
            {task.task_description}
          </p>
        )}

        {/* Subtask Progress */}
        {subtaskProgress && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${subtaskProgress.percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {subtaskProgress.completed}/{subtaskProgress.total}
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onOpenDetail(task)}
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Reschedule">
              <CalendarClock className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0" align="end">
            <div className="p-1 space-y-0.5">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm h-9" 
                onClick={() => onQuickReschedule(task.task_id, new Date(), 'scheduled')}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                Today
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm h-9" 
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  onQuickReschedule(task.task_id, tomorrow, 'scheduled');
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2 text-muted-foreground" />
                Tomorrow
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm h-9" 
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  onQuickReschedule(task.task_id, nextWeek, 'scheduled');
                }}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                Next Week
              </Button>
              <div className="border-t my-1" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm h-9" 
                onClick={() => onQuickReschedule(task.task_id, null, 'someday')}
              >
                <Inbox className="h-4 w-4 mr-2 text-muted-foreground" />
                Someday
              </Button>
            </div>
            <div className="border-t p-1">
              <Popover
                onOpenChange={(open) => {
                  // When this calendar popover closes after selection, we want the outer popover to close too
                  if (!open) {
                    // Handled by onSelect below
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-9">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    Pick a date...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" side="left">
                  <Calendar
                    mode="single"
                    selected={task.scheduled_date ? parseISO(task.scheduled_date) : undefined}
                    onSelect={(date) => {
                      onQuickReschedule(task.task_id, date || null, 'scheduled');
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpenDetail(task)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate(task.task_id, { status: 'focus' } as Partial<Task>)}>
              Move to Focus
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate(task.task_id, { status: 'backlog' } as Partial<Task>)}>
              Move to Backlog
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(task)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
