import { Task, ENERGY_LEVELS, CONTEXT_TAGS } from '@/components/tasks/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Trash2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TaskDetailsDrawerProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'focus', label: 'Focus' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'someday', label: 'Someday' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
];

export function TaskDetailsDrawer({ task, onClose, onUpdate, onDelete }: TaskDetailsDrawerProps) {
  const [localTask, setLocalTask] = useState<Task | null>(task);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  if (!task || !localTask) return null;

  const handleChange = (field: keyof Task, value: any) => {
    setLocalTask(prev => prev ? { ...prev, [field]: value } : null);
    onUpdate(task.task_id, { [field]: value });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = localTask.context_tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    handleChange('context_tags', newTags);
  };

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Task Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={localTask.is_completed}
                onCheckedChange={(checked) => handleChange('is_completed', checked)}
              />
              <Input
                value={localTask.task_text}
                onChange={(e) => handleChange('task_text', e.target.value)}
                className="text-lg font-medium border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
              />
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={localTask.status || ''}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={localTask.priority || ''}
                onValueChange={(value) => handleChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localTask.scheduled_date
                    ? format(new Date(localTask.scheduled_date), 'PPP')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localTask.scheduled_date ? new Date(localTask.scheduled_date) : undefined}
                  onSelect={(date) => handleChange('scheduled_date', date ? format(date, 'yyyy-MM-dd') : null)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Energy & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Energy Level</Label>
              <Select
                value={localTask.energy_level || ''}
                onValueChange={(value) => handleChange('energy_level', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select energy" />
                </SelectTrigger>
                <SelectContent>
                  {ENERGY_LEVELS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estimated Time</Label>
              <Select
                value={localTask.estimated_minutes?.toString() || ''}
                onValueChange={(value) => handleChange('estimated_minutes', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_TAGS.map(tag => (
                <Badge
                  key={tag.value}
                  variant={(localTask.context_tags || []).includes(tag.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag.value)}
                >
                  {tag.icon} {tag.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={localTask.task_description || ''}
              onChange={(e) => handleChange('task_description', e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={localTask.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add notes..."
              rows={4}
            />
          </div>

          {/* Project info */}
          {localTask.project && (
            <div className="space-y-2">
              <Label>Project</Label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: localTask.project.color }} 
                />
                <span className="text-sm">{localTask.project.name}</span>
              </div>
            </div>
          )}

          {/* Delete button */}
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                onDelete(task.task_id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
