import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarItem, getContentTypeIcon, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { useCalendarDensity } from '@/hooks/useCalendarDensity';
import { Button } from '@/components/ui/button';
import { 
  FileText, Mail, Linkedin, Twitter, Newspaper, Youtube, Instagram, 
  Video, Radio, UserCheck, PlayCircle, Podcast, Mic, Headphones, 
  Presentation, Users, Trophy, GraduationCap, FileBarChart, FileDown, 
  BookOpen, CheckSquare, BarChart, Images, Quote, Facebook,
  Edit, MoreVertical, CheckCircle
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Mail, Linkedin, Twitter, Newspaper, Youtube, Instagram,
  Video, Radio, UserCheck, PlayCircle, Podcast, Mic, Headphones,
  Presentation, Users, Trophy, GraduationCap, FileBarChart, FileDown,
  BookOpen, CheckSquare, BarChart, Images, Quote, Facebook,
};

const FALLBACK_BORDER_COLOR = '#D1D5DB';

function getStatusDotColor(status?: string): string {
  switch (status) {
    case 'published':
    case 'completed':
      return 'bg-emerald-500';
    case 'scheduled':
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
  
  const isCompact = compactProp ?? density === 'compact';
  
  const { attributes, listeners, setNodeRef, transform, isDragging: isLocalDragging } = useDraggable({
    id: `${item.id}:${laneContext}`,
    data: { item },
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const iconName = getContentTypeIcon(item.type);
  const IconComponent = ICON_MAP[iconName] || FileText;
  const platformColor = getPlatformColor(item.channel || '') || FALLBACK_BORDER_COLOR;
  const platformLabel = getPlatformShortLabel(item.channel);
  const isActive = isDragging || isLocalDragging;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: `4px solid ${platformColor}`,
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-xl cursor-pointer",
        "bg-card shadow-sm",
        "hover:shadow-md hover:scale-[1.02]",
        "active:scale-[0.98]",
        "transition-all duration-150 ease-in-out",
        "min-h-[72px] py-2.5 px-3 gap-1.5",
        isActive && "opacity-40 shadow-lg z-50 rotate-1"
      )}
    >
      {/* Row 1: Icon + Title + Status dot */}
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5 h-5 w-5 rounded flex items-center justify-center bg-muted/50">
          <IconComponent className="h-3 w-3 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0 flex items-start gap-1.5">
          <span className="flex-1 font-medium text-foreground leading-snug text-[13px] line-clamp-2">
            {item.title}
          </span>

          {/* Status indicator */}
          {isPublished(item.status) ? (
            <CheckCircle className="shrink-0 mt-0.5 h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <div
              className={cn(
                "shrink-0 mt-1.5 h-2 w-2 rounded-full",
                getStatusDotColor(item.status)
              )}
            />
          )}
        </div>
      </div>

      {/* Row 2: Platform badge */}
      {item.channel && (
        <div className="ml-7">
          <span
            className="inline-flex items-center rounded-full text-[11px] font-semibold py-0.5 px-2"
            style={{
              backgroundColor: `${platformColor}33`,
              color: platformColor,
            }}
          >
            {platformLabel}
          </span>
        </div>
      )}

      {/* Quick Actions - hover */}
      <div className={cn(
        "absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
        "bg-card/95 backdrop-blur-sm rounded-lg px-0.5 shadow-sm border border-border/40"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-muted"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Dragging overlay version
export function CalendarContentCardOverlay({ item }: { item: CalendarItem }) {
  const { getPlatformColor } = useUserPlatforms();
  
  const iconName = getContentTypeIcon(item.type);
  const IconComponent = ICON_MAP[iconName] || FileText;
  const platformColor = getPlatformColor(item.channel || '') || FALLBACK_BORDER_COLOR;
  const platformLabel = getPlatformShortLabel(item.channel);

  return (
    <div 
      className="flex items-center gap-2.5 p-3 bg-card rounded-xl shadow-2xl cursor-grabbing rotate-2 scale-105 min-h-[72px]"
      style={{ borderLeft: `4px solid ${platformColor}` }}
    >
      <div className="h-6 w-6 rounded bg-muted/60 flex items-center justify-center">
        <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <span className="flex-1 truncate text-[13px] font-medium">{item.title}</span>
      {item.channel && (
        <span
          className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${platformColor}33`,
            color: platformColor,
          }}
        >
          {platformLabel}
        </span>
      )}
    </div>
  );
}
