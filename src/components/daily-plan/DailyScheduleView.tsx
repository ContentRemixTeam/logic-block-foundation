import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isToday, isBefore, startOfDay, startOfToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarEventBlock, CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { CurrentTimeIndicator } from '@/components/tasks/views/CurrentTimeIndicator';
import { TimelineTaskBlock } from './TimelineTaskBlock';
import { Task } from '@/components/tasks/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  ListTodo,
  AlertTriangle,
  CalendarDays
} from 'lucide-react';

interface DailyScheduleViewProps {
  onTaskToggle?: (taskId: string, currentStatus: boolean) => void;
  onTaskClick?: (task: Task) => void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 60;

export function DailyScheduleView({ onTaskToggle, onTaskClick }: DailyScheduleViewProps) {
  const { user } = useAuth();
  const { status: calendarStatus, syncing, syncNow, connect } = useGoogleCalendar();
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const today = useMemo(() => startOfToday(), []);
  const todayStr = format(today, 'yyyy-MM-dd');

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

  // Fetch all tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setLoadingTasks(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-all-tasks');

        if (error) throw error;

        const allTasks = (data?.tasks || []).filter((task: Task) => !task.is_recurring_parent);
        
        // Filter tasks for today
        const todayTasks = allTasks.filter((task: Task) => {
          const isScheduledToday = task.scheduled_date === todayStr;
          const isPlannedToday = task.planned_day === todayStr;
          return isScheduledToday || isPlannedToday;
        });

        // Find overdue tasks (scheduled before today and not completed)
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

  // Separate scheduled and unscheduled tasks
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];

    tasks.forEach(task => {
      if (task.time_block_start) {
        scheduled.push(task);
      } else {
        unscheduled.push(task);
      }
    });

    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [tasks]);

  // All-day calendar events
  const allDayEvents = useMemo(() => {
    return calendarEvents.filter(event => event.start.date && !event.start.dateTime);
  }, [calendarEvents]);

  // Group events and tasks by hour
  const timelineItems = useMemo(() => {
    const items: Record<number, { events: CalendarEvent[]; tasks: Task[] }> = {};

    // Initialize hours
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      items[hour] = { events: [], tasks: [] };
    }

    // Add calendar events (not all-day ones)
    calendarEvents.forEach(event => {
      if (event.start.dateTime) {
        const startHour = parseISO(event.start.dateTime).getHours();
        if (startHour >= START_HOUR && startHour <= END_HOUR) {
          items[startHour].events.push(event);
        }
      }
    });

    // Add scheduled tasks
    scheduledTasks.forEach(task => {
      if (task.time_block_start) {
        // Parse time - handle both full timestamps and time-only strings
        let startHour: number;
        if (task.time_block_start.includes('T')) {
          startHour = parseISO(task.time_block_start).getHours();
        } else {
          startHour = parseInt(task.time_block_start.split(':')[0], 10);
        }
        
        if (startHour >= START_HOUR && startHour <= END_HOUR) {
          items[startHour].tasks.push(task);
        }
      }
    });

    return items;
  }, [calendarEvents, scheduledTasks]);

  const handleTaskToggle = async (taskId: string, currentStatus: boolean) => {
    // Optimistic update for regular tasks
    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, is_completed: !currentStatus } : t
    ));
    // Also update overdue tasks
    setOverdueTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, is_completed: !currentStatus } : t
    ));

    try {
      await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          is_completed: !currentStatus,
        },
      });
      
      onTaskToggle?.(taskId, currentStatus);
      
      // Remove completed overdue task from list
      if (!currentStatus) {
        setOverdueTasks(prev => prev.filter(t => t.task_id !== taskId));
      }
    } catch (error) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, is_completed: currentStatus } : t
      ));
      setOverdueTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, is_completed: currentStatus } : t
      ));
      console.error('Error toggling task:', error);
    }
  };

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
        const allTasks = (data?.tasks || []).filter((task: Task) => !task.is_recurring_parent);
        
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

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;

  const isLoading = loadingEvents || loadingTasks;

  return (
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
            <ScrollArea className={overdueTasks.length > 3 ? "h-[120px]" : undefined}>
              <div className="space-y-1">
                {overdueTasks.map(task => (
                  <TimelineTaskBlock
                    key={task.task_id}
                    task={task}
                    compact
                    onToggle={handleTaskToggle}
                    onClick={() => onTaskClick?.(task)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Timeline */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            {/* All Day Events */}
            {allDayEvents.length > 0 && (
              <div className="border-b px-4 py-2 bg-muted/30">
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
            
            <ScrollArea className="h-[500px]">
              <div className="relative" style={{ minHeight: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
                {/* Current time indicator */}
                <CurrentTimeIndicator
                  selectedDate={today}
                  startHour={START_HOUR}
                  hourHeight={HOUR_HEIGHT}
                />

                {/* Hour rows */}
                {hours.map((hour) => {
                  const items = timelineItems[hour];
                  const hasItems = items.events.length > 0 || items.tasks.length > 0;
                  const isCurrentHour = new Date().getHours() === hour;

                  return (
                    <div
                      key={hour}
                      className={cn(
                        "flex border-t border-border/50",
                        isCurrentHour && "bg-primary/5"
                      )}
                      style={{ minHeight: `${HOUR_HEIGHT}px` }}
                    >
                      {/* Hour label */}
                      <div className="w-16 shrink-0 py-1 px-2 text-xs text-muted-foreground text-right border-r border-border/50">
                        {format(new Date().setHours(hour, 0), 'h a')}
                      </div>

                      {/* Content area */}
                      <div className="flex-1 p-1 space-y-1">
                        {isLoading ? (
                          hour === 9 && <Skeleton className="h-12 w-full" />
                        ) : (
                          <>
                            {/* Calendar events */}
                            {items.events.map(event => (
                              <CalendarEventBlock
                                key={event.id}
                                event={event}
                                compact
                              />
                            ))}

                            {/* Scheduled tasks */}
                            {items.tasks.map(task => (
                              <TimelineTaskBlock
                                key={task.task_id}
                                task={task}
                                compact
                                onToggle={handleTaskToggle}
                                onClick={() => onTaskClick?.(task)}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Sidebar - Unscheduled Tasks */}
        <div className="space-y-4">
          {/* Unscheduled Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListTodo className="h-4 w-4" />
                Unscheduled
                <Badge variant="secondary" className="ml-auto">
                  {unscheduledTasks.filter(t => !t.is_completed).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : unscheduledTasks.filter(t => !t.is_completed).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No unscheduled tasks for today
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1.5">
                    {unscheduledTasks.filter(t => !t.is_completed).map(task => (
                      <TimelineTaskBlock
                        key={task.task_id}
                        task={task}
                        compact
                        onToggle={handleTaskToggle}
                        onClick={() => onTaskClick?.(task)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Calendar Events</span>
                <Badge variant="outline">{calendarEvents.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scheduled Tasks</span>
                <Badge variant="outline">{scheduledTasks.length}</Badge>
              </div>
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
  );
}
