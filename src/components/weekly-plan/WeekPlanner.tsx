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
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { ChevronLeft, ChevronRight, Calendar, Trash2, Loader2, ChevronDown, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface WeekPlannerProps {
  initialCollapsed?: boolean;
  highlightTaskId?: string | null;
}

export function WeekPlanner({ initialCollapsed = false, highlightTaskId }: WeekPlannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(!initialCollapsed);
  const [isPulling, setIsPulling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Use centralized task data
  const { data: tasks = [], isLoading: loading } = useTasks();
  const { createTask, updateTask, toggleComplete, moveToDay } = useTaskMutations();
  
  // Settings
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [capacityMinutes, setCapacityMinutes] = useState(240);
  
  // Current week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Clear week confirmation
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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
    loadSettings();
  }, [loadSettings]);

  const handleTaskDrop = async (taskId: string, fromPlannedDay: string | null, targetDate: string) => {
    // Get max order for the target day and add 1
    const tasksOnDay = tasks.filter(t => t.planned_day === targetDate);
    const maxOrder = Math.max(0, ...tasksOnDay.map(t => t.day_order || 0));
    const newOrder = maxOrder + 1;

    moveToDay.mutate(
      { taskId, plannedDay: targetDate, dayOrder: newOrder },
      {
        onSuccess: () => {
          const targetDay = new Date(targetDate);
          toast({
            title: `Scheduled for ${format(targetDay, 'EEE')}`,
            duration: 2000,
          });
        },
      }
    );
  };

  const handleMoveToInbox = async (taskId: string) => {
    moveToDay.mutate({ taskId, plannedDay: null, dayOrder: 0 }, {
      onSuccess: () => {
        toast({
          title: 'Moved to inbox',
          duration: 2000,
        });
      },
    });
  };

  const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
    toggleComplete.mutate(taskId);
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
      
      // The realtime subscription will update the cache
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

  const handleQuickAdd = async (text: string, plannedDay: string | null = null) => {
    if (!text.trim() || !user) return;
    
    createTask.mutate({
      task_text: text.trim(),
      status: 'backlog',
      planned_day: plannedDay,
      day_order: plannedDay ? (Date.now() % 1000000) : 0,
    }, {
      onSuccess: () => {
        toast({ 
          title: plannedDay ? `Added to ${format(new Date(plannedDay), 'EEE')}` : 'Added to inbox',
          duration: 2000,
        });
      },
    });
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
        moveToDay.mutateAsync({ taskId: t.task_id, plannedDay: null, dayOrder: 0 })
      ));

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
              {/* Two-panel layout - narrower inbox, wider board */}
              <div className="flex gap-4" style={{ minHeight: '450px' }}>
                {/* Week Inbox - fixed width */}
                <div className="w-64 shrink-0">
                  <WeekInbox
                    tasks={tasks}
                    onTaskToggle={handleTaskToggle}
                    onPullUnfinished={handlePullUnfinished}
                    onAddTask={(text) => handleQuickAdd(text, null)}
                    onMoveToInbox={handleMoveToInbox}
                    isPulling={isPulling}
                    highlightTaskId={highlightTaskId}
                  />
                </div>

                {/* Week Board - takes remaining space */}
                <div className="flex-1 min-w-0">
                  <WeekBoard
                    tasks={tasks}
                    weekStartDay={weekStartDay}
                    capacityMinutes={capacityMinutes}
                    onTaskDrop={handleTaskDrop}
                    onTaskToggle={handleTaskToggle}
                    currentWeekStart={currentWeekStart}
                    onQuickAdd={handleQuickAdd}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
