import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem, getContentTypeIcon, getPlatformShortLabel } from '@/lib/calendarConstants';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { useCalendarDensity } from '@/hooks/useCalendarDensity';
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
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20';
    case 'scheduled':
      return 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200/50 dark:border-violet-500/20';
    case 'draft':
      return 'bg-slate-50 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200/50 dark:border-slate-500/20';
    case 'in-progress':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200/50 dark:border-sky-500/20';
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

function getStatusDotClass(status?: string): string {
  switch (status) {
    case 'published':
    case 'completed':
      return 'bg-emerald-500';
    case 'scheduled':
      return 'bg-violet-500';
    case 'in-progress':
      return 'bg-sky-500';
    case 'draft':
    case 'Draft':
      return 'bg-slate-300 dark:bg-slate-600';
    default:
      return 'bg-slate-200 dark:bg-slate-700';
  }
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
  const isSpacious = density === 'spacious';
  
  const { attributes, listeners, setNodeRef, transform, isDragging: isLocalDragging } = useDraggable({
    id: `${item.id}:${laneContext}`,
    data: { item },
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const iconName = getContentTypeIcon(item.type);
  const IconComponent = ICON_MAP[iconName] || FileText;
  
  const platformColor = getPlatformColor(item.channel || '');
  const platformLabel = getPlatformShortLabel(item.channel);

  const isActive = isDragging || isLocalDragging;
  
  const StatusIcon = item.status ? getStatusIcon(item.status) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-lg cursor-pointer transition-all duration-200",
        "bg-card border border-border/60",
        "hover:shadow-md hover:-translate-y-0.5 hover:border-border",
        "active:scale-[0.98] active:shadow-sm",
        // Density-based padding
        isCompact && "py-1.5 px-2 gap-0",
        density === 'comfortable' && "py-2.5 px-3 gap-1 shadow-sm",
        isSpacious && "py-3.5 px-4 gap-2 shadow-sm",
        // Touch-friendly minimum height
        isCompact ? "min-h-[34px]" : isSpacious ? "min-h-[60px]" : "min-h-[44px]",
        isActive && "opacity-40 shadow-lg z-50 rotate-1"
      )}
    >
      {/* Platform color accent - top bar instead of left border for cleaner look */}
      <div 
        className="absolute top-0 left-2 right-2 h-[2px] rounded-b-full opacity-80"
        style={{ backgroundColor: platformColor }}
      />

      {/* Main content row */}
      <div className="flex items-center gap-2">
        {/* Status Dot */}
        <div 
          className={cn(
            "shrink-0 rounded-full ring-2 ring-card",
            isCompact ? "h-2 w-2" : "h-2.5 w-2.5",
            getStatusDotClass(item.status)
          )}
          title={item.status ? getStatusLabel(item.status) : 'No status'}
        />
        
        {/* Content Type Icon */}
        <div className={cn(
          "shrink-0 rounded-md flex items-center justify-center",
          isCompact ? "h-5 w-5" : isSpacious ? "h-7 w-7 bg-muted/60" : "h-6 w-6 bg-muted/40",
        )}>
          <IconComponent className={cn(
            "text-muted-foreground",
            isCompact ? "h-3 w-3" : isSpacious ? "h-4 w-4" : "h-3.5 w-3.5"
          )} />
        </div>
        
        {/* Title */}
        <span className={cn(
          "flex-1 font-medium text-foreground leading-snug",
          isCompact ? "text-[11px] line-clamp-1" : isSpacious ? "text-sm line-clamp-2" : "text-xs line-clamp-1"
        )}>
          {item.title}
        </span>
      </div>

      {/* Bottom row: platform + status badges */}
      {!isCompact && (
        <div className="flex items-center gap-1.5 ml-[18px]">
          {item.channel && (
            <span
              className={cn(
                "inline-flex items-center font-semibold rounded-full",
                isSpacious ? "text-[10px] px-2 py-0.5" : "text-[9px] px-1.5 py-px"
              )}
              style={{
                backgroundColor: `${platformColor}15`,
                color: platformColor,
              }}
            >
              {platformLabel}
            </span>
          )}

          {item.status && item.status !== 'draft' && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full border",
                getStatusBadgeClass(item.status),
                isSpacious ? "text-[10px] px-2 py-0.5" : "text-[9px] px-1.5 py-px"
              )}
            >
              {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
              {isSpacious && <span>{getStatusLabel(item.status)}</span>}
            </span>
          )}
        </div>
      )}

      {/* Spacious mode: Show dates */}
      {isSpacious && (item.creationDate || item.publishDate) && (
        <div className="flex items-center gap-3 ml-[18px] mt-0.5 text-[10px] text-muted-foreground">
          {item.creationDate && (
            <span className="flex items-center gap-1">
              <span className="text-teal-500 font-medium">Create</span>
              {format(new Date(item.creationDate), 'MMM d')}
            </span>
          )}
          {item.publishDate && (
            <span className="flex items-center gap-1">
              <span className="text-violet-500 font-medium">Publish</span>
              {format(new Date(item.publishDate), 'MMM d')}
            </span>
          )}
        </div>
      )}

      {/* Quick Actions - appears on hover */}
      <div className={cn(
        "absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
        "opacity-0 group-hover:opacity-100 transition-all duration-150",
        "bg-card/95 backdrop-blur-sm rounded-md px-0.5 shadow-sm border border-border/40"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
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
          className="h-6 w-6 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
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
      className="flex items-center gap-2.5 p-3 bg-card rounded-lg border border-border shadow-2xl cursor-grabbing rotate-2 scale-105"
    >
      <div 
        className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full"
        style={{ backgroundColor: platformColor }}
      />
      <div className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center">
        <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
      {item.channel && (
        <span
          className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${platformColor}15`,
            color: platformColor,
          }}
        >
          {platformLabel}
        </span>
      )}
    </div>
  );
}
