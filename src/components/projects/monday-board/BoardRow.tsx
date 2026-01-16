import { useState } from 'react';
import { Task, ENERGY_LEVELS, CONTEXT_TAGS, DURATION_OPTIONS } from '@/components/tasks/types';
import { ProjectSection, BOARD_COLUMNS } from '@/types/project';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, MoreHorizontal, Trash2, FileText, MoveRight, ClipboardList } from 'lucide-react';
import { SOPSelector } from '@/components/tasks/SOPSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface BoardRowProps {
  task: Task;
  visibleColumns: string[];
  onClick: () => void;
  onToggleComplete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onMoveToSection: (taskId: string, sectionId: string | null) => void;
  allSections: ProjectSection[];
  currentSectionId: string | null;
}

const STATUS_OPTIONS = [
  { value: 'focus', label: 'Focus', color: 'bg-red-500/20 text-red-600' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'backlog', label: 'Backlog', color: 'bg-gray-500/20 text-gray-600' },
  { value: 'waiting', label: 'Waiting', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'someday', label: 'Someday', color: 'bg-purple-500/20 text-purple-600' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: 'bg-red-500/20 text-red-600' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-600' },
];

export function BoardRow({
  task,
  visibleColumns,
  onClick,
  onToggleComplete,
  onUpdate,
  onDelete,
  onMoveToSection,
  allSections,
  currentSectionId,
}: BoardRowProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.task_text);

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== task.task_text) {
      onUpdate(task.task_id, { task_text: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const getColumnWidth = (columnId: string) => {
    const col = BOARD_COLUMNS.find(c => c.id === columnId);
    return col?.width || 100;
  };

  const renderCell = (columnId: string, index: number) => {
    const width = getColumnWidth(columnId);
    const isSticky = index === 0;

    const cellClass = cn(
      'px-3 py-2 border-r flex items-center',
      isSticky && 'sticky left-0 z-10 bg-background'
    );

    switch (columnId) {
      case 'task':
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }}>
            <Checkbox
              checked={task.is_completed}
              onCheckedChange={() => onToggleComplete(task.task_id)}
              className="mr-3"
            />
            {isEditingTitle ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="h-7 flex-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className={cn(
                  'flex-1 truncate cursor-pointer hover:text-primary',
                  task.is_completed && 'line-through text-muted-foreground'
                )}
                onClick={() => setIsEditingTitle(true)}
              >
                {task.task_text}
              </span>
            )}
          </div>
        );

      case 'status':
        const statusOption = STATUS_OPTIONS.find(s => s.value === task.status);
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }}>
            <Select
              value={task.status || 'backlog'}
              onValueChange={(value) => onUpdate(task.task_id, { status: value as any })}
            >
              <SelectTrigger className="h-7 border-0 shadow-none p-0">
                <Badge className={cn('text-xs', statusOption?.color || 'bg-muted')}>
                  {statusOption?.label || 'None'}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <Badge className={cn('text-xs', option.color)}>{option.label}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'scheduled_date':
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-7 px-2 w-full justify-start text-left font-normal">
                  {task.scheduled_date ? (
                    format(new Date(task.scheduled_date), 'MMM d')
                  ) : (
                    <span className="text-muted-foreground">Set date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={task.scheduled_date ? new Date(task.scheduled_date) : undefined}
                  onSelect={(date) => onUpdate(task.task_id, { scheduled_date: date ? format(date, 'yyyy-MM-dd') : null })}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'tags':
        const toggleTag = (tagValue: string) => {
          const currentTags = task.context_tags || [];
          const newTags = currentTags.includes(tagValue)
            ? currentTags.filter(t => t !== tagValue)
            : [...currentTags, tagValue];
          onUpdate(task.task_id, { context_tags: newTags });
        };
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex flex-wrap gap-1 cursor-pointer min-h-[24px] w-full">
                  {(task.context_tags || []).slice(0, 2).map(tag => {
                    const tagInfo = CONTEXT_TAGS.find(t => t.value === tag);
                    return (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tagInfo?.icon} {tagInfo?.label || tag}
                      </Badge>
                    );
                  })}
                  {(task.context_tags || []).length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{(task.context_tags || []).length - 2}
                    </Badge>
                  )}
                  {!(task.context_tags || []).length && (
                    <span className="text-muted-foreground text-xs hover:text-foreground">+ Add</span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  {CONTEXT_TAGS.map(tag => (
                    <div
                      key={tag.value}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted',
                        (task.context_tags || []).includes(tag.value) && 'bg-primary/10'
                      )}
                      onClick={() => toggleTag(tag.value)}
                    >
                      <span>{tag.icon}</span>
                      <span className="text-sm">{tag.label}</span>
                      {(task.context_tags || []).includes(tag.value) && (
                        <span className="ml-auto text-primary">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'priority':
        const priorityOption = PRIORITY_OPTIONS.find(p => p.value === task.priority);
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }}>
            <Select
              value={task.priority || ''}
              onValueChange={(value) => onUpdate(task.task_id, { priority: value })}
            >
              <SelectTrigger className="h-7 border-0 shadow-none p-0 w-full">
                {task.priority ? (
                  <Badge className={cn('text-xs', priorityOption?.color)}>{priorityOption?.label}</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <Badge className={cn('text-xs', option.color)}>{option.label}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'energy_level':
        const energyOption = ENERGY_LEVELS.find(e => e.value === task.energy_level);
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }}>
            <Select
              value={task.energy_level || ''}
              onValueChange={(value) => onUpdate(task.task_id, { energy_level: value as any })}
            >
              <SelectTrigger className="h-7 border-0 shadow-none p-0 w-full">
                {task.energy_level ? (
                  <span className={cn('text-xs', energyOption?.color)}>{energyOption?.label}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {ENERGY_LEVELS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'estimated_minutes':
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
            <Select
              value={task.estimated_minutes?.toString() || '__none__'}
              onValueChange={(value) => onUpdate(task.task_id, { estimated_minutes: value === '__none__' ? null : parseInt(value) })}
            >
              <SelectTrigger className="h-7 border-0 shadow-none p-0 w-full">
                {task.estimated_minutes ? (
                  <span className="text-sm">{task.estimated_minutes}m</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {DURATION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'sop':
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
            <SOPSelector
              value={task.sop_id}
              onChange={(sopId) => onUpdate(task.task_id, { sop_id: sopId })}
              size="sm"
            />
          </div>
        );

      case 'notes':
        return (
          <div key={columnId} className={cellClass} style={{ width, minWidth: width }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              <FileText className={cn('h-4 w-4', task.notes ? 'text-primary' : 'text-muted-foreground')} />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="flex items-center hover:bg-muted/30 border-t group"
      onClick={onClick}
    >
      {BOARD_COLUMNS.filter(col => visibleColumns.includes(col.id)).map((column, index) => 
        renderCell(column.id, index)
      )}
      
      {/* Actions */}
      <div className="flex-1 min-w-[60px] px-2 flex items-center justify-end opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MoveRight className="h-4 w-4 mr-2" />
                Move to group
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {currentSectionId && (
                  <DropdownMenuItem onClick={() => onMoveToSection(task.task_id, null)}>
                    Uncategorized
                  </DropdownMenuItem>
                )}
                {allSections.filter(s => s.id !== currentSectionId).map(section => (
                  <DropdownMenuItem
                    key={section.id}
                    onClick={() => onMoveToSection(task.task_id, section.id)}
                  >
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: section.color }} />
                    {section.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task.task_id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
