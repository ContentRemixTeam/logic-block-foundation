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
  onQuickAdd?: (text: string, plannedDay: string) => Promise<void>;
}

export function WeekBoard({ 
  tasks, 
  weekStartDay, 
  capacityMinutes,
  onTaskDrop,
  onTaskToggle,
  currentWeekStart,
  onQuickAdd
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
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      <div className="grid grid-cols-7 gap-3 min-w-[1120px] h-full">
        {weekDays.map((date) => (
          <DayColumn
            key={format(date, 'yyyy-MM-dd')}
            date={date}
            tasks={tasks}
            capacityMinutes={capacityMinutes}
            onTaskDrop={onTaskDrop}
            onTaskToggle={onTaskToggle}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>
    </div>
  );
}
