import { useMemo } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarDayColumn } from './CalendarDayColumn';
import { CalendarItem } from '@/lib/calendarConstants';

interface CalendarWeekViewProps {
  weekStart: Date;
  getItemsForDay: (date: Date, lane: 'create' | 'publish') => CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  view: 'publish' | 'create';
  selectedPlatforms: string[];
}

export function CalendarWeekView({
  weekStart,
  getItemsForDay,
  onItemClick,
  view,
  selectedPlatforms,
}: CalendarWeekViewProps) {
  // Generate array of 7 days starting from Monday
  const weekDays = useMemo(() => {
    const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [weekStart]);

  // Filter items by selected platforms
  const filterByPlatform = (items: CalendarItem[]): CalendarItem[] => {
    if (selectedPlatforms.length === 0) return items;
    return items.filter(item => {
      if (!item.channel) return true;
      return selectedPlatforms.some(p => 
        item.channel?.toLowerCase().includes(p.toLowerCase())
      );
    });
  };

  return (
    <div className="flex-1 grid grid-cols-7 min-h-0 overflow-hidden">
      {weekDays.map((date) => (
        <CalendarDayColumn
          key={format(date, 'yyyy-MM-dd')}
          date={date}
          createItems={filterByPlatform(getItemsForDay(date, 'create'))}
          publishItems={filterByPlatform(getItemsForDay(date, 'publish'))}
          onItemClick={onItemClick}
          view={view}
        />
      ))}
    </div>
  );
}
