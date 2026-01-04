import { useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday, 
  parseISO,
  addWeeks,
  subWeeks,
  isSameDay
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Task } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskWeekViewProps {
  tasks: Task[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onOpenDetail: (task: Task) => void;
}

export function TaskWeekView({
  tasks,
  selectedDate,
  onDateChange,
  onUpdateTask,
  onOpenDetail,
}: TaskWeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = [];
    });

    tasks.forEach(task => {
      if (task.is_completed) return;
      if (!task.scheduled_date) return;
      
      const dateKey = task.scheduled_date;
      if (grouped[dateKey]) {
        grouped[dateKey].push(task);
      }
    });

    // Sort tasks by time block start
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        if (!a.time_block_start && !b.time_block_start) return 0;
        if (!a.time_block_start) return 1;
        if (!b.time_block_start) return -1;
        return a.time_block_start.localeCompare(b.time_block_start);
      });
    });

    return grouped;
  }, [tasks, weekDays]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onUpdateTask(taskId, { 
        scheduled_date: format(date, 'yyyy-MM-dd'),
        status: 'scheduled' 
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(subWeeks(selectedDate, 1))}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev Week
        </Button>
        
        <h2 className="text-lg font-semibold">
          Week of {format(weekStart, 'MMMM d')} - {format(weekEnd, 'd, yyyy')}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(addWeeks(selectedDate, 1))}
          className="gap-2"
        >
          Next Week
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay[dateKey] || [];
          const isCurrentDay = isToday(day);

          return (
            <Card
              key={dateKey}
              className={cn(
                "min-h-[300px] transition-all",
                isCurrentDay && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Day Header */}
              <div
                className={cn(
                  "p-2 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                  isCurrentDay && "bg-primary/10"
                )}
                onClick={() => onDateChange(day)}
              >
                <div className="text-center">
                  <p className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    isCurrentDay ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn(
                    "text-xl font-bold",
                    isCurrentDay && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </p>
                </div>
              </div>

              {/* Tasks */}
              <ScrollArea className="h-[240px]">
                <CardContent className="p-2 space-y-1">
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No tasks
                    </p>
                  ) : (
                    dayTasks.map(task => (
                      <div
                        key={task.task_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.task_id)}
                        onClick={() => onOpenDetail(task)}
                        className={cn(
                          "p-2 rounded-md text-xs cursor-pointer transition-all",
                          "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                          "hover:shadow-sm"
                        )}
                      >
                        {task.time_block_start && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            {format(parseISO(task.time_block_start), 'h:mm a')}
                          </p>
                        )}
                        <p className="font-medium truncate">{task.task_text}</p>
                        {task.priority && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] mt-1 h-4",
                              task.priority === 'high' && "border-destructive text-destructive",
                              task.priority === 'medium' && "border-warning text-warning"
                            )}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
