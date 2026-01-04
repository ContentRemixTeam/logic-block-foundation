import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
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
  Inbox
} from 'lucide-react';
import { Task, ENERGY_LEVELS, DURATION_OPTIONS } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onQuickReschedule: (taskId: string, date: Date | null, status?: string) => void;
  isDragging?: boolean;
}

export function TaskCard({ 
  task, 
  onToggleComplete, 
  onUpdate,
  onDelete, 
  onOpenDetail,
  onQuickReschedule,
  isDragging = false
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
      case 'high_focus': return <Zap className="h-3 w-3" />;
      case 'medium': return <Battery className="h-3 w-3" />;
      case 'low_energy': return <BatteryLow className="h-3 w-3" />;
      default: return null;
    }
  };

  const getEnergyStyle = () => {
    const level = ENERGY_LEVELS.find(e => e.value === task.energy_level);
    return level ? `${level.color} ${level.bgColor}` : '';
  };

  const getPriorityStyle = () => {
    switch (task.priority) {
      case 'high': return 'border-l-destructive bg-destructive/5';
      case 'medium': return 'border-l-warning bg-warning/5';
      case 'low': return 'border-l-muted-foreground bg-muted/30';
      default: return '';
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

  return (
    <Card 
      className={cn(
        "group transition-all duration-200 hover:shadow-md cursor-pointer border-l-4",
        task.is_completed && "opacity-50",
        isDragging && "shadow-lg ring-2 ring-primary/20",
        getPriorityStyle() || "border-l-transparent"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Checkbox */}
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={task.is_completed}
              onCheckedChange={() => onToggleComplete(task.task_id)}
              className={cn(
                "mt-0.5 transition-all",
                task.is_completed && "bg-success border-success"
              )}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0" onClick={() => !isEditing && onOpenDetail(task)}>
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p 
                className={cn(
                  "font-medium text-sm leading-tight",
                  task.is_completed && "line-through text-muted-foreground"
                )}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {task.task_text}
              </p>
            )}

            {/* Subtask progress bar */}
            {subtaskProgress && (
              <div className="mt-2 flex items-center gap-2">
                <Progress value={subtaskProgress.percent} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground">
                  {subtaskProgress.completed}/{subtaskProgress.total}
                </span>
              </div>
            )}

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Duration badge */}
              {task.estimated_minutes && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                  <Clock className="h-3 w-3 mr-1" />
                  {getDurationLabel()}
                </Badge>
              )}

              {/* Energy level */}
              {task.energy_level && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-1.5 py-0 h-5", getEnergyStyle())}
                >
                  {getEnergyIcon()}
                </Badge>
              )}

              {/* Context tags */}
              {task.context_tags?.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 h-5">
                  #{tag}
                </Badge>
              ))}

              {/* SOP badge */}
              {task.sop && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-1.5 py-0 h-5 bg-primary/10 border-primary/30 text-primary"
                >
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

              {/* Waiting on */}
              {task.waiting_on && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                  ⏳ {task.waiting_on}
                </Badge>
              )}

              {/* Date */}
              {task.scheduled_date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(parseISO(task.scheduled_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Reschedule">
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
                  <Popover>
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
                        onSelect={(date) => onQuickReschedule(task.task_id, date || null, 'scheduled')}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenDetail(task)}>
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
      </CardContent>
    </Card>
  );
}
