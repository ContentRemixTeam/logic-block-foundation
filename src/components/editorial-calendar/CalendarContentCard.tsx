import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem, getContentTypeIcon, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { 
  FileText, Mail, Linkedin, Twitter, Newspaper, Youtube, Instagram, 
  Video, Radio, UserCheck, PlayCircle, Podcast, Mic, Headphones, 
  Presentation, Users, Trophy, GraduationCap, FileBarChart, FileDown, 
  BookOpen, CheckSquare, BarChart, Images, Quote, Facebook,
  Edit, MoreVertical, CheckCircle, Clock, Zap
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Icon mapping - explicit instead of dynamic import
const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Mail, Linkedin, Twitter, Newspaper, Youtube, Instagram,
  Video, Radio, UserCheck, PlayCircle, Podcast, Mic, Headphones,
  Presentation, Users, Trophy, GraduationCap, FileBarChart, FileDown,
  BookOpen, CheckSquare, BarChart, Images, Quote, Facebook,
};

// Status helper functions
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'published':
    case 'completed':
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case 'scheduled':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
    case 'draft':
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    case 'in-progress':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getStatusIcon(status: string): LucideIcon | null {
  switch (status) {
    case 'published':
    case 'completed':
      return CheckCircle;
    case 'scheduled':
      return Clock;
    case 'in-progress':
      return Zap;
    case 'draft':
      return Edit;
    default:
      return null;
  }
}

function getStatusBorderClass(status?: string): string {
  switch (status) {
    case 'published':
    case 'completed':
      return 'border-green-200 dark:border-green-900';
    case 'scheduled':
      return 'border-purple-200 dark:border-purple-900';
    case 'draft':
      return 'border-gray-200 dark:border-gray-800';
    case 'in-progress':
      return 'border-blue-200 dark:border-blue-900';
    default:
      return 'border-border';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'published': return 'Published';
    case 'completed': return 'Done';
    case 'scheduled': return 'Scheduled';
    case 'draft': return 'Draft';
    case 'in-progress': return 'In Progress';
    default: return status;
  }
}

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
  
  // Status icon
  const StatusIcon = item.status ? getStatusIcon(item.status) : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftWidth: '3px',
        borderLeftColor: platformColor,
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 rounded-md border cursor-pointer transition-all duration-200",
        // Base state with elevation
        "bg-card shadow-sm",
        // Hover state - add elevation
        "hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5",
        // Active/dragging state
        "active:scale-[0.98]",
        // Compact vs normal spacing
        compact ? "py-2 px-2.5" : "py-3 px-3",
        // Status-based border
        getStatusBorderClass(item.status),
        // Dragging opacity
        isActive && "opacity-50 shadow-lg z-50"
      )}
    >
      {/* Content Type Icon */}
      <IconComponent className={cn(
        "shrink-0 text-muted-foreground",
        compact ? "h-3.5 w-3.5" : "h-4 w-4"
      )} />
      
      {/* Title */}
      <span className={cn(
        "flex-1 font-medium line-clamp-1",
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

      {/* Status Badge */}
      {item.status && item.status !== 'draft' && (
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 gap-1",
            getStatusBadgeClass(item.status),
            compact ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5"
          )}
        >
          {StatusIcon && <StatusIcon className="h-3 w-3" />}
          {!compact && <span>{getStatusLabel(item.status)}</span>}
        </Badge>
      )}

      {/* Quick Actions - appears on hover */}
      <div className={cn(
        "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
        "opacity-0 group-hover:opacity-100 transition-opacity",
        "bg-card/90 backdrop-blur-sm rounded px-0.5"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            // More actions menu - future enhancement
          }}
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
  const platformColor = getPlatformColor(item.channel || '');
  const platformLabel = getPlatformShortLabel(item.channel);

  return (
    <div 
      className="flex items-center gap-2 p-3 bg-card rounded-md border shadow-xl cursor-grabbing"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: platformColor,
      }}
    >
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
