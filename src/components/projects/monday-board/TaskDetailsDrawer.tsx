import { Task, ENERGY_LEVELS, ChecklistItem, ChecklistProgress } from '@/components/tasks/types';
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
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Trash2, Clock, ClipboardList, Cloud, CloudOff } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SOPSelector } from '@/components/tasks/SOPSelector';
import { useSOPs } from '@/hooks/useSOPs';
import { CoachYourselfModal, CoachingHistorySection } from '@/components/coaching';
import { TagManager } from '@/components/tasks/TagManager';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

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
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { data: sops = [] } = useSOPs();
  const isOnline = useOnlineStatus();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localStorageKey = `task_edit_draft_${task?.task_id}`;

  useEffect(() => {
    setLocalTask(task);
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  }, [task]);

  // Save draft to localStorage whenever task changes
  useEffect(() => {
    if (localTask && hasUnsavedChanges) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify({
          data: localTask,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        console.error('Failed to save task draft:', e);
      }
    }
  }, [localTask, hasUnsavedChanges, localStorageKey]);

  // Restore draft on mount if exists
  useEffect(() => {
    if (task) {
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const age = Date.now() - new Date(timestamp).getTime();
          // Only restore if draft is less than 1 hour old and different from current
          if (age < 60 * 60 * 1000 && JSON.stringify(data) !== JSON.stringify(task)) {
            setLocalTask(data);
            setHasUnsavedChanges(true);
          } else {
            localStorage.removeItem(localStorageKey);
          }
        }
      } catch (e) {
        console.error('Failed to restore task draft:', e);
      }
    }
  }, [task?.task_id]);

  // Beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!task || !localTask) return null;

  // Get the full SOP data if a task has an SOP attached
  const attachedSop = localTask.sop_id ? sops.find(s => s.sop_id === localTask.sop_id) : null;

  const handleChange = useCallback((field: keyof Task, value: any) => {
    setLocalTask(prev => prev ? { ...prev, [field]: value } : null);
    setHasUnsavedChanges(true);
    setSaveStatus('saving');

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        onUpdate(task.task_id, { [field]: value });
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        // Clear localStorage on successful save
        localStorage.removeItem(localStorageKey);
        // Reset status after delay
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to save task:', error);
        setSaveStatus('error');
      }
    }, 1000);
  }, [task?.task_id, onUpdate, localStorageKey]);

  const handleTagToggle = (tag: string) => {
    const currentTags = localTask.context_tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    handleChange('context_tags', newTags);
  };

  const handleChecklistToggle = (itemId: string) => {
    const currentProgress = localTask.checklist_progress || [];
    const existingItem = currentProgress.find((p: ChecklistProgress) => p.item_id === itemId);
    
    let newProgress: ChecklistProgress[];
    if (existingItem) {
      newProgress = currentProgress.map((p: ChecklistProgress) => 
        p.item_id === itemId ? { ...p, completed: !p.completed } : p
      );
    } else {
      newProgress = [...currentProgress, { item_id: itemId, completed: true }];
    }
    
    handleChange('checklist_progress', newProgress);
  };

  const isChecklistItemCompleted = (itemId: string): boolean => {
    const progress = localTask.checklist_progress || [];
    const item = progress.find((p: ChecklistProgress) => p.item_id === itemId);
    return item?.completed || false;
  };

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">Task Details</SheetTitle>
            {/* Save status indicator */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {!isOnline && <CloudOff className="h-3 w-3 text-amber-500" />}
              {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
              {saveStatus === 'saved' && <span className="text-green-600">✓ Saved</span>}
              {saveStatus === 'error' && <span className="text-destructive">Save failed</span>}
            </div>
          </div>
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
            <TagManager
              selectedTags={localTask.context_tags || []}
              onTagsChange={(tags) => setLocalTask({ ...localTask, context_tags: tags })}
              showManageButton={false}
            />
          </div>

          {/* SOP */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Standard Operating Procedure
            </Label>
            <SOPSelector
              value={localTask.sop_id}
              onChange={(sopId) => handleChange('sop_id', sopId)}
            />
            
            {/* SOP Checklist */}
            {attachedSop && attachedSop.checklist_items && attachedSop.checklist_items.length > 0 && (
              <div className="mt-3 bg-primary/5 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Checklist ({(localTask.checklist_progress || []).filter((p: ChecklistProgress) => p.completed).length}/{attachedSop.checklist_items.length})
                </div>
                {attachedSop.checklist_items
                  .sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order)
                  .map((item: ChecklistItem) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={isChecklistItemCompleted(item.id)}
                        onCheckedChange={() => handleChecklistToggle(item.id)}
                      />
                      <span className={cn(
                        'text-sm',
                        isChecklistItemCompleted(item.id) && 'line-through text-muted-foreground'
                      )}>
                        {item.text}
                      </span>
                    </div>
                  ))}
              </div>
            )}
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

          {/* Coaching Section */}
          <Separator />
          <CoachingHistorySection 
            taskId={task.task_id} 
            onCoachClick={() => setShowCoachingModal(true)}
          />

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

      {/* Coaching Modal */}
      <CoachYourselfModal
        open={showCoachingModal}
        onOpenChange={setShowCoachingModal}
        task={task}
      />
    </Sheet>
  );
}
