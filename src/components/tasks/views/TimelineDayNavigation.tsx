import { useEffect } from 'react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineDayNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function TimelineDayNavigation({
  selectedDate,
  onDateChange,
}: TimelineDayNavigationProps) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onDateChange(subDays(selectedDate, 1));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onDateChange(addDays(selectedDate, 1));
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          onDateChange(new Date());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, onDateChange]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) {
      return `Today - ${format(date, 'EEEE, MMM d')}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow - ${format(date, 'EEEE, MMM d')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday - ${format(date, 'EEEE, MMM d')}`;
    }
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange(subDays(selectedDate, 1))}
          className="h-10 w-10 shrink-0"
          title="Previous day (Alt + ←)"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="text-center min-w-[200px]">
          <h2 className={cn(
            "text-lg font-semibold",
            isToday(selectedDate) && "text-primary"
          )}>
            {getDateLabel(selectedDate)}
          </h2>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="h-10 w-10 shrink-0"
          title="Next day (Alt + →)"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {!isToday(selectedDate) && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDateChange(new Date())}
          className="gap-2"
          title="Jump to Today (Alt + T)"
        >
          <CalendarCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Jump to Today</span>
        </Button>
      )}
    </div>
  );
}
