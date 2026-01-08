import { useState } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { Task } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { InlineTaskAdd } from './InlineTaskAdd';
import { cn } from '@/lib/utils';

interface DayColumnNewProps {
  date: Date;
  tasks: Task[];
  capacityMinutes: number;
  officeHoursStart?: string;
  officeHoursEnd?: string;
  onTaskDrop: (taskId: string, fromPlannedDay: string | null, targetDate: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onQuickAdd?: (text: string, plannedDay: string) => Promise<void>;
}

export function DayColumnNew({
  date,
  tasks,
  capacityMinutes,
  officeHoursStart = '9:00',
  officeHoursEnd = '17:00',
  onTaskDrop,
  onTaskToggle,
  onQuickAdd,
}: DayColumnNewProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayTasks = tasks
    .filter((t) => t.planned_day === dateStr)
    .sort((a, b) => (a.day_order || 0) - (b.day_order || 0));

  const usedMinutes = dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const today = isToday(date);
  const isPast = isBefore(startOfDay(date), startOfDay(new Date())) && !today;

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '00:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const capacityPercent = capacityMinutes > 0 ? Math.min((usedMinutes / capacityMinutes) * 100, 100) : 0;

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
        'flex flex-col bg-card rounded-lg border min-w-[140px] transition-all',
        today && 'ring-2 ring-primary/30 border-primary/40',
        isPast && 'opacity-60',
        isDragOver && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-3 py-2 border-b text-center',
          today ? 'bg-primary/10' : 'bg-muted/30'
        )}
      >
        <div className="font-semibold text-sm">
          {format(date, 'EEEE')}
        </div>
        <div className={cn('text-xs', today ? 'text-primary font-medium' : 'text-muted-foreground')}>
          {format(date, 'MMM d')}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {officeHoursStart} - {officeHoursEnd}
        </div>
      </div>

      {/* Capacity indicator */}
      <div className="px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{formatTime(usedMinutes)}</span>
          <span className="text-[10px]">{Math.round(capacityPercent)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              capacityPercent > 100 ? 'bg-destructive' : capacityPercent > 80 ? 'bg-warning' : 'bg-success'
            )}
            style={{ width: `${Math.min(capacityPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Tasks area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn('flex-1 p-2 space-y-1.5 overflow-y-auto min-h-[200px]')}
      >
        {dayTasks.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground/50 text-center px-2">
              Drop tasks here or add below
            </p>
          </div>
        )}

        {isDragOver && dayTasks.length === 0 && (
          <div className="flex items-center justify-center h-full rounded-md bg-primary/10">
            <p className="text-xs font-medium text-primary">Release to schedule</p>
          </div>
        )}

        {dayTasks.map((task) => (
          <WeeklyTaskCard key={task.task_id} task={task} onToggle={onTaskToggle} compact />
        ))}
      </div>

      {/* Quick add */}
      {onQuickAdd && (
        <div className="border-t p-1.5">
          <InlineTaskAdd onAdd={handleInlineAdd} placeholder="+ Add" />
        </div>
      )}
    </div>
  );
}
