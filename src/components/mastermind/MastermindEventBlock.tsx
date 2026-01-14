import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { GraduationCap, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MastermindEventBlockProps {
  event: {
    id: string;
    summary: string;
    start: { dateTime: string };
    end: { dateTime: string };
  };
  compact?: boolean;
  showJoinButton?: boolean;
  onJoin?: () => void;
}

type CallStatus = 'LIVE' | 'STARTING_SOON' | 'UPCOMING';

const getCallStatus = (startTime: Date, endTime: Date): CallStatus => {
  const now = new Date();
  const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
  
  if (now >= startTime && now <= endTime) {
    return 'LIVE';
  } else if (now >= oneHourBefore && now < startTime) {
    return 'STARTING_SOON';
  } else {
    return 'UPCOMING';
  }
};

// Parse and clean event titles
const parseEventTitle = (summary: string): string => {
  let cleanTitle = summary;
  cleanTitle = cleanTitle.replace(/\s*(and|with)\s+Faith\s+Mariah\s*/gi, '');
  const dashMatch = cleanTitle.match(/^(.+?)\s+-\s+(.+)$/);
  if (dashMatch) {
    return dashMatch[1].replace(/^Member-led\s+/i, '').trim() || 'Mastermind Call';
  }
  return cleanTitle.replace(/^Member-led\s+/i, '').trim() || 'Mastermind Call';
};

const CIRCLE_EVENTS_URL = 'https://portal.faithmariah.com/communities/groups/mastermind/events';

export function MastermindEventBlock({ 
  event, 
  compact = false,
  showJoinButton = true,
  onJoin
}: MastermindEventBlockProps) {
  const startTime = parseISO(event.start.dateTime);
  const endTime = parseISO(event.end.dateTime);
  const status = getCallStatus(startTime, endTime);
  const title = parseEventTitle(event.summary);

  const handleJoin = () => {
    if (onJoin) {
      onJoin();
    } else {
      window.open(CIRCLE_EVENTS_URL, '_blank');
    }
  };

  // Calculate duration for height (if needed)
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  const getDateLabel = () => {
    if (isToday(startTime)) return 'Today';
    if (isTomorrow(startTime)) return 'Tomorrow';
    return format(startTime, 'EEE, MMM d');
  };

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-md p-2 text-xs transition-all',
          status === 'LIVE' && 'bg-gradient-to-r from-red-500/20 to-primary/20 border border-red-400',
          status === 'STARTING_SOON' && 'bg-gradient-to-r from-amber-500/20 to-warning/20 border border-amber-400',
          status === 'UPCOMING' && 'bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <GraduationCap className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate font-medium">{title}</span>
            {status === 'LIVE' && (
              <span className="shrink-0 flex items-center gap-1 bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {status === 'STARTING_SOON' && (
              <span className="shrink-0 bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-medium">
                Soon
              </span>
            )}
          </div>
          {showJoinButton && (status === 'LIVE' || status === 'STARTING_SOON') && (
            <Button 
              size="sm" 
              variant={status === 'LIVE' ? 'destructive' : 'secondary'}
              className="h-5 px-2 text-[10px]"
              onClick={handleJoin}
            >
              Join
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          <span>{format(startTime, 'h:mm a')}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg p-3 transition-all',
        status === 'LIVE' && 'bg-gradient-to-r from-red-500/20 to-primary/20 border-2 border-red-400',
        status === 'STARTING_SOON' && 'bg-gradient-to-r from-amber-500/20 to-warning/20 border-2 border-amber-400',
        status === 'UPCOMING' && 'bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mastermind Call
            </span>
            {status === 'LIVE' && (
              <span className="flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {status === 'STARTING_SOON' && (
              <span className="bg-amber-400 text-amber-900 px-2 py-0.5 rounded text-xs font-medium">
                Starting Soon
              </span>
            )}
          </div>
          <h4 className="font-semibold truncate">{title}</h4>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{getDateLabel()} at {format(startTime, 'h:mm a')}</span>
          </div>
        </div>
        {showJoinButton && (
          <Button 
            size="sm" 
            variant={status === 'LIVE' ? 'destructive' : status === 'STARTING_SOON' ? 'default' : 'outline'}
            onClick={handleJoin}
          >
            {status === 'LIVE' ? 'Join Now' : status === 'STARTING_SOON' ? 'Join' : <ExternalLink className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
