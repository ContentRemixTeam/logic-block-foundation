import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, addDays, subDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Task } from '@/components/tasks/types';
import { WeekInbox } from './WeekInbox';
import { WeekBoard } from './WeekBoard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WeekPlannerProps {
  initialCollapsed?: boolean;
}

export function WeekPlanner({ initialCollapsed = false }: WeekPlannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(!initialCollapsed);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Settings
  const [weekStartDay, setWeekStartDay] = useState(1); // 1 = Monday
  const [capacityMinutes, setCapacityMinutes] = useState(240); // 4 hours
  
  // Current week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  
  // Quick add modal
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Clear week confirmation
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-all-tasks');
      
      if (error) throw error;
      
      setTasks(data?.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('task_settings')
        .select('weekly_capacity_minutes, week_start_day')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data) {
        if (data.weekly_capacity_minutes) setCapacityMinutes(data.weekly_capacity_minutes);
        if (data.week_start_day !== null) {
          setWeekStartDay(data.week_start_day);
          setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: data.week_start_day as 0 | 1 }));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
    loadSettings();
  }, [loadTasks, loadSettings]);

  const handleTaskDrop = async (taskId: string, fromPlannedDay: string | null, targetDate: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === taskId 
        ? { ...t, planned_day: targetDate, day_order: Date.now() }
        : t
    ));

    try {
      const { error } = await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          planned_day: targetDate,
          day_order: Date.now(), // Use timestamp for ordering
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task:', error);
      // Revert on error
      loadTasks();
      toast({
        title: 'Error moving task',
        variant: 'destructive',
      });
    }
  };

  const handleMoveToInbox = async (taskId: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === taskId 
        ? { ...t, planned_day: null, day_order: 0 }
        : t
    ));

    try {
      const { error } = await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          planned_day: null,
          day_order: 0,
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error moving task to inbox:', error);
      loadTasks();
    }
  };

  const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === taskId 
        ? { ...t, is_completed: !currentCompleted }
        : t
    ));

    try {
      const { error } = await supabase.functions.invoke('manage-task', {
        body: {
          action: 'toggle',
          task_id: taskId,
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling task:', error);
      loadTasks();
    }
  };

  const handlePullUnfinished = async () => {
    setIsPulling(true);
    try {
      const { data, error } = await supabase.functions.invoke('pull-unfinished-tasks');
      
      if (error) throw error;
      
      toast({
        title: data?.message || 'Tasks pulled to inbox',
        description: data?.count > 0 ? `Moved ${data.count} tasks` : undefined,
      });
      
      await loadTasks();
    } catch (error: any) {
      console.error('Error pulling tasks:', error);
      toast({
        title: 'Error pulling tasks',
        description: error?.message,
        variant: 'destructive',
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddText.trim() || !user) return;
    
    setIsAddingTask(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-task', {
        body: {
          action: 'create',
          task_text: quickAddText.trim(),
          status: 'backlog',
          planned_day: null,
        }
      });

      if (error) throw error;

      if (data?.data) {
        setTasks(prev => [data.data, ...prev]);
      }

      setQuickAddText('');
      setQuickAddOpen(false);
      toast({ title: 'Task added to inbox' });
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error adding task',
        description: error?.message,
        variant: 'destructive',
      });
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleClearWeek = async () => {
    setIsClearing(true);
    try {
      // Get all tasks for the current week
      const weekEnd = addDays(currentWeekStart, 6);
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      
      const tasksToMove = tasks.filter(t => {
        if (!t.planned_day) return false;
        return t.planned_day >= weekStartStr && t.planned_day <= weekEndStr;
      });

      // Update all in parallel
      await Promise.all(tasksToMove.map(t => 
        supabase.functions.invoke('manage-task', {
          body: {
            action: 'update',
            task_id: t.task_id,
            planned_day: null,
            day_order: 0,
          }
        })
      ));

      await loadTasks();
      setClearConfirmOpen(false);
      toast({ title: `Moved ${tasksToMove.length} tasks to inbox` });
    } catch (error: any) {
      console.error('Error clearing week:', error);
      toast({
        title: 'Error clearing week',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subDays(prev, 7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay as 0 | 1 }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan Your Week
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card id="plan-your-week">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Plan Your Week
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClearConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Week Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                  </span>
                  <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                    Today
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Two-panel layout */}
              <div className="grid grid-cols-12 gap-4" style={{ minHeight: '400px' }}>
                {/* Week Inbox - 35% */}
                <div className="col-span-4">
                  <WeekInbox
                    tasks={tasks}
                    onTaskToggle={handleTaskToggle}
                    onPullUnfinished={handlePullUnfinished}
                    onAddTask={() => setQuickAddOpen(true)}
                    isPulling={isPulling}
                  />
                </div>

                {/* Week Board - 65% */}
                <div className="col-span-8">
                  <WeekBoard
                    tasks={tasks}
                    weekStartDay={weekStartDay}
                    capacityMinutes={capacityMinutes}
                    onTaskDrop={handleTaskDrop}
                    onTaskToggle={handleTaskToggle}
                    currentWeekStart={currentWeekStart}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Quick Add Modal */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task to Inbox</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-text">Task</Label>
              <Input
                id="task-text"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                placeholder="What needs to be done?"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickAddText.trim()) {
                    handleQuickAdd();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAdd} disabled={!quickAddText.trim() || isAddingTask}>
              {isAddingTask && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Week Confirmation */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Week Plan?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This will move all planned tasks for this week back to the Week Inbox. Tasks won't be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearWeek} disabled={isClearing}>
              {isClearing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clear Week
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
