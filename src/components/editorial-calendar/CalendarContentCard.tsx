import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CalendarItem, getContentTypeIcon, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { 
  FileText, Mail, Linkedin, Twitter, Newspaper, Youtube, Instagram, 
  Video, Radio, UserCheck, PlayCircle, Podcast, Mic, Headphones, 
  Presentation, Users, Trophy, GraduationCap, FileBarChart, FileDown, 
  BookOpen, CheckSquare, BarChart, Images, Quote, Facebook 
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Icon mapping - explicit instead of dynamic import
const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Mail, Linkedin, Twitter, Newspaper, Youtube, Instagram,
  Video, Radio, UserCheck, PlayCircle, Podcast, Mic, Headphones,
  Presentation, Users, Trophy, GraduationCap, FileBarChart, FileDown,
  BookOpen, CheckSquare, BarChart, Images, Quote, Facebook,
};

interface CalendarContentCardProps {
  item: CalendarItem;
  laneContext: 'create' | 'publish' | 'pool'; // Lane-specific context for unique DnD IDs
  onClick?: () => void;
  isDragging?: boolean;
  compact?: boolean;
}

export function CalendarContentCard({ 
  item, 
  laneContext,
  onClick, 
  isDragging = false,
  compact = false,
}: CalendarContentCardProps) {
  const { getPlatformColor } = useUserPlatforms();
  
  // Use lane-specific draggable ID to avoid collisions when same item appears in multiple lanes
  const { attributes, listeners, setNodeRef, transform, isDragging: isLocalDragging } = useDraggable({
    id: `${item.id}:${laneContext}`,
    data: { item }, // Keep base item in data for drop handler
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Get the icon component
  const iconName = getContentTypeIcon(item.type);
  const IconComponent = ICON_MAP[iconName] || FileText;
  
  // Get platform color
  const platformColor = getPlatformColor(item.channel || '');
  const platformLabel = getPlatformShortLabel(item.channel);

  const isActive = isDragging || isLocalDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 p-2 bg-card rounded-md border cursor-grab active:cursor-grabbing",
        "hover:shadow-sm transition-all",
        isActive && "opacity-50 shadow-lg z-50",
        compact ? "py-1.5 px-2" : "py-2 px-3"
      )}
    >
      {/* Content Type Icon */}
      <IconComponent className={cn(
        "shrink-0 text-muted-foreground",
        compact ? "h-3.5 w-3.5" : "h-4 w-4"
      )} />
      
      {/* Title */}
      <span className={cn(
        "flex-1 truncate font-medium",
        compact ? "text-xs" : "text-sm"
      )}>
        {item.title}
      </span>
      
      {/* Platform Badge */}
      {item.channel && (
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 font-medium border-0",
            compact ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5"
          )}
          style={{
            backgroundColor: `${platformColor}20`,
            color: platformColor,
          }}
        >
          {platformLabel}
        </Badge>
      )}

      {/* Status indicator */}
      {item.status === 'published' && (
        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Published" />
      )}
      {item.status === 'completed' && (
        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Completed" />
      )}
    </div>
  );
}

// Dragging overlay version
export function CalendarContentCardOverlay({ item }: { item: CalendarItem }) {
  const { getPlatformColor } = useUserPlatforms();
  
  const iconName = getContentTypeIcon(item.type);
  const IconComponent = ICON_MAP[iconName] || FileText;
  const platformColor = getPlatformColor(item.channel || '');
  const platformLabel = getPlatformShortLabel(item.channel);

  return (
    <div className="flex items-center gap-2 p-2 bg-card rounded-md border shadow-lg cursor-grabbing">
      <IconComponent className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
      {item.channel && (
        <Badge
          variant="outline"
          className="shrink-0 text-xs font-medium border-0 px-1.5 py-0.5"
          style={{
            backgroundColor: `${platformColor}20`,
            color: platformColor,
          }}
        >
          {platformLabel}
        </Badge>
      )}
    </div>
  );
}
