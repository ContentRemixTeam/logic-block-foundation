import { useMemo, useState, useEffect, useCallback } from 'react';
import { format, parseISO, isToday, addHours, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Task } from '../types';
import { Clock, Plus, Calendar } from 'lucide-react';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { CalendarEventBlock, CalendarEvent } from './CalendarEventBlock';
import { supabase } from '@/integrations/supabase/client';

interface TaskTimelineViewProps {
  tasks: Task[];
  selectedDate: Date;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onOpenDetail: (task: Task) => void;
  onAddTaskAtTime: (hour: number) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const HOUR_HEIGHT = 80;

export function TaskTimelineView({
  tasks,
  selectedDate,
  onUpdateTask,
  onOpenDetail,
  onAddTaskAtTime,
}: TaskTimelineViewProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showCalendarEvents, setShowCalendarEvents] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Fetch calendar events when date changes
  const fetchCalendarEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      const { data, error } = await supabase.functions.invoke('get-calendar-events', {
        body: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      });

      if (error) {
        console.error('Error fetching calendar events:', error);
        return;
      }

      setCalendarEvents(data.events || []);
      setIsConnected(data.connected ?? false);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  // Filter and group tasks by time block
  const timeBlockedTasks = useMemo(() => {
    const result: Record<number, Task[]> = {};
    
    HOURS.forEach(hour => {
      result[hour] = [];
    });

    tasks.forEach(task => {
      if (task.is_completed) return;
      if (!task.time_block_start) return;
      
      const startTime = parseISO(task.time_block_start);
      const hour = startTime.getHours();
      
      if (result[hour]) {
        result[hour].push(task);
      }
    });

    return result;
  }, [tasks]);

  // Group calendar events by hour
  const timeBlockedEvents = useMemo(() => {
    const result: Record<number, CalendarEvent[]> = {};
    
    HOURS.forEach(hour => {
      result[hour] = [];
    });

    calendarEvents.forEach(event => {
      if (!event.start.dateTime) return; // Skip all-day events for now
      
      const startTime = parseISO(event.start.dateTime);
      const hour = startTime.getHours();
      
      if (result[hour]) {
        result[hour].push(event);
      }
    });

    return result;
  }, [calendarEvents]);

  // Unscheduled tasks for selected date
  const unscheduledTasks = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return tasks.filter(task => {
      if (task.is_completed) return false;
      if (task.time_block_start) return false;
      
      if (task.scheduled_date) {
        return task.scheduled_date === selectedDateStr;
      }
      return false;
    });
  }, [tasks, selectedDate]);

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const blockStart = addHours(startOfDay(selectedDate), hour);
      onUpdateTask(taskId, { 
        time_block_start: blockStart.toISOString(),
        time_block_end: addHours(blockStart, 1).toISOString(),
        status: 'scheduled' 
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const currentHour = new Date().getHours();

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6">
      {/* Timeline */}
      <Card className="relative">
        <CardContent className="p-0">
          {/* Calendar events toggle */}
          {isConnected && (
            <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-calendar" className="text-sm cursor-pointer">
                Show Calendar Events
              </Label>
              <Switch
                id="show-calendar"
                checked={showCalendarEvents}
                onCheckedChange={setShowCalendarEvents}
              />
              {loadingEvents && (
                <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
              )}
            </div>
          )}
          
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="divide-y relative">
              {/* Current time indicator */}
              <CurrentTimeIndicator
                selectedDate={selectedDate}
                startHour={6}
                hourHeight={HOUR_HEIGHT}
              />

              {HOURS.map(hour => {
                const hourTasks = timeBlockedTasks[hour] || [];
                const hourEvents = timeBlockedEvents[hour] || [];
                const isCurrentHour = isToday(selectedDate) && hour === currentHour;

                return (
                  <div
                    key={hour}
                    className={cn(
                      "flex transition-colors",
                      isCurrentHour && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                    style={{ minHeight: `${HOUR_HEIGHT}px` }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, hour)}
                  >
                    {/* Hour label */}
                    <div className="w-20 py-2 px-3 text-sm text-muted-foreground border-r flex-shrink-0">
                      <span className={cn(isCurrentHour && "text-primary font-medium")}>
                        {format(addHours(startOfDay(new Date()), hour), 'h a')}
                      </span>
                    </div>

                    {/* Tasks and events area */}
                    <div className="flex-1 p-2" style={{ minHeight: `${HOUR_HEIGHT - 16}px` }}>
                      {(hourTasks.length > 0 || (showCalendarEvents && hourEvents.length > 0)) ? (
                        <div className="space-y-1">
                          {/* Calendar events first (read-only) */}
                          {showCalendarEvents && hourEvents.map(event => (
                            <CalendarEventBlock
                              key={event.id}
                              event={event}
                              compact
                            />
                          ))}
                          
                          {/* User tasks (editable) */}
                          {hourTasks.map(task => {
                            const duration = task.estimated_minutes || 60;
                            const heightClass = duration <= 30 ? 'h-8' : duration <= 60 ? 'h-16' : 'h-24';

                            return (
                              <div
                                key={task.task_id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.task_id)}
                                onClick={() => onOpenDetail(task)}
                                className={cn(
                                  "rounded-md px-3 py-2 cursor-pointer transition-all",
                                  "bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:shadow-md",
                                  "flex items-center gap-2 relative",
                                  heightClass
                                )}
                              >
                                <span className="absolute top-1 right-1 text-[10px] text-muted-foreground/50">✏️</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {task.task_text}
                                  </p>
                                  {task.estimated_minutes && (
                                    <span className="text-xs text-muted-foreground">
                                      {task.estimated_minutes >= 60 
                                        ? `${task.estimated_minutes / 60}h` 
                                        : `${task.estimated_minutes}m`}
                                    </span>
                                  )}
                                </div>
                                {task.priority && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      task.priority === 'high' && "border-destructive text-destructive",
                                      task.priority === 'medium' && "border-warning text-warning"
                                    )}
                                  >
                                    {task.priority}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddTaskAtTime(hour)}
                          className="w-full h-full min-h-[60px] flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-md transition-colors group"
                        >
                          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Unscheduled sidebar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Unscheduled</h3>
            <Badge variant="secondary" className="text-xs">
              {unscheduledTasks.length}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Drag tasks onto the timeline to schedule
          </p>

          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-2">
              {unscheduledTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All tasks are scheduled!
                </p>
              ) : (
                unscheduledTasks.map(task => (
                  <div
                    key={task.task_id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.task_id)}
                    onClick={() => onOpenDetail(task)}
                    className="p-3 rounded-md border bg-card hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
                  >
                    <p className="text-sm font-medium truncate">{task.task_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.estimated_minutes && (
                        <span className="text-xs text-muted-foreground">
                          {task.estimated_minutes >= 60 
                            ? `${task.estimated_minutes / 60}h` 
                            : `${task.estimated_minutes}m`}
                        </span>
                      )}
                      {task.priority && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            task.priority === 'high' && "border-destructive text-destructive",
                            task.priority === 'medium' && "border-warning text-warning"
                          )}
                        >
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
