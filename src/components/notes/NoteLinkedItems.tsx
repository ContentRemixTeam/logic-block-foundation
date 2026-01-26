import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ListTodo, Lightbulb, ChevronDown, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NoteLinkedItemsProps {
  noteId: string;
  noteType: 'entry' | 'page';
}

interface LinkedTask {
  task_id: string;
  task_text: string;
  is_completed: boolean;
  priority: string | null;
  scheduled_date: string | null;
  created_at: string;
}

interface LinkedIdea {
  id: string;
  content: string;
  priority: string | null;
  created_at: string;
}

export function NoteLinkedItems({ noteId, noteType }: NoteLinkedItemsProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [viewingTask, setViewingTask] = useState<LinkedTask | null>(null);
  const [viewingIdea, setViewingIdea] = useState<LinkedIdea | null>(null);

  // Fetch linked tasks
  const { data: linkedTasks = [] } = useQuery({
    queryKey: ['linked-tasks', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('task_id, task_text, is_completed, priority, scheduled_date, created_at')
        .eq('source_note_id', noteId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching linked tasks:', error);
        return [];
      }
      return data as LinkedTask[];
    },
    enabled: !!noteId,
  });

  // Fetch linked ideas
  const { data: linkedIdeas = [] } = useQuery({
    queryKey: ['linked-ideas', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ideas')
        .select('id, content, priority, created_at')
        .eq('source_note_id', noteId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching linked ideas:', error);
        return [];
      }
      return data as LinkedIdea[];
    },
    enabled: !!noteId,
  });

  const totalItems = linkedTasks.length + linkedIdeas.length;

  if (totalItems === 0) {
    return null;
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'low': return 'bg-muted text-muted-foreground border-border';
      case 'asap': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'next_week': return 'bg-warning/10 text-warning border-warning/30';
      case 'next_month': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'someday': return 'bg-muted text-muted-foreground border-border';
      default: return '';
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between px-3 py-2 h-auto text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs">✨</span>
              Created from this note
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {totalItems}
              </Badge>
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2 pt-2">
            {/* Tasks */}
            {linkedTasks.map((task) => (
              <button
                key={task.task_id}
                onClick={() => setViewingTask(task)}
                className={cn(
                  "w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors",
                  "hover:bg-muted/50 hover:border-primary/30",
                  task.is_completed && "opacity-60"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-md shrink-0",
                  "bg-blue-100 dark:bg-blue-900/40"
                )}>
                  {task.is_completed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <ListTodo className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium line-clamp-2",
                    task.is_completed && "line-through"
                  )}>
                    {task.task_text}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.priority && (
                      <Badge variant="outline" className={cn("text-xs py-0 capitalize", getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                    )}
                    {task.scheduled_date && (
                      <span className="text-xs text-muted-foreground">
                        📅 {format(new Date(task.scheduled_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Ideas */}
            {linkedIdeas.map((idea) => (
              <button
                key={idea.id}
                onClick={() => setViewingIdea(idea)}
                className={cn(
                  "w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors",
                  "hover:bg-muted/50 hover:border-primary/30"
                )}
              >
                <div className="p-1.5 rounded-md shrink-0 bg-amber-100 dark:bg-amber-900/40">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">
                    {idea.content}
                  </p>
                  {idea.priority && (
                    <Badge variant="outline" className={cn("text-xs py-0 capitalize mt-1", getPriorityColor(idea.priority))}>
                      {idea.priority.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Task View Modal */}
      <Dialog open={!!viewingTask} onOpenChange={() => setViewingTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                {viewingTask?.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <ListTodo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              Task
            </DialogTitle>
          </DialogHeader>
          {viewingTask && (
            <div className="space-y-4 py-4">
              <div>
                <p className={cn(
                  "text-base font-medium",
                  viewingTask.is_completed && "line-through text-muted-foreground"
                )}>
                  {viewingTask.task_text}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {viewingTask.is_completed && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </Badge>
                )}
                {viewingTask.priority && (
                  <Badge variant="outline" className={cn("capitalize", getPriorityColor(viewingTask.priority))}>
                    {viewingTask.priority} priority
                  </Badge>
                )}
                {viewingTask.scheduled_date && (
                  <Badge variant="outline">
                    📅 {format(new Date(viewingTask.scheduled_date), 'MMMM d, yyyy')}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Created {format(new Date(viewingTask.created_at), 'PPP')}
              </div>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => {
                  setViewingTask(null);
                  navigate('/tasks');
                }}
              >
                <ExternalLink className="h-4 w-4" />
                View in Tasks
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Idea View Modal */}
      <Dialog open={!!viewingIdea} onOpenChange={() => setViewingIdea(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              Idea
            </DialogTitle>
          </DialogHeader>
          {viewingIdea && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-base whitespace-pre-wrap">
                  {viewingIdea.content}
                </p>
              </div>
              {viewingIdea.priority && (
                <Badge variant="outline" className={cn("capitalize", getPriorityColor(viewingIdea.priority))}>
                  {viewingIdea.priority.replace('_', ' ')}
                </Badge>
              )}
              <div className="text-xs text-muted-foreground">
                Captured {format(new Date(viewingIdea.created_at), 'PPP')}
              </div>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => {
                  setViewingIdea(null);
                  navigate('/ideas');
                }}
              >
                <ExternalLink className="h-4 w-4" />
                View in Ideas
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
