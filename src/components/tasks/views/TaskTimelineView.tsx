import { useMemo } from 'react';
import { format, parseISO, isToday, addHours, startOfDay, isSameHour } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Task } from '../types';
import { Clock, Plus } from 'lucide-react';

interface TaskTimelineViewProps {
  tasks: Task[];
  selectedDate: Date;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onOpenDetail: (task: Task) => void;
  onAddTaskAtTime: (hour: number) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

export function TaskTimelineView({
  tasks,
  selectedDate,
  onUpdateTask,
  onOpenDetail,
  onAddTaskAtTime,
}: TaskTimelineViewProps) {
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

  // Unscheduled tasks for today
  const unscheduledTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.is_completed) return false;
      if (task.time_block_start) return false;
      
      if (task.scheduled_date) {
        return isToday(parseISO(task.scheduled_date));
      }
      return false;
    });
  }, [tasks]);

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
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="divide-y">
              {HOURS.map(hour => {
                const hourTasks = timeBlockedTasks[hour] || [];
                const isCurrentHour = isToday(selectedDate) && hour === currentHour;

                return (
                  <div
                    key={hour}
                    className={cn(
                      "flex min-h-[80px] hover:bg-muted/30 transition-colors",
                      isCurrentHour && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, hour)}
                  >
                    {/* Hour label */}
                    <div className="w-20 py-2 px-3 text-sm text-muted-foreground border-r flex-shrink-0">
                      <span className={cn(isCurrentHour && "text-primary font-medium")}>
                        {format(addHours(startOfDay(new Date()), hour), 'h a')}
                      </span>
                    </div>

                    {/* Tasks area */}
                    <div className="flex-1 p-2 min-h-[80px]">
                      {hourTasks.length > 0 ? (
                        <div className="space-y-1">
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
                                  "bg-primary/10 border border-primary/20 hover:bg-primary/20",
                                  "flex items-center gap-2",
                                  heightClass
                                )}
                              >
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
