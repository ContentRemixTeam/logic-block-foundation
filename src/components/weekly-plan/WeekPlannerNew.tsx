import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { startOfWeek, addDays, subDays, format, isThisWeek, endOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useOfficeHours } from '@/hooks/useOfficeHours';
import { scheduleStore } from '@/lib/taskSchedulingStore';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { CalendarSelectionModal } from '@/components/google-calendar/CalendarSelectionModal';
import { OfficeHoursEditorModal } from '@/components/office-hours/OfficeHoursEditorModal';
import { CycleFocusBanner } from '@/components/cycle/CycleFocusBanner';
import { MastermindCallsPanel } from '@/components/mastermind/MastermindCallsPanel';

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
  const navigate = useNavigate();

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
    selectCalendars,
    syncNow,
    handleOAuthReturn,
  } = useGoogleCalendar();

  // Extract primitive values to avoid re-render loops
  const isGoogleConnected = googleStatus.connected;
  const isCalendarSelected = googleStatus.calendarSelected;

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Office hours from new hook
  const { officeHours, isWithinOfficeHours } = useOfficeHours();
  
  // Office hours modal
  const [officeHoursModalOpen, setOfficeHoursModalOpen] = useState(false);

  // Settings
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [capacityMinutes, setCapacityMinutes] = useState(240);

  // Current week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Clear week confirmation
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  
  // Weekend toggle
  const [showWeekend, setShowWeekend] = useState(true);
  
  // Mastermind calls
  const [mastermindPanelOpen, setMastermindPanelOpen] = useState(false);
  const [showMastermindCalls, setShowMastermindCalls] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      // Load task settings
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
      
      // Load works_weekends preference and show_mastermind_calls from user settings
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const userSettings = await res.json();
          if (userSettings.works_weekends !== undefined) {
            setShowWeekend(userSettings.works_weekends);
          }
          if (userSettings.show_mastermind_calls !== undefined) {
            setShowMastermindCalls(userSettings.show_mastermind_calls);
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Handle OAuth return from Google - only once on mount
  useEffect(() => {
    handleOAuthReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch calendar events for the current week
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!isGoogleConnected || !isCalendarSelected) {
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
    };

    fetchCalendarEvents();
  }, [currentWeekStart, weekStartDay, isGoogleConnected, isCalendarSelected]);

  const handleTaskDrop = async (taskId: string, fromPlannedDay: string | null, targetDate: string, timeSlot?: string) => {
    // Get the task to save previous state for undo
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;
    
    const previousState = {
      planned_day: task.planned_day,
      day_order: task.day_order,
      time_block_start: task.time_block_start,
    };
    
    // Get max order for the target day and add 1
    const tasksOnDay = tasks.filter((t) => t.planned_day === targetDate);
    const maxOrder = Math.max(0, ...tasksOnDay.map((t) => t.day_order || 0));
    const newOrder = maxOrder + 1;

    // Construct slot key for highlighting
    const slotKey = timeSlot ? `${targetDate}-${parseInt(timeSlot.split(':')[0], 10)}` : `${targetDate}-allday`;

    // If timeSlot provided, construct full ISO timestamp and update time_block_start
    const updates = timeSlot
      ? { planned_day: targetDate, day_order: newOrder, time_block_start: `${targetDate}T${timeSlot}:00` }
      : { planned_day: targetDate, day_order: newOrder, time_block_start: null };
    
    const newState = updates;
    
    updateTask.mutate(
      { taskId, updates },
      {
        onSuccess: () => {
          // Add slot highlight animation
          scheduleStore.addHighlightedSlot(slotKey);
          
          // Save undo action
          scheduleStore.pushUndo({
            taskId,
            taskText: task.task_text,
            previousState,
            newState,
            timestamp: Date.now(),
          });
          
          const targetDay = new Date(targetDate);
          const timeLabel = timeSlot ? ` at ${timeSlot}` : '';
          
          // Show toast with View and Undo actions
          toast.success('Task scheduled', {
            description: `${task.task_text.slice(0, 40)}${task.task_text.length > 40 ? '...' : ''} → ${format(targetDay, 'EEEE')}${timeLabel}`,
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => handleUndoSchedule(taskId, previousState),
            },
          });
        },
        onError: (error: any) => {
          toast.error('Failed to schedule task', {
            description: error?.message || 'Please try again',
          });
        },
      }
    );
  };

  const handleUndoSchedule = async (taskId: string, previousState: { planned_day: string | null; day_order: number | null; time_block_start: string | null }) => {
    updateTask.mutate(
      { 
        taskId, 
        updates: { 
          planned_day: previousState.planned_day, 
          day_order: previousState.day_order, 
          time_block_start: previousState.time_block_start 
        } 
      },
      {
        onSuccess: () => {
          toast.success('Scheduling undone');
        },
        onError: () => {
          toast.error('Failed to undo');
        },
      }
    );
  };

  const handleMoveToInbox = async (taskId: string) => {
    const task = tasks.find(t => t.task_id === taskId);
    const previousState = task ? {
      planned_day: task.planned_day,
      day_order: task.day_order,
      time_block_start: task.time_block_start,
    } : null;
    
    moveToDay.mutate(
      { taskId, plannedDay: null, dayOrder: 0 },
      {
        onSuccess: () => {
          toast.success('Moved to inbox', {
            action: previousState ? {
              label: 'Undo',
              onClick: () => handleUndoSchedule(taskId, previousState),
            } : undefined,
          });
        },
      }
    );
  };

  const handleTaskToggle = useCallback((taskId: string, currentCompleted: boolean) => {
    toggleComplete.mutate(taskId);
  }, [toggleComplete]);

  const handlePullUnfinished = async () => {
    setIsPulling(true);
    try {
      const { data, error } = await supabase.functions.invoke('pull-unfinished-tasks');

      if (error) throw error;

      toast.success(data?.message || 'Tasks pulled to inbox', {
        description: data?.count > 0 ? `Moved ${data.count} tasks` : undefined,
      });
    } catch (error: any) {
      console.error('Error pulling tasks:', error);
      toast.error('Error pulling tasks', {
        description: error?.message,
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
        onSuccess: (createdTask) => {
          const label = plannedDay ? `Added to ${format(new Date(plannedDay), 'EEE')}` : 'Added to inbox';
          toast.success(label, {
            action: {
              label: 'View',
              onClick: () => {
                if (plannedDay) {
                  navigate(`/weekly-plan?highlightTask=${createdTask?.task_id}`);
                } else {
                  navigate('/tasks');
                }
              },
            },
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
      toast.success(`Moved ${tasksToMove.length} tasks to inbox`);
    } catch (error: any) {
      console.error('Error clearing week:', error);
      toast.error('Error clearing week');
    } finally {
      setIsClearing(false);
    }
  };

  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart((prev) => subDays(prev, 7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay as 0 | 1 }));
  }, [weekStartDay]);

  const isCurrentWeek = useMemo(() => 
    isThisWeek(currentWeekStart, { weekStartsOn: weekStartDay as 0 | 1 }),
    [currentWeekStart, weekStartDay]
  );

  const handleTabChange = useCallback((tab: 'planner' | 'worksheet') => {
    onTabChange?.(tab);
  }, [onTabChange]);

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
        officeHoursBlocks={officeHours}
        onOpenOfficeHours={() => setOfficeHoursModalOpen(true)}
        googleConnected={googleStatus.connected && googleStatus.calendarSelected}
        googleCalendarName={googleStatus.calendarName}
        onConnectGoogle={() => connectGoogle('/weekly-plan')}
        onSyncGoogle={syncNow}
        googleSyncing={googleSyncing}
        onOpenMastermindCalls={() => setMastermindPanelOpen(true)}
        showMastermindCalls={showMastermindCalls}
      />

      {/* Cycle Focus Banner */}
      <CycleFocusBanner 
        showWeeklyGoal={true} 
        weekStartDate={format(currentWeekStart, 'yyyy-MM-dd')} 
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
              officeHoursBlocks={officeHours}
              showWeekend={showWeekend}
              onTaskDrop={handleTaskDrop}
              onTaskToggle={handleTaskToggle}
            />
          </div>
        </div>
      )}

      {/* Office Hours Editor Modal */}
      <OfficeHoursEditorModal
        open={officeHoursModalOpen}
        onOpenChange={setOfficeHoursModalOpen}
      />

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
        onSelect={selectCalendars}
        initialSelected={googleStatus.selectedCalendars}
      />

      {/* Mastermind Calls Panel */}
      <MastermindCallsPanel
        open={mastermindPanelOpen}
        onOpenChange={setMastermindPanelOpen}
        currentWeekStart={currentWeekStart}
      />
    </div>
  );
}
