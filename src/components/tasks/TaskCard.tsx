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
import { StuckTaskBadge } from './StuckTaskBadge';
import { Sparkles } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';
import { StuckTaskCoachModal } from '@/components/mastermind/StuckTaskCoachModal';

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

  const getEnergyStyles = () => {
    switch (task.energy_level) {
      case 'high_focus': return 'border-destructive/30 bg-destructive/10 text-destructive';
      case 'medium': return 'border-warning/30 bg-warning/15 text-warning-foreground';
      case 'low_energy': return 'border-success/30 bg-success/10 text-success';
      default: return 'border-muted bg-muted/50 text-muted-foreground';
    }
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

  // Sunsama-style left edge bar color by priority
  const priorityBar =
    task.priority === 'high' ? 'bg-destructive' :
    task.priority === 'medium' ? 'bg-amber-500' :
    task.priority === 'low' ? 'bg-blue-400/70' :
    'bg-transparent';

  // Format time chip: scheduled time wins, else duration
  const timeChip = (() => {
    if (task.scheduled_time) {
      // scheduled_time may be 'HH:mm:ss' or 'HH:mm'
      const [h, m] = String(task.scheduled_time).split(':');
      return `${h}:${m}`;
    }
    if (task.estimated_minutes) {
      const mins = task.estimated_minutes;
      if (mins >= 60) {
        const h = Math.floor(mins / 60);
        const r = mins % 60;
        return r ? `${h}h ${r}m` : `${h}h`;
      }
      return `${mins}m`;
    }
    return null;
  })();

  // Source label (best-effort, only if data exists)
  const sourceLabel = (() => {
    const src = (task as any).source || (task as any).created_via || (task as any).origin;
    if (!src) return null;
    const map: Record<string, string> = {
      daily_plan: 'Daily Plan',
      weekly_plan: 'Weekly Plan',
      monthly_plan: 'Monthly Plan',
      ninety_day: '90-Day Plan',
      ninety_day_plan: '90-Day Plan',
      wizard: 'Wizard',
      project: 'Project',
      brain_dump: 'Brain Dump',
      manual: '',
    };
    const label = map[String(src)] ?? String(src).replace(/_/g, ' ');
    return label ? `From ${label}` : null;
  })();

  return (
    <div
      className={cn(
        "group relative flex items-stretch rounded-xl bg-card overflow-hidden",
        "shadow-sm transition-all duration-200 hover:shadow-md",
        task.is_completed && "opacity-50",
        isDragging && "shadow-lg ring-2 ring-primary/20 scale-[1.01]",
        isSelected && "ring-2 ring-primary/50",
      )}
    >
      {/* Priority left edge bar */}
      <div className={cn("w-[3px] shrink-0", priorityBar)} aria-hidden />

      <div className="flex flex-1 items-start gap-3 px-4 py-3 min-w-0">
      {/* Selection checkbox */}
      {showSelectionCheckbox && (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection?.(task.task_id)}
            className="mt-0.5 h-5 w-5 rounded-md"
          />
        </div>
      )}

      {/* Drag handle */}
      <div className="hidden opacity-0 transition-opacity group-hover:opacity-100 sm:block cursor-grab mt-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => onToggleComplete(task.task_id)}
          className={cn(
            "mt-0.5 h-6 w-6 rounded-md transition-all",
            task.is_completed && "bg-primary border-primary"
          )}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0" onClick={() => !isEditing && onOpenDetail(task)}>
        <div className="flex items-start gap-3">
          {/* Title + description */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                className={cn(
                  "truncate text-[0.95rem] font-medium leading-snug text-foreground",
                  task.is_completed && "line-through text-muted-foreground"
                )}
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              >
                {task.task_text}
              </h3>
            )}
            {task.task_description && !task.is_completed && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {task.task_description}
              </p>
            )}
            {sourceLabel && (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {sourceLabel}
              </p>
            )}
          </div>

          {/* Right cluster: subtle chips */}
          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
            {task.energy_level && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground/80"
                title={getEnergyLabel()}
              >
                {getEnergyIcon()}
              </span>
            )}
            {task.parent_task_id && (
              <RefreshCw className="h-3 w-3 text-muted-foreground/70" />
            )}
            <StuckTaskBadge rescheduleCount={task.reschedule_count_30d} />
            {task.sop && (
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground/70" />
            )}
            {timeChip && (
              <span className="rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-foreground/80">
                {timeChip}
              </span>
            )}
            {task.scheduled_date && (
              <span className={cn("hidden sm:inline text-[11px]", getDueDateStyles(task.scheduled_date))}>
                {formatDueDate(task.scheduled_date)}
              </span>
            )}
            {task.project && (
              <span className="hidden sm:inline-flex max-w-[140px] items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: task.project.color || 'hsl(var(--muted-foreground))' }}
                />
                <span className="truncate">#{task.project.name}</span>
              </span>
            )}
            <TaskTimerButton task={{ task_id: task.task_id, task_text: task.task_text }} />
          </div>
        </div>

        {task.context_tags && task.context_tags.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
            {task.context_tags.slice(0, 3).map(tag => (
              <span key={tag}>#{tag}</span>
            ))}
            {task.context_tags.length > 3 && <span>+{task.context_tags.length - 3}</span>}
          </div>
        )}

        {subtaskProgress && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${subtaskProgress.percent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {subtaskProgress.completed}/{subtaskProgress.total}
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex shrink-0 items-center gap-1 rounded-full border bg-background/80 p-1 opacity-100 shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => onOpenDetail(task)}
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Reschedule">
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
    </div>
  );
}
