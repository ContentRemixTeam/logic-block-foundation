import { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  Trash2, 
  ExternalLink, 
  Calendar as CalendarIcon,
  Tag,
  FileText,
  Zap,
  Battery,
  BatteryLow,
  BatteryMedium,
  Clock
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Task } from '@/components/tasks/types';
import { SOPSelector } from '@/components/tasks/SOPSelector';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface TaskBoardRowProps {
  task: Task;
  visibleColumns: string[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
}

const STATUS_OPTIONS = [
  { value: 'focus', label: 'Focus', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
  { value: 'scheduled', label: 'Scheduled', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { value: 'backlog', label: 'Backlog', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { value: 'waiting', label: 'Waiting', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  { value: 'someday', label: 'Someday', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  { value: 'medium', label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { value: 'low', label: 'Low', className: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
];

const ENERGY_OPTIONS = [
  { value: 'high_focus', label: 'High', icon: Zap },
  { value: 'medium', label: 'Medium', icon: BatteryMedium },
  { value: 'low_energy', label: 'Low', icon: BatteryLow },
];

const TIME_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
];

const COLUMN_WIDTHS: Record<string, string> = {
  task: 'flex-1 min-w-[200px]',
  status: 'w-[120px]',
  scheduled_date: 'w-[140px]',
  priority: 'w-[100px]',
  energy_level: 'w-[100px]',
  estimated_minutes: 'w-[100px]',
  tags: 'w-[150px]',
  sop: 'w-[140px]',
  project: 'w-[140px]',
  notes: 'w-[80px]',
};

export function TaskBoardRow({
  task,
  visibleColumns,
  onTaskClick,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
}: TaskBoardRowProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.task_text);

  const handleSaveTitle = () => {
    if (editTitle.trim() !== task.task_text) {
      onUpdateTask(task.task_id, { task_text: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const renderCell = (columnId: string) => {
    switch (columnId) {
      case 'task':
        return (
          <div className="flex items-center gap-3 min-w-0">
            <Checkbox
              checked={task.is_completed}
              onCheckedChange={() => onToggleComplete(task.task_id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            {isEditingTitle ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditTitle(task.task_text);
                    setIsEditingTitle(false);
                  }
                }}
                className="h-7 text-sm"
                autoFocus
              />
            ) : (
              <span
                className={cn(
                  "truncate cursor-pointer hover:text-primary transition-colors text-sm",
                  task.is_completed && "line-through text-muted-foreground"
                )}
                onDoubleClick={() => setIsEditingTitle(true)}
                onClick={() => onTaskClick(task)}
              >
                {task.task_text}
              </span>
            )}
          </div>
        );

      case 'status':
        const statusOption = STATUS_OPTIONS.find(s => s.value === task.status);
        return (
          <Select
            value={task.status || 'backlog'}
            onValueChange={(value) => onUpdateTask(task.task_id, { status: value })}
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50">
              <Badge className={cn("text-xs font-medium", statusOption?.className)}>
                {statusOption?.label || 'Backlog'}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <Badge className={cn("text-xs", option.className)}>{option.label}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'scheduled_date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs justify-start gap-1.5 font-normal",
                  !task.scheduled_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {task.scheduled_date
                  ? format(new Date(task.scheduled_date), 'MMM d')
                  : 'Set date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={task.scheduled_date ? new Date(task.scheduled_date) : undefined}
                onSelect={(date) =>
                  onUpdateTask(task.task_id, {
                    scheduled_date: date ? format(date, 'yyyy-MM-dd') : null,
                  })
                }
              />
            </PopoverContent>
          </Popover>
        );

      case 'priority':
        const priorityOption = PRIORITY_OPTIONS.find(p => p.value === task.priority);
        return (
          <Select
            value={task.priority || ''}
            onValueChange={(value) => onUpdateTask(task.task_id, { priority: value || null })}
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50">
              {priorityOption ? (
                <Badge className={cn("text-xs", priorityOption.className)}>
                  {priorityOption.label}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <Badge className={cn("text-xs", option.className)}>{option.label}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'energy_level':
        const energyOption = ENERGY_OPTIONS.find(e => e.value === task.energy_level);
        const EnergyIcon = energyOption?.icon || Battery;
        return (
          <Select
            value={task.energy_level || ''}
            onValueChange={(value) => onUpdateTask(task.task_id, { energy_level: value || null })}
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50">
              {energyOption ? (
                <div className="flex items-center gap-1.5">
                  <EnergyIcon className="h-3.5 w-3.5" />
                  <span>{energyOption.label}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {ENERGY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-1.5">
                    <option.icon className="h-3.5 w-3.5" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'estimated_minutes':
        return (
          <Select
            value={task.estimated_minutes?.toString() || ''}
            onValueChange={(value) => 
              onUpdateTask(task.task_id, { estimated_minutes: value ? parseInt(value) : null })
            }
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50">
              {task.estimated_minutes ? (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{task.estimated_minutes} min</span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'tags':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs justify-start gap-1.5"
              >
                <Tag className="h-3 w-3" />
                {task.context_tags?.length ? (
                  <span className="truncate">{task.context_tags.slice(0, 2).join(', ')}</span>
                ) : (
                  <span className="text-muted-foreground">Add tags</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <Input
                placeholder="Add tags (comma separated)"
                defaultValue={task.context_tags?.join(', ') || ''}
                onBlur={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                  onUpdateTask(task.task_id, { context_tags: tags.length ? tags : null });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const tags = e.currentTarget.value.split(',').map(t => t.trim()).filter(Boolean);
                    onUpdateTask(task.task_id, { context_tags: tags.length ? tags : null });
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        );

      case 'sop':
        return (
          <SOPSelector
            selectedSOPId={task.sop_id}
            onSelect={(sopId) => onUpdateTask(task.task_id, { sop_id: sopId })}
          />
        );

      case 'project':
        return task.project_id ? (
          <Link
            to={`/projects/${task.project_id}`}
            className="text-xs text-primary hover:underline truncate block"
          >
            {task.project?.name || 'View project'}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );

      case 'notes':
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onTaskClick(task)}
          >
            <FileText className={cn(
              "h-3.5 w-3.5",
              task.notes ? "text-primary" : "text-muted-foreground"
            )} />
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2",
      "hover:bg-muted/40 transition-colors",
      "group border-b border-border/30 last:border-b-0"
    )}>
      {visibleColumns.map((columnId) => (
        <div 
          key={columnId} 
          className={cn(COLUMN_WIDTHS[columnId] || 'w-[100px]')}
        >
          {renderCell(columnId)}
        </div>
      ))}

      {/* Row actions */}
      <div className="w-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => onDeleteTask(task)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
            {task.project_id && (
              <DropdownMenuItem asChild>
                <Link to={`/projects/${task.project_id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View project
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
