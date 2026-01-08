import { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { Task } from '@/components/tasks/types';
import { DayColumn } from './DayColumn';

interface WeekBoardProps {
  tasks: Task[];
  weekStartDay: number;
  capacityMinutes: number;
  onTaskDrop: (taskId: string, fromPlannedDay: string | null, targetDate: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  currentWeekStart: Date;
}

export function WeekBoard({ 
  tasks, 
  weekStartDay, 
  capacityMinutes,
  onTaskDrop,
  onTaskToggle,
  currentWeekStart
}: WeekBoardProps) {
  // Generate 7 days starting from week start
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  return (
    <div className="grid grid-cols-7 gap-2 h-full">
      {weekDays.map((date) => (
        <DayColumn
          key={format(date, 'yyyy-MM-dd')}
          date={date}
          tasks={tasks}
          capacityMinutes={capacityMinutes}
          onTaskDrop={onTaskDrop}
          onTaskToggle={onTaskToggle}
        />
      ))}
    </div>
  );
}