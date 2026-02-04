import { useMemo, useRef } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarDayColumn } from './CalendarDayColumn';
import { CalendarItem } from '@/lib/calendarConstants';
import { CampaignBar, Campaign } from './CampaignBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface CalendarWeekViewProps {
  weekStart: Date;
  campaigns?: Campaign[];
  getItemsForDay: (date: Date, lane: 'create' | 'publish') => CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  onCampaignClick?: (campaignId: string) => void;
  view: 'publish' | 'create';
  selectedPlatforms: string[];
}

export function CalendarWeekView({
  weekStart,
  campaigns = [],
  getItemsForDay,
  onItemClick,
  onCampaignClick,
  view,
  selectedPlatforms,
}: CalendarWeekViewProps) {
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Filter campaigns with valid dates
  const validCampaigns = campaigns.filter(c => c.cart_opens && c.cart_closes);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Campaign Bars Section */}
      {validCampaigns.length > 0 && (
        <div className="shrink-0 px-2 py-2 border-b border-border bg-muted/30">
          <div className="grid grid-cols-7 gap-1">
            {validCampaigns.map(campaign => (
              <CampaignBar
                key={campaign.id}
                campaign={campaign}
                weekStart={weekStart}
                onClick={(id) => onCampaignClick?.(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Week Grid - Responsive */}
      <div 
        ref={scrollContainerRef}
        className={cn(
          "flex-1 min-h-0 overflow-hidden",
          // Desktop: full grid
          "lg:grid lg:grid-cols-7",
          // Tablet/Mobile: horizontal scroll with snap
          "max-lg:overflow-x-auto max-lg:flex max-lg:snap-x max-lg:snap-mandatory",
          // Hide scrollbar on mobile for cleaner look
          "max-lg:scrollbar-thin max-lg:scrollbar-thumb-border"
        )}
      >
        {weekDays.map((date, index) => (
          <div
            key={format(date, 'yyyy-MM-dd')}
            className={cn(
              // Desktop: normal column
              "lg:min-w-0",
              // Tablet: 5 columns visible (20% each)
              "max-lg:min-w-[calc(100%/5)] max-lg:shrink-0 max-lg:snap-start",
              // Mobile: 3 columns visible (33.33% each)
              "max-md:min-w-[calc(100%/3)]",
              // Ensure proper height
              "h-full"
            )}
          >
            <CalendarDayColumn
              date={date}
              createItems={filterByPlatform(getItemsForDay(date, 'create'))}
              publishItems={filterByPlatform(getItemsForDay(date, 'publish'))}
              onItemClick={onItemClick}
              view={view}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
