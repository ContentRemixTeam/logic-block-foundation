import { useMemo } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarItem, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface Props {
  items: CalendarItem[];
  unscheduledItems: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  selectedPlatforms: string[];
}

export function CalendarGalleryView({
  items,
  unscheduledItems,
  onItemClick,
  selectedPlatforms,
}: Props) {
  const { getPlatformColor } = useUserPlatforms();

  const all = useMemo(() => {
    const seen = new Set<string>();
    const merged: CalendarItem[] = [];
    for (const item of [...items, ...unscheduledItems]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    if (selectedPlatforms.length > 0) {
      return merged.filter(i =>
        i.channel && selectedPlatforms.some(p => i.channel!.toLowerCase().includes(p.toLowerCase()))
      );
    }
    return merged;
  }, [items, unscheduledItems, selectedPlatforms]);

  const sorted = useMemo(() => {
    return [...all].sort((a, b) => {
      const ad = a.publishDate || a.creationDate;
      const bd = b.publishDate || b.creationDate;
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return new Date(ad).getTime() - new Date(bd).getTime();
    });
  }, [all]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-5">
          {sorted.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No content yet.</p>
              <p className="text-xs mt-1">Add visual posts to see them in the gallery.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sorted.map(item => {
                const color = getPlatformColor(item.channel || '') || '#9CA3AF';
                const date = item.publishDate || item.creationDate;
                const published = item.status === 'published' || item.status === 'completed';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onItemClick?.(item)}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-card border border-border/40 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left flex flex-col"
                    style={{ borderTop: `3px solid ${color}` }}
                  >
                    {/* Background tile */}
                    <div
                      className="flex-1 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${color}14, ${color}05)`,
                      }}
                    >
                      <ImageIcon
                        className="h-10 w-10 opacity-30 group-hover:opacity-60 transition-opacity"
                        style={{ color }}
                      />
                    </div>

                    {/* Footer overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/95 to-transparent p-2.5 pt-6">
                      <div className="flex items-center gap-1 mb-1">
                        {item.channel && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${color}1F`, color }}
                          >
                            {getPlatformShortLabel(item.channel)}
                          </span>
                        )}
                        {date && (
                          <span className="text-[9px] text-muted-foreground ml-auto">
                            {format(new Date(date), 'MMM d')}
                          </span>
                        )}
                        {published && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                      </div>
                      <p className={cn(
                        'text-[11px] font-semibold leading-tight line-clamp-2',
                        published ? 'line-through text-muted-foreground' : 'text-foreground'
                      )}>
                        {item.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
