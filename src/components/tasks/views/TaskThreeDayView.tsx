import { useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Task } from '../types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

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

export function TaskThreeDayView({
  tasks,
  selectedDate,
  onDateChange,
  onUpdateTask,
  onOpenDetail,
  onAddTaskAtTime,
}: TaskThreeDayViewProps) {
  const threeDays = [selectedDate, addDays(selectedDate, 1), addDays(selectedDate, 2)];

  // Group tasks by day and hour
  const tasksByDayAndHour = useMemo(() => {
    const grouped: Record<string, Record<number, Task[]>> = {};

    threeDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = {};
      HOURS.forEach(hour => {
        grouped[dateKey][hour] = [];
      });
    });

    tasks.forEach(task => {
      if (task.is_completed) return;
      if (!task.scheduled_date) return;
      if (!task.time_block_start) return;

      const dateKey = task.scheduled_date;
      if (!grouped[dateKey]) return;

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

    return grouped;
  }, [tasks, threeDays]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const blockStart = addHours(startOfDay(date), hour);
      onUpdateTask(taskId, { 
        scheduled_date: format(date, 'yyyy-MM-dd'),
        time_block_start: blockStart.toISOString(),
        time_block_end: addHours(blockStart, 2).toISOString(),
        status: 'scheduled' 
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const currentHour = new Date().getHours();

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(subDays(selectedDate, 3))}
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
          onClick={() => onDateChange(addDays(selectedDate, 3))}
          className="gap-2"
        >
          Next 3 Days
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

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
                "overflow-hidden transition-all",
                isCurrentDay && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              {/* Day Header */}
              <div
                className={cn(
                  "p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors text-center",
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
                      <div
                        key={hour}
                        className={cn(
                          "h-[80px] border-b p-1 transition-colors",
                          "hover:bg-muted/30",
                          isCurrentHour && "bg-primary/5 border-l-2 border-l-primary"
                        )}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day, hour)}
                      >
                        {hourTasks.length > 0 ? (
                          <div className="space-y-1 h-full overflow-hidden">
                            {hourTasks.slice(0, 2).map(task => (
                              <div
                                key={task.task_id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.task_id)}
                                onClick={() => onOpenDetail(task)}
                                className={cn(
                                  "p-1.5 rounded text-xs cursor-pointer transition-all",
                                  "bg-primary/10 hover:bg-primary/20 border border-primary/20"
                                )}
                              >
                                <p className="font-medium truncate">{task.task_text}</p>
                                {task.estimated_minutes && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {task.estimated_minutes}m
                                  </span>
                                )}
                              </div>
                            ))}
                            {hourTasks.length > 2 && (
                              <p className="text-[10px] text-muted-foreground text-center">
                                +{hourTasks.length - 2} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => onAddTaskAtTime(hour, day)}
                            className="w-full h-full flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 rounded transition-colors group"
                          >
                            <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
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
