import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isBefore, startOfDay, startOfToday } from 'date-fns';
import { 
  DndContext, 
  DragOverlay, 
  DragStartEvent, 
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarEventBlock, CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { CurrentTimeIndicator } from '@/components/tasks/views/CurrentTimeIndicator';
import { TasksPool } from './TasksPool';
import { TimeSlot } from './TimeSlot';
import { Task } from '@/components/tasks/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Calendar, 
  RefreshCw, 
  CalendarDays,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';

interface DailyScheduleViewProps {
  onTaskToggle?: (taskId: string, currentStatus: boolean) => void;
  onTaskClick?: (task: Task) => void;
  onTaskSchedule?: (taskId: string, time: string) => void;
  onTaskUnschedule?: (taskId: string) => void;
  officeHoursStart?: number;
  officeHoursEnd?: number;
}

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 17;

// Dragging task overlay component
function DraggedTaskOverlay({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border-2 border-primary rounded-lg shadow-lg opacity-90">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium truncate max-w-[200px]">
        {task.task_text}
      </span>
      {task.estimated_minutes && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {task.estimated_minutes}m
        </Badge>
      )}
    </div>
  );
}

export function DailyScheduleView({ 
  onTaskToggle, 
  onTaskClick,
  onTaskSchedule,
  onTaskUnschedule,
  officeHoursStart = DEFAULT_START_HOUR,
  officeHoursEnd = DEFAULT_END_HOUR,
}: DailyScheduleViewProps) {
  const { user } = useAuth();
  const { status: calendarStatus, syncing, syncNow, connect } = useGoogleCalendar();
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overDropZone, setOverDropZone] = useState<string | null>(null);

  const today = useMemo(() => startOfToday(), []);
  const todayStr = format(today, 'yyyy-MM-dd');

  // Configure sensors for better touch/mouse handling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay for touch
        tolerance: 5,
      },
    })
  );

  // Generate time slots based on office hours
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = officeHoursStart; hour <= officeHoursEnd; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  }, [officeHoursStart, officeHoursEnd]);

  // Fetch calendar events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!calendarStatus.connected || !calendarStatus.calendarSelected) {
        setLoadingEvents(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-calendar-events', {
          body: {
            startDate: todayStr,
            endDate: todayStr,
          },
        });

        if (error) throw error;
        setCalendarEvents(data?.events || []);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchCalendarEvents();
  }, [calendarStatus.connected, calendarStatus.calendarSelected, todayStr, syncing]);

  // Fetch all tasks for today
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setLoadingTasks(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-all-tasks');

        if (error) throw error;

        const allTasks = (data?.data || []).filter((task: Task) => !task.is_recurring_parent);
        
        // Filter tasks for today (scheduled or planned for today)
        const todayTasks = allTasks.filter((task: Task) => {
          const isScheduledToday = task.scheduled_date === todayStr;
          const isPlannedToday = task.planned_day === todayStr;
          return isScheduledToday || isPlannedToday;
        });

        // Find overdue tasks
        const overdue = allTasks.filter((task: Task) => {
          if (task.is_completed) return false;
          
          const scheduledDate = task.scheduled_date || task.planned_day;
          if (!scheduledDate) return false;
          
          return isBefore(parseISO(scheduledDate), startOfDay(today));
        });

        setTasks(todayTasks);
        setOverdueTasks(overdue);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [user, todayStr, today]);

  // Separate tasks by scheduled time
  const { scheduledByTime, poolTasks } = useMemo(() => {
    const byTime: Record<string, Task[]> = {};
    const pool: Task[] = [];

    // Initialize time slots
    timeSlots.forEach(time => {
      byTime[time] = [];
    });

    tasks.forEach(task => {
      if (task.is_completed) return; // Skip completed tasks
      
      if (task.scheduled_time) {
        // Extract hour from scheduled_time
        const timeKey = task.scheduled_time.substring(0, 5);
        if (byTime[timeKey]) {
          byTime[timeKey].push(task);
        } else {
          // If outside office hours, add to pool
          pool.push(task);
        }
      } else {
        // No scheduled time = pool task
        pool.push(task);
      }
    });

    return { scheduledByTime: byTime, poolTasks: pool };
  }, [tasks, timeSlots]);

  // All-day calendar events
  const allDayEvents = useMemo(() => {
    return calendarEvents.filter(event => event.start.date && !event.start.dateTime);
  }, [calendarEvents]);

  // Task toggle handler
  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, is_completed: completed } : t
    ));

    try {
      await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          is_completed: completed,
        },
      });
      
      onTaskToggle?.(taskId, !completed);
    } catch (error) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, is_completed: !completed } : t
      ));
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  }, [onTaskToggle]);

  // Task update handler for scheduling
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, ...updates } : t
    ));

    try {
      await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          ...updates,
        },
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      // Refresh to get correct state
      handleRefresh();
    }
  }, []);

  // Remove task from time slot
  const handleTaskRemove = useCallback(async (taskId: string) => {
    // Find the task
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;

    // Optimistic update - clear scheduled_time
    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, scheduled_time: null } : t
    ));

    try {
      await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          scheduled_time: null,
        },
      });
      
      toast.success('Task moved to pool');
    } catch (error) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, scheduled_time: task.scheduled_time } : t
      ));
      console.error('Error removing task from time slot:', error);
      toast.error('Failed to update task');
    }
  }, [tasks]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;
    
    // Find the task being dragged
    const task = tasks.find(t => t.task_id === taskId) || 
                 overdueTasks.find(t => t.task_id === taskId);
    
    if (task) {
      setActiveTask(task);
    }
  }, [tasks, overdueTasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over) {
      setOverDropZone(over.id as string);
    } else {
      setOverDropZone(null);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setOverDropZone(null);

    if (!over) return;

    const taskId = active.id as string;
    const dropId = over.id as string;

    // Find the dragged task
    const task = tasks.find(t => t.task_id === taskId) || 
                 overdueTasks.find(t => t.task_id === taskId);
    
    if (!task) return;

    // Determine what we dropped on
    if (dropId === 'tasks-pool') {
      // Dropped on pool - clear scheduled_time
      if (task.scheduled_time) {
        // Optimistic update
        setTasks(prev => prev.map(t => 
          t.task_id === taskId ? { ...t, scheduled_time: null } : t
        ));

        try {
          await supabase.functions.invoke('manage-task', {
            body: {
              action: 'update',
              task_id: taskId,
              scheduled_time: null,
            },
          });
          
          toast.success('Task moved to pool');
          onTaskUnschedule?.(taskId);
        } catch (error) {
          // Revert
          setTasks(prev => prev.map(t => 
            t.task_id === taskId ? { ...t, scheduled_time: task.scheduled_time } : t
          ));
          console.error('Error updating task:', error);
          toast.error('Failed to move task to pool');
        }
      }
    } else if (dropId.startsWith('time-slot-')) {
      // Dropped on a time slot
      const time = dropId.replace('time-slot-', '');
      
      // Already in this slot?
      if (task.scheduled_time?.startsWith(time)) return;

      // Optimistic update
      const previousTime = task.scheduled_time;
      const previousDate = task.scheduled_date;
      
      setTasks(prev => {
        // Check if task is already in today's tasks
        const exists = prev.some(t => t.task_id === taskId);
        const updatedTask = { 
          ...task, 
          scheduled_time: time,
          scheduled_date: todayStr,
        };
        
        if (exists) {
          return prev.map(t => t.task_id === taskId ? updatedTask : t);
        } else {
          // Add from overdue to today
          return [...prev, updatedTask];
        }
      });
      
      // Remove from overdue if it was there
      setOverdueTasks(prev => prev.filter(t => t.task_id !== taskId));

      try {
        await supabase.functions.invoke('manage-task', {
          body: {
            action: 'update',
            task_id: taskId,
            scheduled_time: time,
            scheduled_date: todayStr,
          },
        });
        
        // Format time for toast
        const hour = parseInt(time.split(':')[0], 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        toast.success(`Scheduled for ${hour12}:00 ${period}`);
        onTaskSchedule?.(taskId, time);
      } catch (error) {
        // Revert
        setTasks(prev => prev.map(t => 
          t.task_id === taskId ? { ...t, scheduled_time: previousTime, scheduled_date: previousDate } : t
        ));
        console.error('Error scheduling task:', error);
        toast.error('Failed to schedule task');
      }
    }
  }, [tasks, overdueTasks, todayStr, onTaskSchedule, onTaskUnschedule]);

  const handleRefresh = async () => {
    setLoadingTasks(true);
    setLoadingEvents(true);
    
    if (calendarStatus.connected) {
      await syncNow();
    }
    
    // Re-fetch tasks
    if (user) {
      try {
        const { data } = await supabase.functions.invoke('get-all-tasks');
        const allTasks = (data?.data || []).filter((task: Task) => !task.is_recurring_parent);
        
        const todayTasks = allTasks.filter((task: Task) => {
          const isScheduledToday = task.scheduled_date === todayStr;
          const isPlannedToday = task.planned_day === todayStr;
          return isScheduledToday || isPlannedToday;
        });

        const overdue = allTasks.filter((task: Task) => {
          if (task.is_completed) return false;
          const scheduledDate = task.scheduled_date || task.planned_day;
          if (!scheduledDate) return false;
          return isBefore(parseISO(scheduledDate), startOfDay(today));
        });

        setTasks(todayTasks);
        setOverdueTasks(overdue);
      } catch (error) {
        console.error('Error refreshing tasks:', error);
      }
    }
    
    setLoadingTasks(false);
    setLoadingEvents(false);
  };

  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;
  const isLoading = loadingEvents || loadingTasks;
  const currentHour = new Date().getHours();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Today's Schedule</h3>
            <Badge variant="secondary">
              {completedCount}/{totalCount} tasks
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {calendarStatus.connected && calendarStatus.calendarName && (
              <Badge variant="outline" className="text-xs">
                📅 {calendarStatus.calendarName}
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isLoading || syncing}
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || syncing) && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Connect Calendar CTA */}
        {!calendarStatus.connected && (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-medium text-sm">Connect Google Calendar</h4>
                  <p className="text-xs text-muted-foreground">
                    See your events alongside your tasks
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => connect()}>
                Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Overdue Tasks Alert */}
        {overdueTasks.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Overdue Tasks ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground mb-2">
                Drag to a time slot to reschedule
              </p>
              <ScrollArea className={overdueTasks.length > 3 ? "h-[100px]" : undefined}>
                <div className="space-y-1">
                  {overdueTasks.map(task => (
                    <div
                      key={task.task_id}
                      className="flex items-center gap-2 p-2 bg-card border border-border rounded-md text-sm"
                    >
                      <span className="flex-1 truncate">{task.task_text}</span>
                      <Badge variant="destructive" className="text-xs shrink-0">
                        {task.scheduled_date || task.planned_day}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* All Day Events */}
        {allDayEvents.length > 0 && (
          <div className="border rounded-lg px-4 py-2 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground mb-1">All Day</div>
            <div className="flex flex-wrap gap-1">
              {allDayEvents.map(event => (
                <CalendarEventBlock
                  key={event.id}
                  event={event}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Layout: Time Slots + Tasks Pool */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Time Slots (Calendar View) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-2">
                    <div className="space-y-1 relative">
                      {/* Current time indicator */}
                      <CurrentTimeIndicator
                        selectedDate={today}
                        startHour={officeHoursStart}
                        hourHeight={88}
                      />
                      
                      {timeSlots.map((time) => {
                        const hour = parseInt(time.split(':')[0], 10);
                        const tasksInSlot = scheduledByTime[time] || [];
                        
                        return (
                          <TimeSlot
                            key={time}
                            time={time}
                            tasks={tasksInSlot}
                            onTaskDrop={(taskId, time) => {
                              // This is handled by DndContext onDragEnd
                            }}
                            onTaskRemove={handleTaskRemove}
                            isCurrentHour={hour === currentHour}
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tasks Pool (Right Side) */}
          <div className="lg:col-span-1">
            <TasksPool
              tasks={poolTasks}
              onTaskToggle={handleTaskToggle}
              onTaskUpdate={handleTaskUpdate}
            />

            {/* Quick Stats */}
            <Card className="mt-4">
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Scheduled</span>
                  <Badge variant="outline">
                    {Object.values(scheduledByTime).flat().length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unscheduled</span>
                  <Badge variant="outline">{poolTasks.length}</Badge>
                </div>
                {calendarEvents.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Calendar Events</span>
                    <Badge variant="outline">{calendarEvents.length}</Badge>
                  </div>
                )}
                {overdueTasks.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-destructive">Overdue</span>
                    <Badge variant="destructive">{overdueTasks.length}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Drag Overlay - shows the dragged task */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? <DraggedTaskOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
