import { useMemo } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarItem, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { Lightbulb, FileEdit, CalendarClock, Send, CheckCircle2, Inbox } from 'lucide-react';

interface Props {
  items: CalendarItem[];
  unscheduledItems: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  selectedPlatforms: string[];
}

type Stage = 'idea' | 'draft' | 'scheduled' | 'in-progress' | 'published';

const STAGES: { key: Stage; label: string; icon: typeof Lightbulb; tone: string }[] = [
  { key: 'idea', label: 'Ideas', icon: Lightbulb, tone: 'text-amber-600 bg-amber-500/10' },
  { key: 'draft', label: 'Drafts', icon: FileEdit, tone: 'text-slate-600 bg-slate-500/10' },
  { key: 'in-progress', label: 'In Progress', icon: FileEdit, tone: 'text-orange-600 bg-orange-500/10' },
  { key: 'scheduled', label: 'Scheduled', icon: CalendarClock, tone: 'text-blue-600 bg-blue-500/10' },
  { key: 'published', label: 'Published', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
];

function classify(item: CalendarItem, isUnscheduled: boolean): Stage {
  const s = item.status?.toLowerCase();
  if (s === 'published' || s === 'completed') return 'published';
  if (s === 'in-progress' || s === 'in_progress') return 'in-progress';
  if (s === 'scheduled' || s === 'ready') return 'scheduled';
  if (isUnscheduled) return 'idea';
  if (s === 'draft' || !s) return 'draft';
  return 'draft';
}

export function CalendarPipelineView({
  items,
  unscheduledItems,
  onItemClick,
  selectedPlatforms,
}: Props) {
  const { getPlatformColor } = useUserPlatforms();

  const filterByPlatform = (list: CalendarItem[]) => {
    if (selectedPlatforms.length === 0) return list;
    return list.filter(i =>
      i.channel && selectedPlatforms.some(p => i.channel!.toLowerCase().includes(p.toLowerCase()))
    );
  };

  const grouped = useMemo(() => {
    const map: Record<Stage, CalendarItem[]> = {
      idea: [],
      draft: [],
      scheduled: [],
      'in-progress': [],
      published: [],
    };
    for (const item of filterByPlatform(unscheduledItems)) {
      map[classify(item, true)].push(item);
    }
    const seen = new Set<string>();
    for (const item of filterByPlatform(items)) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      map[classify(item, false)].push(item);
    }
    return map;
  }, [items, unscheduledItems, selectedPlatforms, getPlatformColor]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex gap-3 p-4 min-w-max">
          {STAGES.map(({ key, label, icon: Icon, tone }) => {
            const stageItems = grouped[key];
            return (
              <div
                key={key}
                className="flex-1 min-w-[240px] max-w-[280px] rounded-xl bg-muted/20 border border-border/40 flex flex-col"
              >
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
                  <span className={cn('inline-flex items-center justify-center h-6 w-6 rounded-md', tone)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                    {label}
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-full">
                    {stageItems.length}
                  </span>
                </div>

                <div className="p-2 space-y-1.5 min-h-[120px]">
                  {stageItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/50">
                      <Inbox className="h-5 w-5 mb-1" />
                      <span className="text-[10px]">Empty</span>
                    </div>
                  )}
                  {stageItems.map(item => {
                    const color = getPlatformColor(item.channel || '') || '#9CA3AF';
                    const date = item.publishDate || item.creationDate;
                    return (
                      <button
                        key={`${item.id}:${key}`}
                        type="button"
                        onClick={() => onItemClick?.(item)}
                        className="w-full text-left bg-card rounded-lg p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all border border-border/40"
                        style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {item.channel && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `${color}1F`, color }}
                            >
                              {getPlatformShortLabel(item.channel)}
                            </span>
                          )}
                          {date && (
                            <span className="text-[10px] text-muted-foreground/70 ml-auto">
                              {format(new Date(date), 'MMM d')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold leading-snug line-clamp-2 text-foreground">
                          {item.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
