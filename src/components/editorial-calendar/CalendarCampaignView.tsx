import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarItem, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { Campaign } from './CampaignBar';
import { Rocket, CheckCircle2, Inbox, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  items: CalendarItem[];
  unscheduledItems: CalendarItem[];
  campaigns: Campaign[];
  onItemClick?: (item: CalendarItem) => void;
  onCampaignClick?: (campaignId: string) => void;
  selectedPlatforms: string[];
}

const UNASSIGNED_KEY = '__unassigned__';

function detectCampaign(
  item: CalendarItem,
  campaigns: Campaign[]
): string {
  // Heuristic: match campaign name against item title
  const title = item.title?.toLowerCase() || '';
  for (const c of campaigns) {
    if (c.name && title.includes(c.name.toLowerCase())) {
      return c.id;
    }
  }
  // Fallback: if item has a publishDate and falls inside campaign window
  const date = item.publishDate || item.creationDate;
  if (date) {
    const d = parseISO(date);
    for (const c of campaigns) {
      if (c.cart_opens && c.cart_closes) {
        const start = parseISO(c.cart_opens);
        const end = parseISO(c.cart_closes);
        if (d >= start && d <= end) return c.id;
      }
    }
  }
  return UNASSIGNED_KEY;
}

export function CalendarCampaignView({
  items,
  unscheduledItems,
  campaigns,
  onItemClick,
  onCampaignClick,
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
    const map = new Map<string, CalendarItem[]>();
    map.set(UNASSIGNED_KEY, []);
    for (const c of campaigns) map.set(c.id, []);

    const seen = new Set<string>();
    const all = [...filterByPlatform(items), ...filterByPlatform(unscheduledItems)];
    for (const item of all) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const key = detectCampaign(item, campaigns);
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [items, unscheduledItems, campaigns, selectedPlatforms]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="max-w-5xl mx-auto px-5 py-5 space-y-5">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Rocket className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No campaigns yet.</p>
              <p className="text-xs mt-1">Create a launch or campaign to group content here.</p>
            </div>
          ) : (
            <>
              {campaigns.map(campaign => {
                const campaignItems = grouped.get(campaign.id) || [];
                return (
                  <CampaignSection
                    key={campaign.id}
                    campaign={campaign}
                    items={campaignItems}
                    onItemClick={onItemClick}
                    onCampaignClick={onCampaignClick}
                    getPlatformColor={getPlatformColor}
                  />
                );
              })}
              <UnassignedSection
                items={grouped.get(UNASSIGNED_KEY) || []}
                onItemClick={onItemClick}
                getPlatformColor={getPlatformColor}
              />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CampaignSection({
  campaign,
  items,
  onItemClick,
  onCampaignClick,
  getPlatformColor,
}: {
  campaign: Campaign;
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  onCampaignClick?: (id: string) => void;
  getPlatformColor: (channel: string) => string | undefined;
}) {
  const window = campaign.cart_opens && campaign.cart_closes
    ? `${format(parseISO(campaign.cart_opens), 'MMM d')} – ${format(parseISO(campaign.cart_closes), 'MMM d')}`
    : null;

  return (
    <section
      className="rounded-2xl bg-card border border-border/40 overflow-hidden"
      style={{ borderTop: `4px solid ${campaign.display_color}` }}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ backgroundColor: `${campaign.display_color}1F`, color: campaign.display_color }}
        >
          <Rocket className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={() => onCampaignClick?.(campaign.id)}
          className="flex-1 text-left hover:underline"
        >
          <p className="text-sm font-bold text-foreground">{campaign.name}</p>
          {window && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> {window}
            </p>
          )}
        </button>
        <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full">
          {items.length} {items.length === 1 ? 'piece' : 'pieces'}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground/70">
          <Inbox className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No content tied to this campaign yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              onItemClick={onItemClick}
              getPlatformColor={getPlatformColor}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function UnassignedSection({
  items,
  onItemClick,
  getPlatformColor,
}: {
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  getPlatformColor: (channel: string) => string | undefined;
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl bg-card border border-dashed border-border/40 overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/10">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground shrink-0">
          <Inbox className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">No campaign</p>
          <p className="text-[11px] text-muted-foreground">Standalone or evergreen content</p>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </header>
      <div className="divide-y divide-border/40">
        {items.map(item => (
          <ItemRow key={item.id} item={item} onItemClick={onItemClick} getPlatformColor={getPlatformColor} />
        ))}
      </div>
    </section>
  );
}

function ItemRow({
  item,
  onItemClick,
  getPlatformColor,
}: {
  item: CalendarItem;
  onItemClick?: (item: CalendarItem) => void;
  getPlatformColor: (channel: string) => string | undefined;
}) {
  const color = getPlatformColor(item.channel || '') || '#9CA3AF';
  const date = item.publishDate || item.creationDate;
  const published = item.status === 'published' || item.status === 'completed';
  return (
    <button
      type="button"
      onClick={() => onItemClick?.(item)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
    >
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
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
      {date && (
        <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums">
          {format(new Date(date), 'MMM d')}
        </span>
      )}
      {published && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
    </button>
  );
}
