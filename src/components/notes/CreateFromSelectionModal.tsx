import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { ListTodo, Lightbulb, CalendarIcon, FolderOpen, AlertCircle, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalType = 'task' | 'idea';

interface CreateFromSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ModalType;
  selectedText: string;
  sourceNoteId?: string;
  sourceNoteTitle?: string;
  sourceType?: 'entry' | 'page';
}

export function CreateFromSelectionModal({
  open,
  onOpenChange,
  type,
  selectedText,
  sourceNoteId,
  sourceNoteTitle,
  sourceType,
}: CreateFromSelectionModalProps) {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();
  
  // Task state
  const [taskText, setTaskText] = useState(selectedText);
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Idea state
  const [ideaContent, setIdeaContent] = useState(selectedText);

  // Reset state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      if (type === 'task') {
        setTaskText(selectedText);
        setTaskDescription('');
        setPriority(null);
        setScheduledDate(undefined);
        setProjectId(null);
      } else {
        setIdeaContent(selectedText);
        setProjectId(null);
      }
    }
    onOpenChange(isOpen);
  };

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('manage-task', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: 'create',
          task_text: taskText.trim(),
          task_description: taskDescription.trim() || null,
          priority: priority,
          scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
          project_id: projectId,
          source: 'manual',
          source_note_id: sourceNoteId || null,
          source_note_title: sourceNoteTitle || null,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast.success('✅ Task created from note!', {
        description: taskText.substring(0, 50) + (taskText.length > 50 ? '...' : ''),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    },
  });

  // Create idea mutation
  const createIdeaMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('save-idea', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          content: ideaContent.trim(),
          project_id: projectId,
          tags: [],
          source_note_id: sourceNoteId || null,
          source_note_title: sourceNoteTitle || null,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast.success('💡 Idea saved from note!', {
        description: ideaContent.substring(0, 50) + (ideaContent.length > 50 ? '...' : ''),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to save idea:', error);
      toast.error('Failed to save idea');
    },
  });

  const handleSubmit = () => {
    if (type === 'task') {
      if (!taskText.trim()) {
        toast.error('Task text is required');
        return;
      }
      createTaskMutation.mutate();
    } else {
      if (!ideaContent.trim()) {
        toast.error('Idea content is required');
        return;
      }
      createIdeaMutation.mutate();
    }
  };

  const isLoading = createTaskMutation.isPending || createIdeaMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'task' ? (
              <>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <ListTodo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Create Task
              </>
            ) : (
              <>
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                Save Idea
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected text preview */}
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
            <p className="text-sm italic line-clamp-3">"{selectedText}"</p>
          </div>

          {type === 'task' ? (
            <>
              {/* Task Title */}
              <div className="space-y-2">
                <Label htmlFor="task-text">Task</Label>
                <Input
                  id="task-text"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="What needs to be done?"
                  maxLength={500}
                />
              </div>

              {/* Task Description */}
              <div className="space-y-2">
                <Label htmlFor="task-description">Notes (optional)</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add any additional details..."
                  className="min-h-[80px] resize-none"
                  maxLength={5000}
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Priority
                </Label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <Badge
                      key={p}
                      variant={priority === p ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer capitalize transition-colors',
                        priority === p && p === 'high' && 'bg-destructive hover:bg-destructive/90',
                        priority === p && p === 'medium' && 'bg-warning hover:bg-warning/90',
                        priority === p && p === 'low' && 'bg-muted-foreground hover:bg-muted-foreground/90'
                      )}
                      onClick={() => setPriority(priority === p ? null : p)}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Due Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {scheduledDate ? format(scheduledDate, 'PPP') : 'Select a date (optional)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          ) : (
            <>
              {/* Idea Content */}
              <div className="space-y-2">
                <Label htmlFor="idea-content">Idea</Label>
                <Textarea
                  id="idea-content"
                  value={ideaContent}
                  onChange={(e) => setIdeaContent(e.target.value)}
                  placeholder="Capture your idea..."
                  className="min-h-[120px] resize-none"
                  maxLength={10000}
                />
              </div>
            </>
          )}

          {/* Project (shared) */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Project
              </Label>
              <Select
                value={projectId || 'none'}
                onValueChange={(v) => setProjectId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color || '#6B7280' }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : type === 'task' ? (
              '✅ Create Task'
            ) : (
              '💡 Save Idea'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
