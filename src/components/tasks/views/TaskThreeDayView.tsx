import { useMemo, useCallback, memo } from 'react';
import { 
  format, 
  addDays,
  subDays,
  isToday, 
  parseISO,
  addHours,
  startOfDay
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Task } from '../types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getTasksForDate, separateScheduledTasks } from '@/lib/taskFilters';

interface TaskThreeDayViewProps {
  tasks: Task[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onOpenDetail: (task: Task) => void;
  onAddTaskAtTime: (hour: number, date: Date) => void;
}

// Condensed hours - 2-hour blocks from 6 AM to 10 PM
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20];

// Memoized draggable task item to prevent re-renders during drag
const DraggableTask = memo(function DraggableTask({
  task,
  onDragStart,
  onClick,
  variant = 'scheduled'
}: {
  task: Task;
  onDragStart: (taskId: string) => void;
  onClick: (task: Task) => void;
  variant?: 'scheduled' | 'unscheduled';
}) {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.task_id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(task.task_id);
  }, [task.task_id, onDragStart]);

  const handleClick = useCallback(() => {
    onClick(task);
  }, [task, onClick]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={cn(
        "p-1.5 rounded text-xs cursor-grab active:cursor-grabbing transition-all",
        variant === 'scheduled' 
          ? "bg-primary/10 hover:bg-primary/20 border border-primary/20"
          : "bg-background border hover:border-primary/50 hover:shadow-sm"
      )}
    >
      <p className="font-medium truncate">{task.task_text}</p>
      {variant === 'scheduled' && task.estimated_minutes && (
        <span className="text-[10px] text-muted-foreground">
          {task.estimated_minutes}m
        </span>
      )}
    </div>
  );
});

// Memoized time slot component
const TimeSlot = memo(function TimeSlot({
  hour,
  tasks,
  isCurrentHour,
  dateKey,
  day,
  onDragStart,
  onOpenDetail,
  onDrop,
  onAddTaskAtTime
}: {
  hour: number;
  tasks: Task[];
  isCurrentHour: boolean;
  dateKey: string;
  day: Date;
  onDragStart: (taskId: string) => void;
  onOpenDetail: (task: Task) => void;
  onDrop: (taskId: string, date: Date, hour: number) => void;
  onAddTaskAtTime: (hour: number, date: Date) => void;
}) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDrop(taskId, day, hour);
    }
  }, [day, hour, onDrop]);

  const handleAddTask = useCallback(() => {
    onAddTaskAtTime(hour, day);
  }, [hour, day, onAddTaskAtTime]);

  return (
    <div
      className={cn(
        "h-[80px] border-b p-1",
        "hover:bg-muted/30",
        isCurrentHour && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {tasks.length > 0 ? (
        <div className="space-y-1 h-full overflow-hidden">
          {tasks.slice(0, 2).map(task => (
            <DraggableTask
              key={task.task_id}
              task={task}
              onDragStart={onDragStart}
              onClick={onOpenDetail}
              variant="scheduled"
            />
          ))}
          {tasks.length > 2 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{tasks.length - 2} more
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={handleAddTask}
          className="w-full h-full flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 rounded group"
        >
          <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
});

export function TaskThreeDayView({
  tasks,
  selectedDate,
  onDateChange,
  onUpdateTask,
  onOpenDetail,
  onAddTaskAtTime,
}: TaskThreeDayViewProps) {
  // Stable date keys to prevent unnecessary recalculations
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { threeDays, dateKeys } = useMemo(() => {
    const days = [selectedDate, addDays(selectedDate, 1), addDays(selectedDate, 2)];
    const keys = days.map(d => format(d, 'yyyy-MM-dd'));
    return { threeDays: days, dateKeys: keys };
  }, [selectedDateStr]);

  // Memoize current hour once
  const currentHour = useMemo(() => new Date().getHours(), []);

  // Get tasks for the 3-day range and separate into scheduled/unscheduled
  const { tasksByDayAndHour, unscheduledByDay } = useMemo(() => {
    const grouped: Record<string, Record<number, Task[]>> = {};
    const unscheduled: Record<string, Task[]> = {};

    dateKeys.forEach(dateKey => {
      grouped[dateKey] = {};
      unscheduled[dateKey] = [];
      HOURS.forEach(hour => {
        grouped[dateKey][hour] = [];
      });
    });

    // Process each day
    dateKeys.forEach(dateKey => {
      const dayTasks = getTasksForDate(tasks, dateKey).filter(t => !t.is_completed);
      const { scheduled, unscheduled: pool } = separateScheduledTasks(dayTasks);
      
      // Add unscheduled to pool
      unscheduled[dateKey] = pool;
      
      // Group scheduled by hour
      scheduled.forEach(task => {
        if (!task.time_block_start) return;
        
        const startTime = parseISO(task.time_block_start);
        const hour = startTime.getHours();
        
        // Find the closest 2-hour block
        const blockHour = HOURS.reduce((prev, curr) => 
          Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
        );

        if (grouped[dateKey][blockHour]) {
          grouped[dateKey][blockHour].push(task);
        }
      });
    });

    return { tasksByDayAndHour: grouped, unscheduledByDay: unscheduled };
  }, [tasks, dateKeys]);

  // Check if any day has unscheduled tasks
  const hasUnscheduledTasks = useMemo(() => {
    return dateKeys.some(dateKey => {
      return (unscheduledByDay[dateKey]?.length || 0) > 0;
    });
  }, [unscheduledByDay, dateKeys]);

  // Memoized handlers
  const handleDragStart = useCallback((taskId: string) => {
    // No-op - actual drag start is handled by DraggableTask
  }, []);

  const handleDrop = useCallback((taskId: string, date: Date, hour: number) => {
    const blockStart = addHours(startOfDay(date), hour);
    onUpdateTask(taskId, { 
      scheduled_date: format(date, 'yyyy-MM-dd'),
      time_block_start: blockStart.toISOString(),
      time_block_end: addHours(blockStart, 2).toISOString(),
      status: 'scheduled' 
    });
  }, [onUpdateTask]);

  const handlePrevDays = useCallback(() => {
    onDateChange(subDays(selectedDate, 3));
  }, [onDateChange, selectedDate]);

  const handleNextDays = useCallback(() => {
    onDateChange(addDays(selectedDate, 3));
  }, [onDateChange, selectedDate]);

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevDays}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev 3 Days
        </Button>
        
        <h2 className="text-lg font-semibold">
          {format(selectedDate, 'MMM d')} - {format(addDays(selectedDate, 2), 'MMM d, yyyy')}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextDays}
          className="gap-2"
        >
          Next 3 Days
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Unscheduled Tasks Pool - Only show if there are unscheduled tasks */}
      {hasUnscheduledTasks && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Unscheduled — Drag to a time slot
            </p>
            <div className="grid grid-cols-3 gap-2">
              {threeDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const poolTasks = unscheduledByDay[dateKey] || [];
                
                return (
                  <div key={dateKey} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground text-center">
                      {format(day, 'EEE')}
                    </p>
                    {poolTasks.length > 0 ? (
                      poolTasks.slice(0, 3).map(task => (
                        <DraggableTask
                          key={task.task_id}
                          task={task}
                          onDragStart={handleDragStart}
                          onClick={onOpenDetail}
                          variant="unscheduled"
                        />
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 text-center py-1">—</p>
                    )}
                    {poolTasks.length > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        +{poolTasks.length - 3} more
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Three Day Grid */}
      <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-2">
        {/* Time Labels Column */}
        <div className="pt-[52px]">
          {HOURS.map(hour => (
            <div key={hour} className="h-[80px] text-xs text-muted-foreground pr-2 text-right">
              {format(addHours(startOfDay(new Date()), hour), 'h a')}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {threeDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isCurrentDay = isToday(day);

          return (
            <Card
              key={dateKey}
              className={cn(
                "overflow-hidden",
                isCurrentDay && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              {/* Day Header */}
              <div
                className={cn(
                  "p-3 border-b cursor-pointer hover:bg-muted/50 text-center",
                  isCurrentDay && "bg-primary/10"
                )}
                onClick={() => onDateChange(day)}
              >
                <p className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  isCurrentDay ? "text-primary" : "text-muted-foreground"
                )}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn(
                  "text-lg font-bold",
                  isCurrentDay && "text-primary"
                )}>
                  {format(day, 'MMM d')}
                </p>
              </div>

              {/* Time Blocks */}
              <ScrollArea className="h-[calc(100vh-400px)]">
                <CardContent className="p-0">
                  {HOURS.map(hour => {
                    const hourTasks = tasksByDayAndHour[dateKey]?.[hour] || [];
                    const isCurrentHour = isCurrentDay && 
                      hour <= currentHour && currentHour < hour + 2;

                    return (
                      <TimeSlot
                        key={hour}
                        hour={hour}
                        tasks={hourTasks}
                        isCurrentHour={isCurrentHour}
                        dateKey={dateKey}
                        day={day}
                        onDragStart={handleDragStart}
                        onOpenDetail={onOpenDetail}
                        onDrop={handleDrop}
                        onAddTaskAtTime={onAddTaskAtTime}
                      />
                    );
                  })}
                </CardContent>
              </ScrollArea>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
