import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { CapacityBar } from './CapacityBar';
import { cn } from '@/lib/utils';
import { ArrowRight, Plus } from 'lucide-react';
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
  const today = isToday(date);

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
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

  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden transition-all",
        today && "ring-2 ring-primary/30",
        isDragOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-2 border-b",
        today ? "bg-primary/10" : "bg-muted/50"
      )}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-xs font-medium",
              today ? "text-primary" : "text-muted-foreground"
            )}>
              {format(date, 'EEE')}
            </span>
            <span className={cn(
              "text-sm font-bold",
              today && "text-primary"
            )}>
              {format(date, 'd')}
            </span>
            {today && (
              <Badge className="text-[10px] px-1 py-0 h-4 bg-primary/20 text-primary border-0">
                Today
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6 -mr-1"
            asChild
          >
            <Link to={`/daily-plan?date=${dateStr}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        
        {/* Capacity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatTime(usedMinutes)} / {formatTime(capacityMinutes)}</span>
            {taskCount > 0 && <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>}
          </div>
          <CapacityBar usedMinutes={usedMinutes} capacityMinutes={capacityMinutes} />
        </div>
      </div>

      {/* Task list / drop zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 p-1.5 space-y-1 overflow-y-auto min-h-[120px]"
      >
        {dayTasks.length === 0 ? (
          <div className={cn(
            "flex flex-col items-center justify-center h-full text-center transition-all rounded-md",
            isDragOver ? "bg-primary/10" : "bg-transparent"
          )}>
            {isDragOver ? (
              <p className="text-xs font-medium text-primary">Release to schedule</p>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <Plus className="h-3 w-3" />
                <p className="text-[10px]">Drop tasks</p>
              </div>
            )}
          </div>
        ) : (
          dayTasks.map((task) => (
            <WeeklyTaskCard
              key={task.task_id}
              task={task}
              onToggle={onTaskToggle}
              compact
            />
          ))
        )}
      </div>
    </div>
  );
}