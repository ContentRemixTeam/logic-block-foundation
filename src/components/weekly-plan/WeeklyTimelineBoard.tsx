import { useMemo, useState, useCallback, useEffect, memo } from 'react';
import { addDays, format, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { Task } from '@/components/tasks/types';
import { CalendarEvent, CalendarEventBlock } from '@/components/tasks/views/CalendarEventBlock';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface WeeklyTimelineBoardProps {
  tasks: Task[];
  calendarEvents?: CalendarEvent[];
  currentWeekStart: Date;
  officeHoursStart?: string;
  officeHoursEnd?: string;
  showWeekend?: boolean;
  onTaskDrop: (taskId: string, fromPlannedDay: string | null, targetDate: string, timeSlot?: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
}

// Generate hour slots from 6am to 10pm (configurable)
const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_SLOTS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

// Memoized hour cell component for better performance
const HourCell = memo(function HourCell({
  dateStr,
  hour,
  isToday: isTodayFlag,
  isOfficeHour,
  isOver,
  isDragging,
  cellTasks,
  cellEvents,
  onTaskToggle,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  formatHour,
}: {
  dateStr: string;
  hour: number;
  isToday: boolean;
  isOfficeHour: boolean;
  isOver: boolean;
  isDragging: boolean;
  cellTasks: Task[];
  cellEvents: CalendarEvent[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  formatHour: (hour: number) => string;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'flex-1 min-w-[120px] border-r last:border-r-0 min-h-[48px] p-0.5 transition-colors',
        isTodayFlag && 'bg-primary/5',
        isOfficeHour && !isTodayFlag && 'bg-muted/20',
        isOver && 'bg-primary/10 ring-2 ring-inset ring-primary/40',
        isDragging && !isOver && 'hover:bg-muted/30'
      )}
    >
      {isOver && cellTasks.length === 0 && cellEvents.length === 0 && (
        <div className="text-xs text-primary text-center py-3 font-medium">
          {formatHour(hour)}
        </div>
      )}
      {cellEvents.map((event) => (
        <CalendarEventBlock key={event.id} event={event} compact />
      ))}
      {cellTasks.map((task) => (
        <WeeklyTaskCard key={task.task_id} task={task} onToggle={onTaskToggle} compact />
      ))}
    </div>
  );
});

function WeeklyTimelineBoardInner({
  tasks,
  calendarEvents = [],
  currentWeekStart,
  officeHoursStart = '9:00',
  officeHoursEnd = '17:00',
  showWeekend = true,
  onTaskDrop,
  onTaskToggle,
}: WeeklyTimelineBoardProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent body scroll during drag
  useEffect(() => {
    const handleGlobalDragStart = () => {
      setIsDragging(true);
    };

    const handleGlobalDragEnd = () => {
      setIsDragging(false);
      setDragOverCell(null);
    };

    document.addEventListener('dragstart', handleGlobalDragStart);
    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('drop', handleGlobalDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleGlobalDragStart);
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, []);

  // Generate days (7 or 5 depending on showWeekend)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    
    if (!showWeekend) {
      // Filter out Saturday (day 6) and Sunday (day 0)
      return days.filter(day => {
        const dayOfWeek = day.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6;
      });
    }
    
    return days;
  }, [currentWeekStart, showWeekend]);

  // Parse office hours
  const parseTime = (timeStr: string): number => {
    const [hours] = timeStr.split(':').map(Number);
    return hours;
  };

  const officeStart = parseTime(officeHoursStart);
  const officeEnd = parseTime(officeHoursEnd);

  // Group tasks by day and time slot
  const tasksByDayAndHour = useMemo(() => {
    const map: Record<string, Record<number, Task[]>> = {};
    
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map[dateStr] = {};
      HOUR_SLOTS.forEach((hour) => {
        map[dateStr][hour] = [];
      });
    });

    tasks.forEach((task) => {
      if (!task.planned_day) return;
      if (!map[task.planned_day]) return;
      
      // If task has time_block_start, place it at that hour
      if (task.time_block_start) {
        let hour: number;
        // Handle both full ISO timestamps and simple time strings
        // IMPORTANT: Extract hour directly from string to avoid timezone conversion bugs
        if (task.time_block_start.includes('T')) {
          // Full ISO timestamp: "2026-01-09T09:00:00" - parse directly without Date object
          const timeMatch = task.time_block_start.match(/T(\d{2}):/);
          hour = timeMatch ? parseInt(timeMatch[1], 10) : 0;
        } else {
          // Simple time string: "09:00" (legacy support)
          hour = parseInt(task.time_block_start.split(':')[0], 10);
        }
        if (map[task.planned_day][hour]) {
          map[task.planned_day][hour].push(task);
        }
      }
    });

    return map;
  }, [tasks, weekDays]);

  // Group calendar events by day and hour
  const eventsByDayAndHour = useMemo(() => {
    const map: Record<string, Record<number, CalendarEvent[]>> = {};
    
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map[dateStr] = {};
      HOUR_SLOTS.forEach((hour) => {
        map[dateStr][hour] = [];
      });
    });

    calendarEvents.forEach((event) => {
      // Skip all-day events for the hourly view
      if (!event.start.dateTime) return;
      
      const startTime = parseISO(event.start.dateTime);
      const dateStr = format(startTime, 'yyyy-MM-dd');
      const hour = startTime.getHours();
      
      if (map[dateStr] && map[dateStr][hour]) {
        map[dateStr][hour].push(event);
      }
    });

    return map;
  }, [calendarEvents, weekDays]);

  // All-day calendar events by day
  const allDayEventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map[dateStr] = [];
    });

    calendarEvents.forEach((event) => {
      // Only include all-day events (have date but not dateTime)
      if (event.start.date && !event.start.dateTime) {
        const dateStr = event.start.date;
        if (map[dateStr]) {
          map[dateStr].push(event);
        }
      }
    });

    return map;
  }, [calendarEvents, weekDays]);

  // Tasks scheduled for a day but without time blocks (show in "All Day" row)
  const untimedTasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map[dateStr] = tasks.filter(
        (t) => t.planned_day === dateStr && !t.time_block_start && !t.is_completed
      ).sort((a, b) => (a.day_order || 0) - (b.day_order || 0));
    });

    return map;
  }, [tasks, weekDays]);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string, hour?: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const cellKey = hour !== undefined ? `${dateStr}-${hour}` : `${dateStr}-allday`;
    setDragOverCell(cellKey);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, dateStr: string, hour?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const cellKey = hour !== undefined ? `${dateStr}-${hour}` : `${dateStr}-allday`;
    setDragOverCell(cellKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if we're actually leaving (not entering a child)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverCell(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dateStr: string, hour?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);

    // Try to get data from JSON format first, then fall back to plain text
    let taskId: string | null = null;
    let fromPlannedDay: string | null = null;

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const parsed = JSON.parse(jsonData);
        taskId = parsed.taskId;
        fromPlannedDay = parsed.fromPlannedDay || null;
      }
    } catch {
      // Fall back to plain text format
      taskId = e.dataTransfer.getData('taskId');
      fromPlannedDay = e.dataTransfer.getData('fromPlannedDay') || null;
    }

    if (taskId) {
      const timeSlot = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : undefined;
      onTaskDrop(taskId, fromPlannedDay, dateStr, timeSlot);
    }
  }, [onTaskDrop]);

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const isWithinOfficeHours = (hour: number): boolean => {
    return hour >= officeStart && hour < officeEnd;
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border shadow-sm overflow-hidden",
      isDragging && "select-none"
    )}>
      <ScrollArea className="w-full">
        <div className="min-w-[900px]">
          {/* Header row with days */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-10">
            {/* Time column header */}
            <div className="w-16 shrink-0 border-r px-2 py-3">
              <span className="text-xs text-muted-foreground font-medium">Time</span>
            </div>
            
            {/* Day headers */}
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const today = isToday(day);
              const isPast = isBefore(startOfDay(day), startOfDay(new Date())) && !today;
              
              return (
                <div
                  key={dateStr}
                  className={cn(
                    'flex-1 min-w-[120px] border-r last:border-r-0 px-2 py-2 text-center',
                    today && 'bg-primary/5'
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium',
                    today ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    'text-lg font-semibold',
                    today ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {officeHoursStart} – {officeHoursEnd}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All Day row */}
          <div className="flex border-b">
            <div className="w-16 shrink-0 border-r px-2 py-2 flex items-center">
              <span className="text-xs text-muted-foreground">All Day</span>
            </div>
            
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const today = isToday(day);
              const cellKey = `${dateStr}-allday`;
              const isOver = dragOverCell === cellKey;
              const dayTasks = untimedTasksByDay[dateStr] || [];
              const dayEvents = allDayEventsByDay[dateStr] || [];
              
                  return (
                    <div
                      key={cellKey}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDragEnter={(e) => handleDragEnter(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateStr)}
                      className={cn(
                        'flex-1 min-w-[120px] border-r last:border-r-0 p-1.5 min-h-[60px] transition-colors',
                        today && 'bg-primary/5',
                        isOver && 'bg-primary/10 ring-2 ring-inset ring-primary/40',
                        isDragging && !isOver && 'hover:bg-muted/40'
                      )}
                    >
                  <div className="space-y-1">
                    {/* All-day calendar events */}
                    {dayEvents.slice(0, 2).map((event) => (
                      <CalendarEventBlock
                        key={event.id}
                        event={event}
                        compact
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-blue-600 text-center py-0.5">
                        +{dayEvents.length - 2} events
                      </div>
                    )}
                    {/* Tasks */}
                    {dayTasks.slice(0, 3).map((task) => (
                      <WeeklyTaskCard
                        key={task.task_id}
                        task={task}
                        onToggle={onTaskToggle}
                        compact
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-0.5">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                    {dayTasks.length === 0 && dayEvents.length === 0 && isOver && (
                      <div className="text-xs text-primary text-center py-2 font-medium animate-pulse">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          {HOUR_SLOTS.map((hour) => (
            <div key={hour} className="flex border-b last:border-b-0">
              {/* Time label */}
              <div className="w-16 shrink-0 border-r px-2 py-1 flex items-start">
                <span className="text-xs text-muted-foreground -mt-2">
                  {formatHour(hour)}
                </span>
              </div>
              
              {/* Day cells */}
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const today = isToday(day);
                const cellKey = `${dateStr}-${hour}`;
                const isOver = dragOverCell === cellKey;
                const isOfficeHour = isWithinOfficeHours(hour);
                const cellTasks = tasksByDayAndHour[dateStr]?.[hour] || [];
                const cellEvents = eventsByDayAndHour[dateStr]?.[hour] || [];
                
                return (
                  <HourCell
                    key={cellKey}
                    dateStr={dateStr}
                    hour={hour}
                    isToday={today}
                    isOfficeHour={isOfficeHour}
                    isOver={isOver}
                    isDragging={isDragging}
                    cellTasks={cellTasks}
                    cellEvents={cellEvents}
                    onTaskToggle={onTaskToggle}
                    onDragOver={(e) => handleDragOver(e, dateStr, hour)}
                    onDragEnter={(e) => handleDragEnter(e, dateStr, hour)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dateStr, hour)}
                    formatHour={formatHour}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

// Export memoized component
export const WeeklyTimelineBoard = memo(WeeklyTimelineBoardInner);
