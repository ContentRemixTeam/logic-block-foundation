import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { MASTERMIND_LINKS } from '@/lib/mastermindLinks';
import { Video, MapPin, ExternalLink, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  colorId?: string;
}

interface CalendarEventBlockProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
}

export function CalendarEventBlock({ event, compact = false, onClick }: CalendarEventBlockProps) {
  const startTime = event.start.dateTime ? parseISO(event.start.dateTime) : null;
  const endTime = event.end.dateTime ? parseISO(event.end.dateTime) : null;
  const isAllDay = !event.start.dateTime && event.start.date;
  
  // Determine if this is a mastermind/special event
  const isMastermindEvent = 
    event.summary?.toLowerCase().includes('mastermind') || 
    event.organizer?.email?.includes('mastermind') ||
    event.summary?.toLowerCase().includes('coaching') ||
    event.summary?.toLowerCase().includes('hot seat');

  // Check if this is a coworking event - use GoBrunch link instead
  const isCoworkingEvent = event.summary?.toLowerCase().includes('coworking');
  const gobrunchLink = MASTERMIND_LINKS.COWORKING_ROOM;

  const hasVideoCall = isCoworkingEvent || event.hangoutLink || event.conferenceData?.entryPoints?.some(
    ep => ep.entryPointType === 'video'
  );

  const videoLink = isCoworkingEvent 
    ? gobrunchLink 
    : (event.hangoutLink || event.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      )?.uri);

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoLink) {
      window.open(videoLink, '_blank');
    }
  };

  const handleOpenInCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.htmlLink) {
      window.open(event.htmlLink, '_blank');
    }
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "calendar-event-block rounded-md px-2 py-1.5 cursor-pointer transition-all text-xs",
          "border-l-2 hover:shadow-md",
          isMastermindEvent 
            ? "border-l-status-waiting bg-status-waiting/10 dark:bg-status-waiting/20" 
            : "border-l-info bg-info/10 dark:bg-info/20"
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">
            {startTime ? format(startTime, 'h:mm a') : 'All day'}
          </span>
          <span className="font-medium truncate flex-1">{event.summary}</span>
          {hasVideoCall && <Video className="h-3 w-3 text-success" />}
          <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "calendar-event-block rounded-lg p-3 cursor-pointer transition-all relative",
        "border-l-4 shadow-sm hover:shadow-md",
        isMastermindEvent 
          ? "border-l-status-waiting bg-status-waiting/10 dark:bg-status-waiting/20" 
          : "border-l-info bg-info/10 dark:bg-info/20"
      )}
    >
      {/* Read-only indicator */}
      <Lock className="absolute top-2 right-2 h-3 w-3 text-muted-foreground/40" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">
          {isMastermindEvent ? '🎓' : '📅'}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {isAllDay ? (
            'All Day'
          ) : startTime && endTime ? (
            `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
          ) : (
            'Time TBD'
          )}
        </span>
        {hasVideoCall && (
          <Button
            size="sm"
            variant="default"
            className="ml-auto h-6 px-2 text-xs bg-success hover:bg-success/90"
            onClick={handleJoinClick}
          >
            <Video className="h-3 w-3 mr-1" />
            Join
          </Button>
        )}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-foreground mb-1">{event.summary}</h4>

      {/* Location */}
      {event.location && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {/* Description preview */}
      {event.description && !compact && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {event.description.replace(/<[^>]*>/g, '').substring(0, 100)}
          {event.description.length > 100 && '...'}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {isMastermindEvent ? 'Mastermind' : 'Calendar'}
          </Badge>
          {event.attendees && event.attendees.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.attendees.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-1.5 text-xs"
          onClick={handleOpenInCalendar}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
