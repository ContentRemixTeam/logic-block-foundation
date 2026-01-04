import { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval, 
  isToday, 
  isSameMonth,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Task } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskMonthViewProps {
  tasks: Task[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onOpenDetail: (task: Task) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TaskMonthView({
  tasks,
  selectedDate,
  onDateChange,
  onOpenDetail,
}: TaskMonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach(task => {
      if (task.is_completed) return;
      if (!task.scheduled_date) return;
      
      const dateKey = task.scheduled_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });

    return grouped;
  }, [tasks]);

  // Get task dots with colors
  const getTaskDots = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayTasks = tasksByDay[dateKey] || [];
    
    // Limit to 3 dots + count
    const displayTasks = dayTasks.slice(0, 3);
    const remaining = dayTasks.length - 3;

    return { displayTasks, remaining, total: dayTasks.length };
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-primary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(subMonths(selectedDate, 1))}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        
        <h2 className="text-xl font-bold">
          {format(selectedDate, 'MMMM yyyy')}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(addMonths(selectedDate, 1))}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const isCurrentDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const { displayTasks, remaining, total } = getTaskDots(day);
              const dateKey = format(day, 'yyyy-MM-dd');

              return (
                <TooltipProvider key={dateKey} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "min-h-[80px] p-1 rounded-md cursor-pointer transition-all",
                          "hover:bg-muted/50 border border-transparent",
                          isCurrentDay && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                          !isCurrentMonth && "opacity-40",
                          total > 0 && "hover:border-primary/30"
                        )}
                        onClick={() => onDateChange(day)}
                      >
                        <span className={cn(
                          "block text-sm font-medium mb-1",
                          isCurrentDay && "text-primary font-bold",
                          !isCurrentMonth && "text-muted-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>

                        {/* Task Dots */}
                        {displayTasks.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {displayTasks.map((task, idx) => (
                              <div
                                key={task.task_id}
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  getPriorityColor(task.priority)
                                )}
                              />
                            ))}
                            {remaining > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{remaining}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    
                    {total > 0 && (
                      <TooltipContent side="right" className="max-w-[200px]">
                        <p className="font-medium mb-1">{format(day, 'MMMM d')}</p>
                        <ul className="space-y-1">
                          {(tasksByDay[dateKey] || []).slice(0, 5).map(task => (
                            <li 
                              key={task.task_id} 
                              className="text-xs flex items-center gap-1"
                              onClick={() => onOpenDetail(task)}
                            >
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                getPriorityColor(task.priority)
                              )} />
                              <span className="truncate">{task.task_text}</span>
                            </li>
                          ))}
                          {total > 5 && (
                            <li className="text-xs text-muted-foreground">
                              +{total - 5} more
                            </li>
                          )}
                        </ul>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span>High Priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Normal</span>
        </div>
      </div>
    </div>
  );
}
