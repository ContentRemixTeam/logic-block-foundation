import { useState } from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Task } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { CapacityBar } from './CapacityBar';
import { cn } from '@/lib/utils';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DayColumnProps {
  date: Date;
  tasks: Task[];
  capacityMinutes: number;
  onTaskDrop: (taskId: string, fromPlannedDay: string | null, targetDate: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
}

export function DayColumn({ 
  date, 
  tasks, 
  capacityMinutes, 
  onTaskDrop, 
  onTaskToggle 
}: DayColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayTasks = tasks.filter(t => t.planned_day === dateStr)
    .sort((a, b) => (a.day_order || 0) - (b.day_order || 0));
  
  const usedMinutes = dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const taskCount = dayTasks.length;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskId = e.dataTransfer.getData('taskId');
    const fromPlannedDay = e.dataTransfer.getData('fromPlannedDay') || null;
    
    if (taskId) {
      onTaskDrop(taskId, fromPlannedDay, dateStr);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className={cn(
        "p-2 rounded-t-lg border-b",
        isToday(date) ? "bg-primary/10 border-primary/30" : "bg-muted/50"
      )}>
        <p className={cn(
          "text-xs font-medium text-center",
          isToday(date) && "text-primary"
        )}>
          {format(date, 'EEE')}
        </p>
        <p className={cn(
          "text-sm font-bold text-center",
          isToday(date) && "text-primary"
        )}>
          {format(date, 'd')}
        </p>
        
        <div className="mt-2">
          <CapacityBar usedMinutes={usedMinutes} capacityMinutes={capacityMinutes} />
        </div>
      </div>

      {/* Task list / drop zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 p-1 space-y-1 overflow-y-auto min-h-[150px] transition-colors rounded-b-lg border border-t-0",
          isDragOver ? "bg-primary/10 border-primary/50" : "bg-background"
        )}
      >
        {dayTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center px-2">
              Drag tasks here
            </p>
          </div>
        ) : (
          dayTasks.map((task) => (
            <WeeklyTaskCard
              key={task.task_id}
              task={task}
              onToggle={onTaskToggle}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-muted/30 rounded-b-lg">
        <p className="text-xs text-muted-foreground text-center mb-1">
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full h-7 text-xs"
          asChild
        >
          <Link to={`/daily-plan?date=${dateStr}`}>
            Open <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
