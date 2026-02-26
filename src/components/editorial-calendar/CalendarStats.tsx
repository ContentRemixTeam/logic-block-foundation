import { useMemo } from 'react';
import { CalendarItem } from '@/lib/calendarConstants';
import { cn } from '@/lib/utils';

interface CalendarStatsProps {
  items: CalendarItem[];
  className?: string;
}

export function CalendarStats({ items, className }: CalendarStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return {
      total: items.length,
      scheduled: items.filter(i => i.publishDate || i.creationDate).length,
      published: items.filter(i => i.status === 'published' || i.status === 'completed').length,
      overdue: items.filter(i => {
        if (!i.publishDate) return false;
        const publishDate = new Date(i.publishDate);
        publishDate.setHours(0, 0, 0, 0);
        return publishDate < now && i.status !== 'published' && i.status !== 'completed';
      }).length,
    };
  }, [items]);

  return (
    <div className={cn("flex items-center gap-5 text-xs", className)}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="font-bold text-foreground tabular-nums">{stats.total}</span> total
      </span>
      <div className="w-px h-3.5 bg-border" />
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-teal-500" />
        <span className="font-bold text-foreground tabular-nums">{stats.scheduled}</span> scheduled
      </span>
      <div className="w-px h-3.5 bg-border" />
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="font-bold text-foreground tabular-nums">{stats.published}</span> published
      </span>
      {stats.overdue > 0 && (
        <>
          <div className="w-px h-3.5 bg-border" />
          <span className="flex items-center gap-1.5 text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="font-bold tabular-nums">{stats.overdue}</span> overdue
          </span>
        </>
      )}
    </div>
  );
}
