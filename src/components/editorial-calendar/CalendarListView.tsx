import { useMemo } from 'react';
import { addDays, format, isSameDay, isToday, parseISO, startOfWeek } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { CalendarDateMode } from '@/hooks/useCalendarSettings';
import { CheckCircle2, CalendarDays, Plus, Pencil, Rocket } from 'lucide-react';

interface Props {
  weekStart: Date;
  getItemsForDay: (date: Date, lane: 'create' | 'publish') => CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  onAddClick?: (date: Date, lane: 'create' | 'publish') => void;
  selectedPlatforms: string[];
  dateMode: CalendarDateMode;
}

function statusDot(status?: string) {
  switch (status) {
    case 'published':
    case 'completed':
      return 'bg-emerald-500';
    case 'scheduled':
    case 'ready':
      return 'bg-blue-500';
    case 'in-progress':
      return 'bg-amber-500';
    default:
      return 'bg-muted-foreground/40';
  }
}

export function CalendarListView({
  weekStart,
  getItemsForDay,
  onItemClick,
  onAddClick,
  selectedPlatforms,
  dateMode,
}: Props) {
  const { getPlatformColor } = useUserPlatforms();

  const lanesToShow: ('create' | 'publish')[] =
    dateMode === 'create-only' ? ['create']
    : dateMode === 'publish-only' ? ['publish']
    : ['publish', 'create'];

  const filterByPlatform = (items: CalendarItem[]) => {
    if (selectedPlatforms.length === 0) return items;
    return items.filter(i =>
      i.channel && selectedPlatforms.some(p => i.channel!.toLowerCase().includes(p.toLowerCase()))
    );
  };

  const days = useMemo(() => {
    const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [weekStart]);

  const rowsByDay = days.map(day => {
    const seen = new Map<string, { item: CalendarItem; lanes: Set<'create' | 'publish'> }>();
    for (const lane of lanesToShow) {
      for (const item of filterByPlatform(getItemsForDay(day, lane))) {
        const existing = seen.get(item.id);
        if (existing) {
          existing.lanes.add(lane);
        } else {
          seen.set(item.id, { item, lanes: new Set([lane]) });
        }
      }
    }
    return { day, rows: Array.from(seen.values()) };
  });

  const totalCount = rowsByDay.reduce((sum, d) => sum + d.rows.length, 0);

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto px-5 py-5 space-y-5">
          {totalCount === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No content this week.</p>
              <p className="text-xs mt-1">Add content or pull from your inbox to get started.</p>
            </div>
          )}

          {rowsByDay.map(({ day, rows }) => (
            <div key={day.toISOString()}>
              {/* Day header */}
              <div className="flex items-baseline justify-between mb-2 px-1">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'text-sm font-bold uppercase tracking-wide',
                    isToday(day) ? 'text-primary' : 'text-foreground'
                  )}>
                    {format(day, 'EEEE')}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {format(day, 'MMM d')}
                  </span>
                  {isToday(day) && (
                    <span className="text-[10px] font-bold text-primary uppercase">Today</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddClick?.(day, 'publish')}
                  className="h-6 px-1.5 text-[11px] text-muted-foreground/60 hover:text-primary gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>

              {rows.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onAddClick?.(day, 'publish')}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  Nothing planned. Click to add.
                </button>
              ) : (
                <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/40 overflow-hidden">
                  {rows.map(({ item, lanes }) => {
                    const color = getPlatformColor(item.channel || '') || '#9CA3AF';
                    const published = item.status === 'published' || item.status === 'completed';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onItemClick?.(item)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left group"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', statusDot(item.status))} aria-hidden />
                        <span className={cn(
                          'flex-1 text-sm font-medium truncate',
                          published && 'line-through text-muted-foreground'
                        )}>
                          {item.title}
                        </span>
                        {item.channel && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: `${color}1F`, color }}
                          >
                            {getPlatformShortLabel(item.channel)}
                          </span>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          {lanes.has('create') && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded bg-teal-500/10">
                              <Pencil className="h-2.5 w-2.5" /> Create
                            </span>
                          )}
                          {lanes.has('publish') && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded bg-violet-500/10">
                              <Rocket className="h-2.5 w-2.5" /> Publish
                            </span>
                          )}
                          {published && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
