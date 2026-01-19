import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, isAfter } from 'date-fns';

interface DayStatus {
  date: Date;
  completed: boolean | null; // null = no data/future
}

interface WeeklyHabitGridProps {
  logs: Array<{ date: string; completed: boolean }>;
  className?: string;
  showLabels?: boolean;
}

export function WeeklyHabitGrid({ logs, className, showLabels = false }: WeeklyHabitGridProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  const days: DayStatus[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = logs.find((l) => l.date === dateStr);

    return {
      date,
      completed: isAfter(date, today) ? null : log?.completed ?? false,
    };
  });

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className={cn('flex gap-1 items-center', className)}>
      {days.map((day, i) => {
        const isToday = isSameDay(day.date, today);
        const isFuture = day.completed === null;

        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {showLabels && (
              <span className="text-[10px] text-muted-foreground">{dayLabels[i]}</span>
            )}
            <div
              className={cn(
                'w-3 h-3 rounded-full transition-all',
                isFuture && 'bg-muted',
                day.completed === true && 'bg-green-500',
                day.completed === false && !isFuture && 'bg-destructive/30',
                isToday && !isFuture && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
              )}
              title={`${format(day.date, 'EEE, MMM d')}: ${
                isFuture ? 'Upcoming' : day.completed ? 'Completed' : 'Missed'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
