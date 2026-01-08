import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyPlannerHeaderProps {
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
  isCurrentWeek: boolean;
  onOpenOfficeHours?: () => void;
}

export function WeeklyPlannerHeader({
  currentWeekStart,
  onPreviousWeek,
  onNextWeek,
  onGoToToday,
  isCurrentWeek,
  onOpenOfficeHours,
}: WeeklyPlannerHeaderProps) {
  const weekEnd = addDays(currentWeekStart, 6);
  const weekLabel = `Week of ${format(currentWeekStart, 'MMMM d, yyyy')}`;

  return (
    <div className="flex items-center justify-between pb-4">
      <h1 className="text-2xl font-bold tracking-tight">Weekly Planner</h1>

      <div className="flex items-center gap-2">
        {onOpenOfficeHours && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenOfficeHours}>
            <Settings2 className="h-4 w-4" />
            Office Hours
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onPreviousWeek}>
          Previous Week
        </Button>

        <Button variant="outline" size="sm" onClick={onNextWeek}>
          Next Week
        </Button>

        {!isCurrentWeek && (
          <Button variant="ghost" size="sm" onClick={onGoToToday} className="gap-1">
            <CalendarDays className="h-4 w-4" />
            Today
          </Button>
        )}
      </div>
    </div>
  );
}
