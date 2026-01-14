import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CountdownTimer } from './CountdownTimer';
import { format } from 'date-fns';
import { ExternalLink, Clock, GraduationCap } from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  hangoutLink?: string;
  htmlLink?: string;
  attendees?: Array<{ email: string }>;
}

type CallStatus = 'LIVE' | 'STARTING_SOON' | 'UPCOMING' | 'ENDED' | 'NO_CALLS';

const getCallStatus = (event: CalendarEvent): CallStatus => {
  const now = new Date();
  const startTime = new Date(event.start.dateTime || event.start.date || '');
  const endTime = new Date(event.end.dateTime || event.end.date || '');
  const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
  
  if (now >= startTime && now <= endTime) {
    return 'LIVE';
  } else if (now >= oneHourBefore && now < startTime) {
    return 'STARTING_SOON';
  } else if (now < startTime) {
    return 'UPCOMING';
  } else {
    return 'ENDED';
  }
};

// Parse and clean event titles from booking tools
const parseEventTitle = (summary: string): { mainTitle: string; subtitle: string | null } => {
  let cleanTitle = summary;
  
  // Remove "and Faith Mariah" or "with Faith Mariah" suffix (case insensitive)
  cleanTitle = cleanTitle.replace(/\s*(and|with)\s+Faith\s+Mariah\s*/gi, '');
  
  // Try to extract "Type - Name" pattern (must have spaces around dash to avoid matching "Member-led")
  const dashMatch = cleanTitle.match(/^(.+?)\s+-\s+(.+)$/);
  if (dashMatch) {
    const mainTitle = dashMatch[1].replace(/^Member-led\s+/i, '').trim();
    const participant = dashMatch[2].trim();
    return { 
      mainTitle: mainTitle || 'Mastermind Call',
      subtitle: participant ? `with ${participant}` : null 
    };
  }
  
  // Clean up "Member-led" prefix if no dash pattern
  cleanTitle = cleanTitle.replace(/^Member-led\s+/i, '').trim();
  
  return { mainTitle: cleanTitle || 'Mastermind Call', subtitle: null };
};

// Circle community events page URL
const CIRCLE_EVENTS_URL = 'https://portal.faithmariah.com/communities/groups/mastermind/events';

export const MastermindCallWidget = () => {
  const [nextCall, setNextCall] = useState<CalendarEvent | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('NO_CALLS');
  const [loading, setLoading] = useState(true);

  const fetchMastermindCalls = useCallback(async () => {
    try {
      const response = await supabase.functions.invoke('get-mastermind-events');

      if (response.error) {
        console.error('Error fetching mastermind events:', response.error);
        setLoading(false);
        return;
      }

      const events: CalendarEvent[] = response.data?.events || [];
      
      if (events.length > 0) {
        const next = events[0];
        setNextCall(next);
        setCallStatus(getCallStatus(next));
      } else {
        setNextCall(null);
        setCallStatus('NO_CALLS');
      }
    } catch (error) {
      console.error('Error in fetchMastermindCalls:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMastermindCalls();
    const interval = setInterval(fetchMastermindCalls, 60000);
    return () => clearInterval(interval);
  }, [fetchMastermindCalls]);

  useEffect(() => {
    if (!nextCall) return;
    const statusInterval = setInterval(() => {
      setCallStatus(getCallStatus(nextCall));
    }, 10000);
    return () => clearInterval(statusInterval);
  }, [nextCall]);

  const openCircleEvents = () => {
    window.open(CIRCLE_EVENTS_URL, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (callStatus === 'NO_CALLS' || !nextCall) {
    return (
      <Card className="rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] border-0">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-foreground-muted" />
              </div>
              <span className="text-sm text-foreground-muted">No upcoming calls</span>
            </div>
            <Button variant="ghost" size="sm" onClick={openCircleEvents}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const startTime = new Date(nextCall.start.dateTime || nextCall.start.date || '');
  const formattedDate = format(startTime, 'EEE, MMM d');
  const formattedTime = format(startTime, 'h:mm a');
  const { mainTitle, subtitle } = parseEventTitle(nextCall.summary);

  // LIVE NOW State
  if (callStatus === 'LIVE') {
    return (
      <Card className="rounded-[20px] border-2 border-red-500 bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold uppercase">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">Next Mastermind Call</p>
                <p className="font-semibold text-sm">{mainTitle}</p>
                {subtitle && <p className="text-xs text-foreground-muted">{subtitle}</p>}
              </div>
            </div>
            <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={openCircleEvents}>
              Join Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // STARTING SOON State
  if (callStatus === 'STARTING_SOON') {
    return (
      <Card className="rounded-[20px] border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">Next Mastermind Call</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{mainTitle}</p>
                  <span className="text-xs bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </div>
                {subtitle && <p className="text-xs text-foreground-muted">{subtitle}</p>}
                <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {formattedTime}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <CountdownTimer targetDate={startTime} onComplete={fetchMastermindCalls} compact />
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={openCircleEvents}>
                Join
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // UPCOMING State (default)
  return (
    <Card className="rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] border-0">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">Next Mastermind Call</p>
              <p className="font-semibold text-sm">{mainTitle}</p>
              {subtitle && <p className="text-xs text-foreground-muted">{subtitle}</p>}
              <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {formattedDate} at {formattedTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <CountdownTimer targetDate={startTime} onComplete={fetchMastermindCalls} compact />
            </div>
            <Button size="sm" variant="outline" onClick={openCircleEvents}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
