import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, addDays, subDays, format, isThisWeek } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Task } from '@/components/tasks/types';
import { WeekInbox } from './WeekInbox';
import { WeekBoard } from './WeekBoard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Calendar, Trash2, Loader2, ChevronDown, CalendarDays, RotateCcw } from 'lucide-react';
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
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [capacityMinutes, setCapacityMinutes] = useState(240);
  
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
          day_order: Date.now(),
        }
      });

      if (error) throw error;
      
      // Show toast for scheduling
      const targetDay = new Date(targetDate);
      toast({
        title: `Scheduled for ${format(targetDay, 'EEE')}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      loadTasks();
      toast({
        title: 'Error moving task',
        variant: 'destructive',
      });
    }
  };

  const handleMoveToInbox = async (taskId: string) => {
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
      
      toast({
        title: 'Moved to inbox',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error moving task to inbox:', error);
      loadTasks();
    }
  };

  const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
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
      const weekEnd = addDays(currentWeekStart, 6);
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      
      const tasksToMove = tasks.filter(t => {
        if (!t.planned_day) return false;
        return t.planned_day >= weekStartStr && t.planned_day <= weekEndStr;
      });

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

  const isCurrentWeek = isThisWeek(currentWeekStart, { weekStartsOn: weekStartDay as 0 | 1 });

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="overflow-hidden" id="plan-your-week">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-card border-b">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left: Title */}
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Plan Your Week</h2>
              </div>

              {/* Center: Week Navigation */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2 min-w-[140px] text-center">
                  {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d')}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1">
                {!isCurrentWeek && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToCurrentWeek}>
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Today</TooltipContent>
                  </Tooltip>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClearConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear week</TooltipContent>
                </Tooltip>

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
          
          <CollapsibleContent>
            <CardContent className="p-4 bg-muted/30">
              {/* Two-panel layout */}
              <div className="grid grid-cols-12 gap-4" style={{ minHeight: '420px' }}>
                {/* Week Inbox - 35% */}
                <div className="col-span-12 md:col-span-4 lg:col-span-3">
                  <WeekInbox
                    tasks={tasks}
                    onTaskToggle={handleTaskToggle}
                    onPullUnfinished={handlePullUnfinished}
                    onAddTask={() => setQuickAddOpen(true)}
                    onMoveToInbox={handleMoveToInbox}
                    isPulling={isPulling}
                  />
                </div>

                {/* Week Board - 65% */}
                <div className="col-span-12 md:col-span-8 lg:col-span-9">
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
    </TooltipProvider>
  );
}