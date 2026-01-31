import { useState, useMemo, useCallback } from 'react';
import { format, addDays, isSameDay, isToday, isPast } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Clock, GripVertical } from 'lucide-react';
import { Task } from '@/components/tasks/types';
import { CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { InlineTaskAdd } from './InlineTaskAdd';

interface WeekPlannerMobileProps {
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  currentWeekStart: Date;
  onTaskDrop: (taskId: string, fromPlannedDay: string | null, targetDate: string, timeSlot?: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onQuickAdd?: (text: string, plannedDay: string | null) => Promise<void>;
  onMoveToInbox?: (taskId: string) => void;
}

export function WeekPlannerMobile({
  tasks,
  calendarEvents,
  currentWeekStart,
  onTaskDrop,
  onTaskToggle,
  onQuickAdd,
  onMoveToInbox,
}: WeekPlannerMobileProps) {
  // Track which day is currently visible (0-6, relative to week start)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    // Default to today if it's within the current week
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      if (isSameDay(addDays(currentWeekStart, i), today)) {
        return i;
      }
    }
    return 0;
  });

  const selectedDate = useMemo(() => addDays(currentWeekStart, selectedDayIndex), [currentWeekStart, selectedDayIndex]);
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Tasks for the selected day
  const dayTasks = useMemo(() => {
    return tasks
      .filter(t => t.planned_day === dateString && !t.parent_task_id)
      .sort((a, b) => {
        // Sort by time_block_start first, then by day_order
        if (a.time_block_start && b.time_block_start) {
          return a.time_block_start.localeCompare(b.time_block_start);
        }
        if (a.time_block_start) return -1;
        if (b.time_block_start) return 1;
        return (a.day_order ?? 999) - (b.day_order ?? 999);
      });
  }, [tasks, dateString]);

  // Events for the selected day
  const dayEvents = useMemo(() => {
    return calendarEvents.filter(e => {
      const eventDate = e.start.dateTime?.split('T')[0] || e.start.date;
      return eventDate === dateString;
    });
  }, [calendarEvents, dateString]);

  // Inbox tasks (unscheduled)
  const inboxTasks = useMemo(() => {
    return tasks.filter(t => !t.planned_day && !t.parent_task_id && !t.is_completed);
  }, [tasks]);

  const goToPreviousDay = useCallback(() => {
    setSelectedDayIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDayIndex(prev => Math.min(6, prev + 1));
  }, []);

  const handleTaskToggle = useCallback((taskId: string, currentStatus: boolean) => {
    onTaskToggle(taskId, !currentStatus);
  }, [onTaskToggle]);

  const handleScheduleFromInbox = useCallback((taskId: string) => {
    onTaskDrop(taskId, null, dateString);
  }, [onTaskDrop, dateString]);

  return (
    <div className="flex flex-col h-full">
      {/* Day Selector - Swipeable strip */}
      <div className="flex items-center gap-1 px-2 py-3 border-b bg-background sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={goToPreviousDay}
          disabled={selectedDayIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex justify-center gap-1 overflow-x-auto">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(currentWeekStart, i);
            const isSelected = i === selectedDayIndex;
            const dayIsToday = isToday(date);
            const dayIsPast = isPast(date) && !dayIsToday;
            const dayTaskCount = tasks.filter(t => t.planned_day === format(date, 'yyyy-MM-dd') && !t.parent_task_id).length;

            return (
              <button
                key={i}
                onClick={() => setSelectedDayIndex(i)}
                className={cn(
                  'flex flex-col items-center px-3 py-2 rounded-lg min-w-[48px] min-h-[56px] touch-manipulation transition-colors',
                  isSelected && 'bg-primary text-primary-foreground',
                  !isSelected && dayIsToday && 'bg-primary/10 text-primary',
                  !isSelected && dayIsPast && 'text-muted-foreground',
                  !isSelected && !dayIsToday && !dayIsPast && 'text-foreground hover:bg-muted'
                )}
              >
                <span className="text-[11px] font-medium uppercase">
                  {format(date, 'EEE')}
                </span>
                <span className={cn('text-xl font-semibold', dayIsToday && !isSelected && 'text-primary')}>
                  {format(date, 'd')}
                </span>
                {dayTaskCount > 0 && (
                  <span className={cn(
                    'text-[10px] font-medium',
                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {dayTaskCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={goToNextDay}
          disabled={selectedDayIndex === 6}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Day Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{format(selectedDate, 'EEEE')}</h2>
              <p className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Calendar Events */}
          {dayEvents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Calendar</h3>
              {dayEvents.map(event => {
                const startTime = event.start.dateTime;
                const endTime = event.end?.dateTime;
                
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                  >
                    <div className="w-1 h-8 rounded-full bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {startTime ? format(new Date(startTime), 'h:mm a') : 'All day'}
                        {endTime && ` - ${format(new Date(endTime), 'h:mm a')}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tasks</h3>
            
            {dayTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No tasks scheduled</p>
                <p className="text-xs mt-1">Add a task or schedule from inbox</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayTasks.map(task => (
                  <div
                    key={task.task_id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border bg-card transition-colors min-h-[64px]',
                      task.is_completed && 'opacity-60'
                    )}
                  >
                    <button
                      onClick={() => handleTaskToggle(task.task_id, task.is_completed)}
                      className="mt-0.5 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-base font-medium', task.is_completed && 'line-through')}>
                        {task.task_text}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {task.time_block_start && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            {task.time_block_start.substring(0, 5)}
                          </Badge>
                        )}
                        {task.estimated_minutes && (
                          <Badge variant="secondary" className="text-xs">
                            {task.estimated_minutes}m
                          </Badge>
                        )}
                        {task.priority && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              'text-xs',
                              task.priority === 'high' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              task.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            )}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {onMoveToInbox && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 text-muted-foreground touch-manipulation"
                        onClick={() => onMoveToInbox(task.task_id)}
                      >
                        <GripVertical className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add */}
            {onQuickAdd && (
              <InlineTaskAdd
                onAdd={(text) => onQuickAdd(text, dateString)}
                placeholder="Add a task..."
              />
            )}
          </div>

          {/* Inbox Section */}
          {inboxTasks.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                <span>Inbox ({inboxTasks.length})</span>
                <span className="text-[10px] font-normal">Tap to schedule</span>
              </h3>
              <div className="space-y-1">
              {inboxTasks.slice(0, 5).map(task => (
                  <button
                    key={task.task_id}
                    onClick={() => handleScheduleFromInbox(task.task_id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-left touch-manipulation min-h-[48px]"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-base truncate">{task.task_text}</span>
                  </button>
                ))}
                {inboxTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{inboxTasks.length - 5} more in inbox
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
