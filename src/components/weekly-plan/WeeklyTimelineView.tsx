import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, parseISO, startOfWeek, addDays, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarEventBlock, CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { TimelineTaskBlock } from '@/components/daily-plan/TimelineTaskBlock';
import { Task } from '@/components/tasks/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  RefreshCw, 
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';

interface WeeklyTimelineViewProps {
  onTaskToggle?: (taskId: string, currentStatus: boolean) => void;
  onTaskClick?: (task: Task) => void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 48;

export function WeeklyTimelineView({ onTaskToggle, onTaskClick }: WeeklyTimelineViewProps) {
  const { user } = useAuth();
  const { status: calendarStatus, syncing, syncNow, connect } = useGoogleCalendar();
  
  // Use shared task data
  const { data: allTasks = [], isLoading: loadingTasks } = useTasks();
  const { toggleComplete } = useTaskMutations();
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [weekStartDay, setWeekStartDay] = useState(1); // Monday
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

  // Filter tasks for this week from shared data
  const tasks = useMemo(() => {
    return allTasks.filter((task: Task) => {
      const scheduledDate = task.scheduled_date;
      const plannedDay = task.planned_day;
      const timeBlockDate = task.time_block_start?.substring(0, 10);
      
      const isInWeek = (date: string | null) => {
        if (!date) return false;
        return date >= weekStartStr && date <= weekEndStr;
      };
      
      return (isInWeek(scheduledDate) || isInWeek(plannedDay) || isInWeek(timeBlockDate)) && !task.is_recurring_parent;
    });
  }, [allTasks, weekStartStr, weekEndStr]);

  // Fetch calendar events for the week
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!calendarStatus.connected || !calendarStatus.calendarSelected) {
        setLoadingEvents(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-calendar-events', {
          body: {
            startDate: weekStartStr,
            endDate: weekEndStr,
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
  }, [calendarStatus.connected, calendarStatus.calendarSelected, weekStartStr, weekEndStr]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('task_settings')
          .select('week_start_day')
          .eq('user_id', user.id)
          .single();
        
        if (data?.week_start_day !== null) {
          setWeekStartDay(data.week_start_day);
          setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: data.week_start_day as 0 | 1 }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, [user]);

  // Group events and tasks by day and hour
  const getItemsForDayAndHour = useCallback((day: Date, hour: number) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayEvents = calendarEvents.filter(event => {
      if (event.start.dateTime) {
        const eventDate = event.start.dateTime.substring(0, 10);
        const eventHour = parseISO(event.start.dateTime).getHours();
        return eventDate === dayStr && eventHour === hour;
      }
      return false;
    });

    const dayTasks = tasks.filter(task => {
      if (task.time_block_start) {
        const taskDate = task.time_block_start.substring(0, 10);
        const taskHour = parseISO(task.time_block_start).getHours();
        return taskDate === dayStr && taskHour === hour;
      }
      return false;
    });

    return { events: dayEvents, tasks: dayTasks };
  }, [calendarEvents, tasks]);

  // Get all-day items and unscheduled tasks for a day
  const getUnscheduledTasksForDay = useCallback((day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    return tasks.filter(task => {
      const isScheduledForDay = task.scheduled_date === dayStr || task.planned_day === dayStr;
      const hasNoTimeBlock = !task.time_block_start;
      return isScheduledForDay && hasNoTimeBlock;
    });
  }, [tasks]);

  const handleTaskToggle = async (taskId: string, currentStatus: boolean) => {
    toggleComplete.mutate(taskId);
    onTaskToggle?.(taskId, currentStatus);
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
    setLoadingEvents(true);
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
    setLoadingEvents(true);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay as 0 | 1 }));
    setLoadingEvents(true);
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const isLoading = loadingEvents || loadingTasks;
  const isCurrentWeek = weekDays.some(d => isToday(d));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Week Navigation */}
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
            
            {!isCurrentWeek && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToCurrentWeek}>
                <CalendarDays className="h-4 w-4" />
              </Button>
            )}
            
            {calendarStatus.connected && (
              <Button
                size="sm"
                variant="ghost"
                onClick={syncNow}
                disabled={syncing}
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
        {calendarStatus.connected && calendarStatus.calendarName && (
          <p className="text-xs text-muted-foreground">
            📅 Synced with {calendarStatus.calendarName}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Connect Calendar CTA */}
        {!calendarStatus.connected && (
          <div className="mx-4 mb-4 p-4 rounded-lg border-dashed border-2 border-primary/30 bg-primary/5 text-center">
            <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
            <h4 className="font-medium text-sm mb-1">Connect Google Calendar</h4>
            <p className="text-xs text-muted-foreground mb-3">
              See your events alongside tasks
            </p>
            <Button size="sm" onClick={() => connect()}>
              Connect
            </Button>
          </div>
        )}

        <ScrollArea className="h-[600px]">
          <div className="min-w-[900px]">
            {/* Day Headers */}
            <div className="flex border-b border-border sticky top-0 bg-card z-10">
              <div className="w-16 shrink-0" /> {/* Time column spacer */}
              {weekDays.map((day) => {
                const unscheduledTasks = getUnscheduledTasksForDay(day);
                const dayIsToday = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex-1 min-w-[120px] p-2 text-center border-l border-border",
                      dayIsToday && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium",
                      dayIsToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={cn(
                      "text-lg font-bold",
                      dayIsToday && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>
                    {unscheduledTasks.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {unscheduledTasks.length} tasks
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Unscheduled Tasks Row */}
            <div className="flex border-b border-border bg-muted/30">
              <div className="w-16 shrink-0 py-2 px-2 text-xs text-muted-foreground text-right border-r border-border">
                Tasks
              </div>
              {weekDays.map((day) => {
                const unscheduledTasks = getUnscheduledTasksForDay(day);
                const dayIsToday = isToday(day);
                
                return (
                  <div
                    key={`unscheduled-${day.toISOString()}`}
                    className={cn(
                      "flex-1 min-w-[120px] p-1 border-l border-border",
                      dayIsToday && "bg-primary/5"
                    )}
                  >
                    {isLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : (
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {unscheduledTasks.slice(0, 3).map(task => (
                          <TimelineTaskBlock
                            key={task.task_id}
                            task={task}
                            compact
                            onToggle={handleTaskToggle}
                            onClick={() => onTaskClick?.(task)}
                          />
                        ))}
                        {unscheduledTasks.length > 3 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{unscheduledTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hour Rows */}
            {hours.map((hour) => (
              <div key={hour} className="flex border-b border-border/50" style={{ minHeight: `${HOUR_HEIGHT}px` }}>
                {/* Hour label */}
                <div className="w-16 shrink-0 py-1 px-2 text-xs text-muted-foreground text-right border-r border-border/50">
                  {format(new Date().setHours(hour, 0), 'h a')}
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const { events, tasks: hourTasks } = getItemsForDayAndHour(day, hour);
                  const dayIsToday = isToday(day);
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={cn(
                        "flex-1 min-w-[120px] p-0.5 border-l border-border/50",
                        dayIsToday && "bg-primary/5"
                      )}
                    >
                      {isLoading && hour === 9 ? (
                        <Skeleton className="h-6 w-full" />
                      ) : (
                        <div className="space-y-0.5">
                          {events.map(event => (
                            <CalendarEventBlock
                              key={event.id}
                              event={event}
                              compact
                            />
                          ))}
                          {hourTasks.map(task => (
                            <TimelineTaskBlock
                              key={task.task_id}
                              task={task}
                              compact
                              onToggle={handleTaskToggle}
                              onClick={() => onTaskClick?.(task)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}