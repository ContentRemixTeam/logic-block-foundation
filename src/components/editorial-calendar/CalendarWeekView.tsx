import { useMemo } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarDayColumn } from './CalendarDayColumn';
import { CalendarItem } from '@/lib/calendarConstants';
import { CampaignBar, Campaign } from './CampaignBar';

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

      {/* Week Grid */}
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
    </div>
  );
}
