import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Task } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { CapacityBar } from './CapacityBar';
import { InlineTaskAdd } from './InlineTaskAdd';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DayColumnProps {
  date: Date;
  tasks: Task[];
  capacityMinutes: number;
  onTaskDrop: (taskId: string, fromPlannedDay: string | null, targetDate: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onQuickAdd?: (text: string, plannedDay: string) => Promise<void>;
}

export function DayColumn({ 
  date, 
  tasks, 
  capacityMinutes, 
  onTaskDrop, 
  onTaskToggle,
  onQuickAdd
}: DayColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayTasks = tasks.filter(t => t.planned_day === dateStr)
    .sort((a, b) => (a.day_order || 0) - (b.day_order || 0));
  
  const usedMinutes = dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const today = isToday(date);

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}m`;
  };

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

  const handleInlineAdd = async (text: string) => {
    if (onQuickAdd) {
      await onQuickAdd(text, dateStr);
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden transition-all min-w-[160px]",
        today && "ring-2 ring-primary/40 border-primary/30",
        isDragOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Compact Header */}
      <div className={cn(
        "px-3 py-2 border-b",
        today ? "bg-primary/10" : "bg-muted/30"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-xs font-medium uppercase tracking-wide",
              today ? "text-primary" : "text-muted-foreground"
            )}>
              {format(date, 'EEE')}
            </span>
            <span className={cn(
              "text-lg font-bold",
              today && "text-primary"
            )}>
              {format(date, 'd')}
            </span>
            {today && (
              <span className="text-[10px] font-medium text-primary bg-primary/20 px-1.5 py-0.5 rounded-full ml-1">
                Today
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6 -mr-1 opacity-60 hover:opacity-100"
            asChild
          >
            <Link to={`/daily-plan?date=${dateStr}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        
        {/* Inline Capacity */}
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatTime(usedMinutes)} / {formatTime(capacityMinutes)}</span>
          </div>
          <CapacityBar usedMinutes={usedMinutes} capacityMinutes={capacityMinutes} />
        </div>
      </div>

      {/* Task list / drop zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 p-2 space-y-1.5 overflow-y-auto min-h-[140px]"
      >
        {dayTasks.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-xs text-muted-foreground/50">Drop tasks here</p>
          </div>
        )}
        
        {isDragOver && dayTasks.length === 0 && (
          <div className="flex items-center justify-center h-full text-center rounded-md bg-primary/10">
            <p className="text-xs font-medium text-primary">Release to schedule</p>
          </div>
        )}
        
        {dayTasks.map((task) => (
          <WeeklyTaskCard
            key={task.task_id}
            task={task}
            onToggle={onTaskToggle}
            compact
          />
        ))}
      </div>

      {/* Inline Add */}
      {onQuickAdd && (
        <div className="border-t p-1.5">
          <InlineTaskAdd 
            onAdd={handleInlineAdd}
            placeholder="Add task..."
          />
        </div>
      )}
    </div>
  );
}
