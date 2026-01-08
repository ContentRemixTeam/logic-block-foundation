import { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { Task } from '@/components/tasks/types';
import { DayColumnNew } from './DayColumnNew';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface WeekBoardNewProps {
  tasks: Task[];
  weekStartDay: number;
  capacityMinutes: number;
  officeHoursStart?: string;
  officeHoursEnd?: string;
  onTaskDrop: (taskId: string, fromPlannedDay: string | null, targetDate: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  currentWeekStart: Date;
  onQuickAdd?: (text: string, plannedDay: string) => Promise<void>;
}

export function WeekBoardNew({
  tasks,
  weekStartDay,
  capacityMinutes,
  officeHoursStart,
  officeHoursEnd,
  onTaskDrop,
  onTaskToggle,
  currentWeekStart,
  onQuickAdd,
}: WeekBoardNewProps) {
  // Generate 7 days starting from week start
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-max">
        {weekDays.map((date) => (
          <div key={format(date, 'yyyy-MM-dd')} className="w-[160px] shrink-0">
            <DayColumnNew
              date={date}
              tasks={tasks}
              capacityMinutes={capacityMinutes}
              officeHoursStart={officeHoursStart}
              officeHoursEnd={officeHoursEnd}
              onTaskDrop={onTaskDrop}
              onTaskToggle={onTaskToggle}
              onQuickAdd={onQuickAdd}
            />
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
