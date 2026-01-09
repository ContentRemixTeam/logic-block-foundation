import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarEventBlock, CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { CurrentTimeIndicator } from '@/components/tasks/views/CurrentTimeIndicator';
import { Task } from '@/components/tasks/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  Edit,
  CalendarDays,
  ListTodo,
  MapPin
} from 'lucide-react';

interface DailyAgendaCardProps {
  date?: Date;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
}

const START_HOUR = 6;
const END_HOUR = 21;
const HOUR_HEIGHT = 48;

export function DailyAgendaCard({ date = new Date(), onTaskToggle }: DailyAgendaCardProps) {
  const { status: calendarStatus, syncing, syncNow, connect } = useGoogleCalendar();
  const { data: allTasks = [], isLoading: loadingTasks } = useTasks();
  const { toggleComplete } = useTaskMutations();
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Extract primitive values to avoid re-render loops
  const isConnected = calendarStatus.connected;
  const isCalendarSelected = calendarStatus.calendarSelected;

  const today = useMemo(() => startOfDay(date), [date]);
  const todayStr = format(today, 'yyyy-MM-dd');
  const dateDisplay = format(today, 'EEEE, MMMM d');

  // Fetch calendar events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!isConnected || !isCalendarSelected) {
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
  }, [isConnected, isCalendarSelected, todayStr]);

  // Filter tasks for today
  const todayTasks = useMemo(() => {
    return allTasks.filter((task: Task) => {
      const isScheduledToday = task.scheduled_date === todayStr;
      const isPlannedToday = task.planned_day === todayStr;
      const hasTimeBlockToday = task.time_block_start?.startsWith(todayStr);
      
      return (isScheduledToday || isPlannedToday || hasTimeBlockToday) && 
             !task.is_recurring_parent && 
             !task.is_completed;
    });
  }, [allTasks, todayStr]);

  // Separate scheduled and unscheduled tasks
  const { scheduledTasks, unscheduledTasks, allDayEvents } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];

    todayTasks.forEach(task => {
      if (task.time_block_start) {
        scheduled.push(task);
      } else {
        unscheduled.push(task);
      }
    });

    // Sort scheduled tasks by time
    scheduled.sort((a, b) => {
      const aTime = a.time_block_start ? parseISO(a.time_block_start).getTime() : 0;
      const bTime = b.time_block_start ? parseISO(b.time_block_start).getTime() : 0;
      return aTime - bTime;
    });

    // Sort unscheduled by day_order
    unscheduled.sort((a, b) => (a.day_order || 0) - (b.day_order || 0));

    // All-day events
    const allDay = calendarEvents.filter(event => event.start.date && !event.start.dateTime);

    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled, allDayEvents: allDay };
  }, [todayTasks, calendarEvents]);

  // Timed calendar events
  const timedEvents = useMemo(() => {
    return calendarEvents.filter(event => event.start.dateTime);
  }, [calendarEvents]);

  // Group items by hour for timeline
  const timelineItems = useMemo(() => {
    const items: Record<number, { events: CalendarEvent[]; tasks: Task[] }> = {};

    // Initialize hours
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      items[hour] = { events: [], tasks: [] };
    }

    // Add calendar events
    timedEvents.forEach(event => {
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
        const startHour = parseISO(task.time_block_start).getHours();
        if (startHour >= START_HOUR && startHour <= END_HOUR) {
          items[startHour].tasks.push(task);
        }
      }
    });

    return items;
  }, [timedEvents, scheduledTasks]);

  const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
    toggleComplete.mutate(taskId);
    onTaskToggle?.(taskId, currentCompleted);
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const totalMinutes = todayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const isLoading = loadingEvents || loadingTasks;
  const hasItems = scheduledTasks.length > 0 || unscheduledTasks.length > 0 || calendarEvents.length > 0;
  const completedCount = allTasks.filter(t => 
    (t.scheduled_date === todayStr || t.planned_day === todayStr) && t.is_completed
  ).length;

  // Don't show card if nothing scheduled and no calendar connected
  if (!isLoading && !hasItems && !calendarStatus.connected) {
    return (
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-6 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-primary/50 mb-3" />
          <h3 className="font-semibold mb-1">No agenda for today</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Plan your day in the Weekly Planner or connect Google Calendar
          </p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" asChild>
              <Link to="/weekly-plan">Open Weekly Plan</Link>
            </Button>
            <Button size="sm" onClick={() => connect()}>
              Connect Calendar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              📅 Today's Agenda
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {dateDisplay} • {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} 
              {completedCount > 0 && <span className="text-green-600"> ({completedCount} done)</span>}
              {totalMinutes > 0 && ` • ${formatDuration(totalMinutes)} estimated`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {calendarStatus.connected && (
              <Button
                size="sm"
                variant="ghost"
                onClick={syncNow}
                disabled={syncing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/weekly-plan">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
        {calendarStatus.connected && calendarStatus.calendarName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Synced with {calendarStatus.calendarName}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All Day</p>
            {allDayEvents.map(event => (
              <div 
                key={event.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
              >
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {event.summary}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {/* Timeline for scheduled items */}
        {!isLoading && (scheduledTasks.length > 0 || timedEvents.length > 0) && (
          <div className="relative">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              <Clock className="h-3 w-3 inline mr-1" />
              Scheduled
            </p>
            <ScrollArea className="max-h-[300px]">
              <div className="relative" style={{ minHeight: `${Math.min(6, END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
                <CurrentTimeIndicator
                  selectedDate={today}
                  startHour={START_HOUR}
                  hourHeight={HOUR_HEIGHT}
                />
                
                {hours.map((hour) => {
                  const items = timelineItems[hour];
                  const hasContent = items.events.length > 0 || items.tasks.length > 0;
                  
                  // Skip empty hours unless they're near current time
                  const currentHour = new Date().getHours();
                  const isNearCurrent = Math.abs(hour - currentHour) <= 1;
                  
                  if (!hasContent && !isNearCurrent) return null;

                  return (
                    <div
                      key={hour}
                      className="flex border-t border-border/30"
                      style={{ minHeight: `${HOUR_HEIGHT}px` }}
                    >
                      <div className="w-14 shrink-0 py-1 px-2 text-xs text-muted-foreground text-right">
                        {format(new Date().setHours(hour, 0), 'h a')}
                      </div>
                      <div className="flex-1 p-1 space-y-1">
                        {items.events.map(event => (
                          <CalendarEventBlock
                            key={event.id}
                            event={event}
                            compact
                          />
                        ))}
                        {items.tasks.map(task => (
                          <div 
                            key={task.task_id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border hover:bg-background transition-colors"
                          >
                            <Checkbox
                              checked={task.is_completed}
                              onCheckedChange={() => handleTaskToggle(task.task_id, task.is_completed)}
                            />
                            <span className={cn(
                              "flex-1 text-sm",
                              task.is_completed && "line-through text-muted-foreground"
                            )}>
                              {task.task_text}
                            </span>
                            {task.estimated_minutes && (
                              <Badge variant="secondary" className="text-xs">
                                {formatDuration(task.estimated_minutes)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Unscheduled tasks */}
        {!isLoading && unscheduledTasks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              Tasks for Today
              <Badge variant="secondary" className="ml-1 text-xs">
                {unscheduledTasks.length}
              </Badge>
            </p>
            <div className="space-y-1.5">
              {unscheduledTasks.map((task) => (
                <div 
                  key={task.task_id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border"
                >
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={() => handleTaskToggle(task.task_id, task.is_completed)}
                  />
                  <span className={cn(
                    "flex-1 text-sm",
                    task.is_completed && "line-through text-muted-foreground"
                  )}>
                    {task.task_text}
                  </span>
                  {task.estimated_minutes && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(task.estimated_minutes)}
                    </Badge>
                  )}
                  {task.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">!</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connect calendar CTA */}
        {!calendarStatus.connected && !isLoading && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Connect Google Calendar</p>
              <p className="text-xs text-muted-foreground">See your events alongside tasks</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => connect()}>
              Connect
            </Button>
          </div>
        )}

        {/* Summary footer */}
        {!isLoading && hasItems && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {calendarEvents.length > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {completedCount}/{todayTasks.length + completedCount} completed
              </span>
            </div>
            <Link 
              to="/weekly-plan" 
              className="text-primary hover:underline flex items-center gap-1"
            >
              Weekly Plan →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
