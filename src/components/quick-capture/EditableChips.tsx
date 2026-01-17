import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Calendar as CalendarIcon, Clock, Timer, Flag, Hash, Plus, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ParsedTask } from './useCaptureTypeDetection';
import { useProjects } from '@/hooks/useProjects';

interface EditableChipsProps {
  parsedTask: ParsedTask;
  onUpdate: (updates: Partial<ParsedTask>) => void;
}

export function EditableChips({ parsedTask, onUpdate }: EditableChipsProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const newTagInputRef = useRef<HTMLInputElement>(null);
  const { data: projects = [] } = useProjects();

  // Focus new tag input when editing
  useEffect(() => {
    if (editingField === 'newTag' && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [editingField]);

  const handleRemoveDate = () => {
    onUpdate({ date: null });
  };

  const handleDateChange = (date: Date | undefined) => {
    onUpdate({ date: date || null });
    setEditingField(null);
  };

  const handleRemoveTime = () => {
    onUpdate({ time: null });
  };

  const handleTimeChange = (time: string) => {
    onUpdate({ time });
    setEditingField(null);
  };

  const handleRemoveDuration = () => {
    onUpdate({ duration: null });
  };

  const handleDurationChange = (duration: number) => {
    onUpdate({ duration });
    setEditingField(null);
  };

  const handleRemovePriority = () => {
    onUpdate({ priority: null });
  };

  const handlePriorityChange = (priority: string) => {
    onUpdate({ priority: priority as 'high' | 'medium' | 'low' });
    setEditingField(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({ tags: parsedTask.tags.filter(t => t !== tagToRemove) });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !parsedTask.tags.includes(newTag.trim())) {
      onUpdate({ tags: [...parsedTask.tags, newTag.trim()] });
      setNewTag('');
    }
    setEditingField(null);
  };

  const handleProjectChange = (projectId: string | null) => {
    onUpdate({ projectId: projectId || undefined });
    setEditingField(null);
  };

  const handleRemoveProject = () => {
    onUpdate({ projectId: undefined });
  };

  const timeOptions = [
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
    '9:00 PM', '9:30 PM', '10:00 PM'
  ];

  const durationOptions = [
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '45m', value: 45 },
    { label: '1h', value: 60 },
    { label: '1.5h', value: 90 },
    { label: '2h', value: 120 },
    { label: '3h', value: 180 },
    { label: '4h', value: 240 },
  ];

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Date chip */}
      {parsedTask.date ? (
        <Popover open={editingField === 'date'} onOpenChange={(open) => setEditingField(open ? 'date' : null)}>
          <PopoverTrigger asChild>
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-secondary/80 gap-1 pr-1"
            >
              <CalendarIcon className="h-3 w-3" />
              {format(parsedTask.date, 'EEE, MMM d')}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveDate(); }}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parsedTask.date}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={editingField === 'date'} onOpenChange={(open) => setEditingField(open ? 'date' : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              Add date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Time chip */}
      {parsedTask.time ? (
        <Popover open={editingField === 'time'} onOpenChange={(open) => setEditingField(open ? 'time' : null)}>
          <PopoverTrigger asChild>
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-secondary/80 gap-1 pr-1"
            >
              <Clock className="h-3 w-3" />
              {parsedTask.time}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveTime(); }}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
              {timeOptions.map(time => (
                <Button
                  key={time}
                  variant={parsedTask.time === time ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs justify-start"
                  onClick={() => handleTimeChange(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={editingField === 'time'} onOpenChange={(open) => setEditingField(open ? 'time' : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              Add time
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
              {timeOptions.map(time => (
                <Button
                  key={time}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs justify-start"
                  onClick={() => handleTimeChange(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Duration chip */}
      {parsedTask.duration ? (
        <Popover open={editingField === 'duration'} onOpenChange={(open) => setEditingField(open ? 'duration' : null)}>
          <PopoverTrigger asChild>
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-secondary/80 gap-1 pr-1"
            >
              <Timer className="h-3 w-3" />
              {formatDuration(parsedTask.duration)}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveDuration(); }}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-2" align="start">
            <div className="grid grid-cols-2 gap-1">
              {durationOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant={parsedTask.duration === opt.value ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleDurationChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={editingField === 'duration'} onOpenChange={(open) => setEditingField(open ? 'duration' : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
              <Timer className="h-3 w-3" />
              Duration
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-2" align="start">
            <div className="grid grid-cols-2 gap-1">
              {durationOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleDurationChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Priority chip */}
      {parsedTask.priority ? (
        <Popover open={editingField === 'priority'} onOpenChange={(open) => setEditingField(open ? 'priority' : null)}>
          <PopoverTrigger asChild>
            <Badge 
              variant="outline"
              className={cn(
                "text-xs cursor-pointer gap-1 pr-1",
                parsedTask.priority === 'high' && "border-priority-high text-priority-high hover:bg-priority-high/10",
                parsedTask.priority === 'medium' && "border-priority-medium text-priority-medium hover:bg-priority-medium/10",
                parsedTask.priority === 'low' && "border-priority-low text-priority-low hover:bg-priority-low/10"
              )}
            >
              <Flag className="h-3 w-3" />
              {parsedTask.priority}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemovePriority(); }}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-2" align="start">
            <div className="flex flex-col gap-1">
              {['high', 'medium', 'low'].map(p => (
                <Button
                  key={p}
                  variant={parsedTask.priority === p ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-7 text-xs justify-start gap-2",
                    p === 'high' && parsedTask.priority !== p && "text-priority-high",
                    p === 'medium' && parsedTask.priority !== p && "text-priority-medium",
                  )}
                  onClick={() => handlePriorityChange(p)}
                >
                  <Flag className="h-3 w-3" />
                  {p}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={editingField === 'priority'} onOpenChange={(open) => setEditingField(open ? 'priority' : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
              <Flag className="h-3 w-3" />
              Priority
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-2" align="start">
            <div className="flex flex-col gap-1">
              {['high', 'medium', 'low'].map(p => (
                <Button
                  key={p}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 text-xs justify-start gap-2",
                    p === 'high' && "text-priority-high",
                    p === 'medium' && "text-priority-medium",
                  )}
                  onClick={() => handlePriorityChange(p)}
                >
                  <Flag className="h-3 w-3" />
                  {p}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Project chip */}
      {parsedTask.projectId ? (
        <Popover open={editingField === 'project'} onOpenChange={(open) => setEditingField(open ? 'project' : null)}>
          <PopoverTrigger asChild>
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-secondary/80 gap-1 pr-1"
            >
              <FolderKanban className="h-3 w-3" />
              {projects.find(p => p.id === parsedTask.projectId)?.name || 'Project'}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveProject(); }}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {projects.filter(p => !p.is_template).map(project => (
                <Button
                  key={project.id}
                  variant={parsedTask.projectId === project.id ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs justify-start gap-2"
                  onClick={() => handleProjectChange(project.id)}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
                  />
                  {project.name}
                </Button>
              ))}
              {projects.filter(p => !p.is_template).length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No projects yet</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={editingField === 'project'} onOpenChange={(open) => setEditingField(open ? 'project' : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              Project
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {projects.filter(p => !p.is_template).map(project => (
                <Button
                  key={project.id}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs justify-start gap-2"
                  onClick={() => handleProjectChange(project.id)}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
                  />
                  {project.name}
                </Button>
              ))}
              {projects.filter(p => !p.is_template).length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No projects yet</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Tag chips */}
      {parsedTask.tags.map(tag => (
        <Badge 
          key={tag}
          variant="outline" 
          className="text-xs gap-1 pr-1"
        >
          <Hash className="h-3 w-3" />
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Add tag button */}
      <Popover open={editingField === 'newTag'} onOpenChange={(open) => setEditingField(open ? 'newTag' : null)}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
            <Plus className="h-3 w-3" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-2" align="start">
          <div className="flex gap-1">
            <Input
              ref={newTagInputRef}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Tag name"
              className="h-7 text-xs"
            />
            <Button size="sm" className="h-7" onClick={handleAddTag}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
