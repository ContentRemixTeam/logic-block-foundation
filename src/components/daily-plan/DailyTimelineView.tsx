 import { useState, useEffect, useMemo } from 'react';
 import { format, parseISO, startOfDay } from 'date-fns';
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
 import { useTasks, useTaskMutations } from '@/hooks/useTasks';
 import { getTasksForDate, separateScheduledTasks } from '@/lib/taskFilters';
 import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  ListTodo,
  ChevronRight
} from 'lucide-react';

interface DailyTimelineViewProps {
  onTaskToggle?: (taskId: string, currentStatus: boolean) => void;
  onTaskClick?: (task: Task) => void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 60;

export function DailyTimelineView({ onTaskToggle, onTaskClick }: DailyTimelineViewProps) {
  const { status: calendarStatus, syncing, syncNow, connect } = useGoogleCalendar();
   const { data: allTasks = [], isLoading: loadingTasks } = useTasks();
   const { toggleComplete } = useTaskMutations();

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = format(today, 'yyyy-MM-dd');

   // Filter tasks for today using centralized utility
   const tasks = useMemo(() => 
     getTasksForDate(allTasks, todayStr),
     [allTasks, todayStr]
   );

  // Separate scheduled and unscheduled tasks
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
     const { scheduled, unscheduled } = separateScheduledTasks(tasks);
     return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [tasks]);
   
   // Calendar events state (keep local for calendar-specific data)
   const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
   const [loadingEvents, setLoadingEvents] = useState(true);
 
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
   }, [calendarStatus.connected, calendarStatus.calendarSelected, todayStr]);

  // Group events and tasks by hour
  const timelineItems = useMemo(() => {
    const items: Record<number, { events: CalendarEvent[]; tasks: Task[] }> = {};

    // Initialize hours
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      items[hour] = { events: [], tasks: [] };
    }

    // Add calendar events
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
        const startHour = parseISO(task.time_block_start).getHours();
        if (startHour >= START_HOUR && startHour <= END_HOUR) {
          items[startHour].tasks.push(task);
        }
      }
    });

    return items;
  }, [calendarEvents, scheduledTasks]);

   // Use centralized mutation for task toggle
   const handleTaskToggle = (taskId: string, currentStatus: boolean) => {
     toggleComplete.mutate({ taskId });
     onTaskToggle?.(taskId, currentStatus);
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;

  const isLoading = loadingEvents || loadingTasks;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Main Timeline */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
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
              <Badge variant="outline">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {completedCount}/{totalCount}
              </Badge>
            </div>
          </div>
          {calendarStatus.connected && calendarStatus.calendarName && (
            <p className="text-xs text-muted-foreground">
              📅 Synced with {calendarStatus.calendarName}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
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

                return (
                  <div
                    key={hour}
                    className="flex border-t border-border/50"
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
        {/* Connect Calendar CTA */}
        {!calendarStatus.connected && (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="py-4 text-center">
              <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
              <h4 className="font-medium text-sm mb-1">Connect Google Calendar</h4>
              <p className="text-xs text-muted-foreground mb-3">
                See your events alongside tasks
              </p>
              <Button size="sm" onClick={() => connect()}>
                Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Unscheduled Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListTodo className="h-4 w-4" />
              Today's Tasks
              <Badge variant="secondary" className="ml-auto">
                {unscheduledTasks.length}
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
            ) : unscheduledTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No unscheduled tasks for today
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-1.5">
                  {unscheduledTasks.map(task => (
                    <TimelineTaskBlock
                      key={task.task_id}
                      task={task}
                      compact
                      draggable
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
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Calendar Events</span>
              <Badge variant="outline">{calendarEvents.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Scheduled Tasks</span>
              <Badge variant="outline">{scheduledTasks.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
