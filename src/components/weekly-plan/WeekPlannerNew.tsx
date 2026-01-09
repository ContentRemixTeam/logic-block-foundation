import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, addDays, subDays, format, isThisWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { CalendarSelectionModal } from '@/components/google-calendar/CalendarSelectionModal';

// New UI Components
import { WeeklyPlannerHeader } from './WeeklyPlannerHeader';
import { WeeklyPlannerTabs } from './WeeklyPlannerTabs';
import { AvailableTasksSidebar } from './AvailableTasksSidebar';
import { WeeklyTimelineBoard } from './WeeklyTimelineBoard';

interface WeekPlannerNewProps {
  highlightTaskId?: string | null;
  onShowWorksheet?: () => void;
  activeTab?: 'planner' | 'worksheet';
  onTabChange?: (tab: 'planner' | 'worksheet') => void;
}

export function WeekPlannerNew({ 
  highlightTaskId, 
  onShowWorksheet,
  activeTab = 'planner',
  onTabChange 
}: WeekPlannerNewProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isPulling, setIsPulling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Use centralized task data
  const { data: tasks = [], isLoading: loading } = useTasks();
  const { createTask, updateTask, toggleComplete, moveToDay } = useTaskMutations();

  // Google Calendar integration
  const {
    status: googleStatus,
    loading: googleLoading,
    syncing: googleSyncing,
    calendars,
    showCalendarModal,
    setShowCalendarModal,
    connect: connectGoogle,
    selectCalendar,
    syncNow,
    handleOAuthReturn,
  } = useGoogleCalendar();

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Settings
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [capacityMinutes, setCapacityMinutes] = useState(240);
  const [officeHoursStart, setOfficeHoursStart] = useState('9:00');
  const [officeHoursEnd, setOfficeHoursEnd] = useState('17:00');

  // Current week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Clear week confirmation
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  
  // Weekend toggle
  const [showWeekend, setShowWeekend] = useState(true);

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

  // Handle OAuth return from Google
  useEffect(() => {
    handleOAuthReturn();
  }, [handleOAuthReturn]);

  // Fetch calendar events for the current week
  const fetchCalendarEvents = useCallback(async () => {
    if (!googleStatus.connected || !googleStatus.calendarSelected) {
      setCalendarEvents([]);
      return;
    }

    setLoadingEvents(true);
    try {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: weekStartDay as 0 | 1 });
      const startDate = currentWeekStart.toISOString();
      const endDate = addDays(weekEnd, 1).toISOString();

      const { data, error } = await supabase.functions.invoke('get-calendar-events', {
        body: { startDate, endDate },
      });

      if (error) throw error;
      setCalendarEvents(data?.events || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setCalendarEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [currentWeekStart, weekStartDay, googleStatus.connected, googleStatus.calendarSelected]);

  // Fetch events when week changes or google connects
  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const handleTaskDrop = async (taskId: string, fromPlannedDay: string | null, targetDate: string, timeSlot?: string) => {
    // Get max order for the target day and add 1
    const tasksOnDay = tasks.filter((t) => t.planned_day === targetDate);
    const maxOrder = Math.max(0, ...tasksOnDay.map((t) => t.day_order || 0));
    const newOrder = maxOrder + 1;

    // If timeSlot provided, also update time_block_start
    if (timeSlot) {
      updateTask.mutate(
        { taskId, updates: { planned_day: targetDate, day_order: newOrder, time_block_start: timeSlot } },
        {
          onSuccess: () => {
            const targetDay = new Date(targetDate);
            toast({
              title: `Scheduled for ${format(targetDay, 'EEE')} at ${timeSlot}`,
              duration: 2000,
            });
          },
        }
      );
    } else {
      // When moving to All Day (no time slot), explicitly clear time_block_start
      updateTask.mutate(
        { taskId, updates: { planned_day: targetDate, day_order: newOrder, time_block_start: null } },
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
    }
  };

  const handleMoveToInbox = async (taskId: string) => {
    moveToDay.mutate(
      { taskId, plannedDay: null, dayOrder: 0 },
      {
        onSuccess: () => {
          toast({
            title: 'Moved to inbox',
            duration: 2000,
          });
        },
      }
    );
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

    createTask.mutate(
      {
        task_text: text.trim(),
        status: 'backlog',
        planned_day: plannedDay,
        day_order: plannedDay ? Date.now() % 1000000 : 0,
      },
      {
        onSuccess: () => {
          toast({
            title: plannedDay ? `Added to ${format(new Date(plannedDay), 'EEE')}` : 'Added to inbox',
            duration: 2000,
          });
        },
      }
    );
  };

  const handleClearWeek = async () => {
    setIsClearing(true);
    try {
      const weekEnd = addDays(currentWeekStart, 6);
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      const tasksToMove = tasks.filter((t) => {
        if (!t.planned_day) return false;
        return t.planned_day >= weekStartStr && t.planned_day <= weekEndStr;
      });

      await Promise.all(
        tasksToMove.map((t) => moveToDay.mutateAsync({ taskId: t.task_id, plannedDay: null, dayOrder: 0 }))
      );

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
    setCurrentWeekStart((prev) => subDays(prev, 7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay as 0 | 1 }));
  };

  const isCurrentWeek = isThisWeek(currentWeekStart, { weekStartsOn: weekStartDay as 0 | 1 });

  const handleTabChange = (tab: 'planner' | 'worksheet') => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <WeeklyPlannerHeader
        currentWeekStart={currentWeekStart}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onGoToToday={goToCurrentWeek}
        isCurrentWeek={isCurrentWeek}
        showWeekend={showWeekend}
        onToggleWeekend={() => setShowWeekend(prev => !prev)}
        googleConnected={googleStatus.connected && googleStatus.calendarSelected}
        googleCalendarName={googleStatus.calendarName}
        onConnectGoogle={() => connectGoogle('/weekly-plan')}
        onSyncGoogle={syncNow}
        googleSyncing={googleSyncing}
      />

      {/* Week Label */}
      <div className="text-center">
        <h2 className="text-lg font-medium">
          Week of {format(currentWeekStart, 'MMMM d, yyyy')}
        </h2>
      </div>

      {/* Tabs */}
      <WeeklyPlannerTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Task Planner Content */}
      {activeTab === 'planner' && (
        <div className="flex gap-4" style={{ minHeight: '600px' }}>
          {/* Available Tasks Sidebar */}
          <div className="w-56 shrink-0">
            <AvailableTasksSidebar
              tasks={tasks}
              onTaskToggle={handleTaskToggle}
              onPullUnfinished={handlePullUnfinished}
              onAddTask={(text) => handleQuickAdd(text, null)}
              onMoveToInbox={handleMoveToInbox}
              isPulling={isPulling}
              highlightTaskId={highlightTaskId}
            />
          </div>

          {/* Timeline Board */}
          <div className="flex-1 min-w-0">
            <WeeklyTimelineBoard
              tasks={tasks}
              calendarEvents={calendarEvents}
              currentWeekStart={currentWeekStart}
              officeHoursStart={officeHoursStart}
              officeHoursEnd={officeHoursEnd}
              showWeekend={showWeekend}
              onTaskDrop={handleTaskDrop}
              onTaskToggle={handleTaskToggle}
            />
          </div>
        </div>
      )}

      {/* Clear Week Confirmation */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Week Plan?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This will move all planned tasks for this week back to the Available Tasks. Tasks won't be deleted.
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

      {/* Google Calendar Selection Modal */}
      <CalendarSelectionModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        calendars={calendars}
        onSelect={selectCalendar}
      />
    </div>
  );
}
