import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarItem, getContentTypeIcon, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { useCalendarDensity } from '@/hooks/useCalendarDensity';
import { CheckCircle } from 'lucide-react';

const FALLBACK_BORDER_COLOR = '#E5E7EB';

const PLATFORM_EMOJI: Record<string, string> = {
  email: '📧',
  instagram: '📷',
  linkedin: '💼',
  youtube: '▶',
  podcast: '🎙',
  blog: '✍',
  twitter: '𝕏',
  facebook: '📘',
  newsletter: '📧',
  tiktok: '🎵',
};

function getPlatformEmoji(channel?: string): string {
  if (!channel) return '📄';
  const lower = channel.toLowerCase();
  for (const [key, emoji] of Object.entries(PLATFORM_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '📄';
}

function getStatusDotColor(status?: string): string {
  switch (status) {
    case 'published':
    case 'completed':
      return 'bg-emerald-500';
    case 'scheduled':
    case 'ready':
      return 'bg-blue-500';
    case 'in-progress':
      return 'bg-amber-500';
    case 'draft':
    default:
      return 'bg-gray-400';
  }
}

function isPublished(status?: string): boolean {
  return status === 'published' || status === 'completed';
}

interface CalendarContentCardProps {
  item: CalendarItem;
  laneContext: 'create' | 'publish' | 'pool';
  onClick?: () => void;
  isDragging?: boolean;
  compact?: boolean;
}

export function CalendarContentCard({ 
  item, 
  laneContext,
  onClick, 
  isDragging = false,
  compact: compactProp,
}: CalendarContentCardProps) {
  const { getPlatformColor } = useUserPlatforms();
  const { density } = useCalendarDensity();
  
  const { attributes, listeners, setNodeRef, transform, isDragging: isLocalDragging } = useDraggable({
    id: `${item.id}:${laneContext}`,
    data: { item },
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const platformColor = getPlatformColor(item.channel || '') || FALLBACK_BORDER_COLOR;
  const platformLabel = getPlatformShortLabel(item.channel);
  const platformEmoji = getPlatformEmoji(item.channel);
  const isActive = isDragging || isLocalDragging;
  const published = isPublished(item.status);

  // Determine if we should show both date meta tags
  const hasBothDates = !!(item.creationDate && item.publishDate);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: `4px solid ${platformColor}`,
        boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col cursor-pointer",
        "bg-card",
        "rounded-[14px]",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,.10)] hover:-translate-y-0.5 hover:scale-[1.01]",
        "active:scale-[0.98]",
        "transition-all duration-150 ease-in-out",
        "min-h-[72px] pt-[10px] pb-[9px] px-3 gap-1.5",
        isActive && "opacity-40 shadow-lg z-50 rotate-1"
      )}
    >
      {/* Row 1: Platform badge + Status dot */}
      <div className="flex items-center gap-2">
        {item.channel && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full text-[10px] font-bold py-0.5 px-2"
            style={{
              backgroundColor: `${platformColor}1F`,
              color: platformColor,
            }}
          >
            <span className="text-[9px]">{platformEmoji}</span>
            {platformLabel}
          </span>
        )}

        {/* Status dot - pushed right */}
        <div className="ml-auto">
          {published ? (
            <CheckCircle className="h-[7px] w-[7px] text-emerald-500" style={{ width: 7, height: 7 }} />
          ) : (
            <div
              className={cn(
                "rounded-full",
                getStatusDotColor(item.status)
              )}
              style={{ width: 7, height: 7 }}
            />
          )}
        </div>
      </div>

      {/* Row 2: Title */}
      <span className={cn(
        "font-semibold leading-[1.4] text-[12.5px]",
        "line-clamp-2",
        published
          ? "line-through text-muted-foreground"
          : "text-foreground"
      )}>
        {item.title}
      </span>

      {/* Row 3: Date meta tags (only if BOTH dates exist) */}
      {hasBothDates && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="inline-flex items-center text-[10px] font-medium py-0.5 px-1.5 rounded bg-[#F0FDFA] text-[#0D9488]">
            ✏ {format(new Date(item.creationDate!), 'EEE d')}
          </span>
          <span className="inline-flex items-center text-[10px] font-medium py-0.5 px-1.5 rounded bg-[#F5F3FF] text-[#7C3AED]">
            🚀 {format(new Date(item.publishDate!), 'EEE d')}
          </span>
        </div>
      )}
    </div>
  );
}

// Dragging overlay version
export function CalendarContentCardOverlay({ item }: { item: CalendarItem }) {
  const { getPlatformColor } = useUserPlatforms();
  
  const platformColor = getPlatformColor(item.channel || '') || FALLBACK_BORDER_COLOR;
  const platformLabel = getPlatformShortLabel(item.channel);
  const platformEmoji = getPlatformEmoji(item.channel);

  return (
    <div 
      className="flex flex-col gap-1.5 pt-[10px] pb-[9px] px-3 bg-card rounded-[14px] cursor-grabbing rotate-2 scale-105 min-h-[72px]"
      style={{ 
        borderLeft: `4px solid ${platformColor}`,
        boxShadow: '0 8px 24px rgba(0,0,0,.15)',
      }}
    >
      <div className="flex items-center gap-2">
        {item.channel && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full text-[10px] font-bold py-0.5 px-2"
            style={{
              backgroundColor: `${platformColor}1F`,
              color: platformColor,
            }}
          >
            <span className="text-[9px]">{platformEmoji}</span>
            {platformLabel}
          </span>
        )}
      </div>
      <span className="text-[12.5px] font-semibold leading-[1.4] line-clamp-2">{item.title}</span>
    </div>
  );
}
