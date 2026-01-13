import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, ListTodo, Lightbulb, Brain, Trophy } from 'lucide-react';
import { normalizeArray } from '@/lib/normalize';

interface ProcessedItem {
  type: 'task' | 'idea' | 'thought' | 'win';
  text: string;
  id?: string;
}

interface TaskItem extends ProcessedItem {
  type: 'task';
  schedule: 'today' | 'tomorrow' | 'this_week' | 'later';
  priority: 'high' | 'medium' | 'low';
}

interface IdeaItem extends ProcessedItem {
  type: 'idea';
  categoryId: string;
}

interface OrganizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processedData: {
    processed: {
      tasks?: number;
      ideas?: number;
      thoughts?: number;
      wins?: number;
    };
    createdIds?: {
      taskIds?: string[];
      ideaIds?: string[];
      thoughtIds?: string[];
    };
  } | null;
  scratchPadContent: string;
  onComplete: () => void;
}

interface IdeaCategory {
  id: string;
  name: string;
  color: string;
}

export function ScratchPadOrganizeModal({
  open,
  onOpenChange,
  processedData,
  scratchPadContent,
  onComplete,
}: OrganizeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [categories, setCategories] = useState<IdeaCategory[]>([]);
  const [thoughtCount, setThoughtCount] = useState(0);
  const [winCount, setWinCount] = useState(0);
  const [processedKey, setProcessedKey] = useState<string>('');

  // Reset processedKey when modal closes
  useEffect(() => {
    if (!open) {
      setProcessedKey('');
    }
  }, [open]);

  // Fetch actual items from database using the IDs returned by the backend
  useEffect(() => {
    if (!open || !processedData) return;

    // Create a unique key for this processed data
    const dataKey = JSON.stringify(processedData.createdIds);
    
    // CRITICAL: Only fetch if this is NEW data (prevents infinite loop)
    if (dataKey === processedKey) return;
    setProcessedKey(dataKey);

    const fetchCreatedItems = async () => {
      const taskIds = processedData.createdIds?.taskIds || [];
      const ideaIds = processedData.createdIds?.ideaIds || [];

      // Fetch actual task records from the database
      if (taskIds.length > 0) {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('task_id, task_text, priority, scheduled_date')
          .in('task_id', taskIds);

        if (taskError) {
          console.error('Error fetching tasks:', taskError);
        } else if (taskData) {
          setTasks(taskData.map(t => ({
            type: 'task' as const,
            id: t.task_id,
            text: t.task_text || '',
            schedule: t.scheduled_date ? 'today' : 'later',
            priority: (t.priority as 'high' | 'medium' | 'low') || 'medium',
          })));
        }
      } else {
        setTasks([]);
      }

      // Fetch actual idea records from the database
      if (ideaIds.length > 0) {
        const { data: ideaData, error: ideaError } = await supabase
          .from('ideas')
          .select('id, content, category_id')
          .in('id', ideaIds);

        if (ideaError) {
          console.error('Error fetching ideas:', ideaError);
        } else if (ideaData) {
          setIdeas(ideaData.map(i => ({
            type: 'idea' as const,
            id: i.id,
            text: i.content || '',
            categoryId: i.category_id || '',
          })));
        }
      } else {
        setIdeas([]);
      }

      setThoughtCount(processedData.processed?.thoughts || 0);
      setWinCount(processedData.processed?.wins || 0);

      // Load idea categories
      loadCategories();
    };

    fetchCreatedItems();
  }, [open, processedData, processedKey]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-ideas');
      if (!error && data?.categories) {
        const cats: IdeaCategory[] = normalizeArray(data.categories).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          color: cat.color || '#3A3A3A',
        }));
        setCategories(cats);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const updateTask = (index: number, field: 'schedule' | 'priority', value: string) => {
    setTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    ));
  };

  const updateIdea = (index: number, categoryId: string) => {
    setIdeas(prev => prev.map((idea, i) => 
      i === index ? { ...idea, categoryId } : idea
    ));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Update tasks with schedule and priority
      for (const task of tasks) {
        if (!task.id) continue;
        
        let scheduledDate: string | null = null;
        const today = new Date();
        
        switch (task.schedule) {
          case 'today':
            scheduledDate = today.toISOString().split('T')[0];
            break;
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            scheduledDate = tomorrow.toISOString().split('T')[0];
            break;
          case 'this_week':
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
            scheduledDate = endOfWeek.toISOString().split('T')[0];
            break;
          case 'later':
            scheduledDate = null;
            break;
        }

        await supabase.functions.invoke('manage-task', {
          body: {
            action: 'update',
            task_id: task.id,
            scheduled_date: scheduledDate,
            priority: task.priority,
          },
        });
      }

      // Update ideas with categories
      for (const idea of ideas) {
        if (!idea.id || !idea.categoryId) continue;
        
        await supabase.functions.invoke('save-idea', {
          body: {
            id: idea.id,
            category_id: idea.categoryId,
          },
        });
      }

      toast({
        title: '✨ Items organized!',
        description: `Updated ${tasks.length} tasks and ${ideas.filter(i => i.categoryId).length} ideas`,
      });

      // Invalidate caches so data is immediately visible elsewhere
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving organization:', error);
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUseDefaults = () => {
    onComplete();
    onOpenChange(false);
  };

  const totalItems = tasks.length + ideas.length + thoughtCount + winCount;

  if (!processedData || totalItems === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Organize Processed Items
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Tasks Section */}
            {tasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Tasks ({tasks.length})</h3>
                </div>
                <div className="space-y-3">
                  {tasks.map((task, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/20">
                      <p className="text-sm font-medium">{task.text}</p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Schedule:</Label>
                          <Select
                            value={task.schedule}
                            onValueChange={(val) => updateTask(idx, 'schedule', val)}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="tomorrow">Tomorrow</SelectItem>
                              <SelectItem value="this_week">This Week</SelectItem>
                              <SelectItem value="later">Later</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Priority:</Label>
                          <Select
                            value={task.priority}
                            onValueChange={(val) => updateTask(idx, 'priority', val)}
                          >
                            <SelectTrigger className="h-8 w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ideas Section */}
            {ideas.length > 0 && (
              <>
                {tasks.length > 0 && <Separator />}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-accent" />
                    <h3 className="font-semibold">Ideas ({ideas.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {ideas.map((idea, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/20">
                        <p className="text-sm font-medium">{idea.text}</p>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Category:</Label>
                          <Select
                            value={idea.categoryId || "uncategorized"}
                            onValueChange={(val) => updateIdea(idx, val === "uncategorized" ? "" : val)}
                          >
                            <SelectTrigger className="h-8 w-[180px]">
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="uncategorized">Uncategorized</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: cat.color }}
                                    />
                                    {cat.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Auto-saved items (thoughts & wins) */}
            {(thoughtCount > 0 || winCount > 0) && (
              <>
                {(tasks.length > 0 || ideas.length > 0) && <Separator />}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Auto-saved</h3>
                  <div className="flex flex-wrap gap-2">
                    {thoughtCount > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Brain className="h-3 w-3" />
                        {thoughtCount} thought{thoughtCount > 1 ? 's' : ''} saved
                      </Badge>
                    )}
                    {winCount > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Trophy className="h-3 w-3" />
                        {winCount} win{winCount > 1 ? 's' : ''} captured
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleUseDefaults} disabled={saving}>
            Use Defaults
          </Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Organization'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}