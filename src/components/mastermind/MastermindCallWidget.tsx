import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CountdownTimer } from './CountdownTimer';
import { format } from 'date-fns';
import { ExternalLink, Calendar, Clock, Users } from 'lucide-react';

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

const isMastermindEvent = (event: CalendarEvent): boolean => {
  const summary = event.summary?.toLowerCase() || '';
  return (
    summary.includes('mastermind') ||
    summary.includes('hot seat') ||
    summary.includes('q&a') ||
    summary.includes('coaching') ||
    summary.includes('group call')
  );
};

// Default GHL Events URL - user can customize this
const DEFAULT_GHL_URL = 'https://www.skool.com/the-90-day-focus-planner-3426';

export const MastermindCallWidget = () => {
  const { user } = useAuth();
  const [nextCall, setNextCall] = useState<CalendarEvent | null>(null);
  const [upcomingCalls, setUpcomingCalls] = useState<CalendarEvent[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>('NO_CALLS');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const fetchMastermindCalls = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date();
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(now.getDate() + 14);

      const response = await supabase.functions.invoke('get-calendar-events', {
        body: {
          startDate: now.toISOString(),
          endDate: twoWeeksLater.toISOString(),
        },
      });

      if (response.error) {
        console.error('Error fetching calendar events:', response.error);
        setIsConnected(false);
        return;
      }

      const events: CalendarEvent[] = response.data?.events || [];
      setIsConnected(true);
      
      // Filter for Mastermind events
      const mastermindCalls = events.filter(isMastermindEvent);
      
      // Sort by start time and filter out ended calls
      const sortedCalls = mastermindCalls
        .filter((event) => getCallStatus(event) !== 'ENDED')
        .sort((a, b) => {
          const aTime = new Date(a.start.dateTime || a.start.date || '').getTime();
          const bTime = new Date(b.start.dateTime || b.start.date || '').getTime();
          return aTime - bTime;
        });

      if (sortedCalls.length > 0) {
        const next = sortedCalls[0];
        setNextCall(next);
        setCallStatus(getCallStatus(next));
        setUpcomingCalls(sortedCalls.slice(1, 4));
      } else {
        setNextCall(null);
        setCallStatus('NO_CALLS');
        setUpcomingCalls([]);
      }
    } catch (error) {
      console.error('Error in fetchMastermindCalls:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMastermindCalls();
    
    // Refresh every minute
    const interval = setInterval(fetchMastermindCalls, 60000);
    return () => clearInterval(interval);
  }, [fetchMastermindCalls]);

  // Update status every minute for live detection
  useEffect(() => {
    if (!nextCall) return;
    
    const statusInterval = setInterval(() => {
      setCallStatus(getCallStatus(nextCall));
    }, 10000); // Check every 10 seconds for more responsive UI
    
    return () => clearInterval(statusInterval);
  }, [nextCall]);

  const openGHLEvents = () => {
    window.open(DEFAULT_GHL_URL, '_blank');
  };

  const addToCalendar = (event: CalendarEvent) => {
    if (event.htmlLink) {
      window.open(event.htmlLink, '_blank');
    }
  };

  if (loading) {
    return (
      <Card className="mastermind-widget">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="mastermind-widget border-2 border-dashed border-muted">
        <CardContent className="py-8 text-center">
          <div className="text-4xl mb-4">🎓</div>
          <h3 className="font-semibold text-lg mb-2">Connect Google Calendar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your calendar to see upcoming Mastermind calls
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (callStatus === 'NO_CALLS' || !nextCall) {
    return (
      <Card className="mastermind-widget">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="mastermind-icon text-2xl bg-gradient-to-br from-purple-500 to-purple-600 w-12 h-12 flex items-center justify-center rounded-xl shadow-lg">
              🎓
            </div>
            <CardTitle className="text-lg">Mastermind Calls</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            No upcoming Mastermind calls found in your calendar
          </p>
          <Button variant="outline" className="w-full" onClick={openGHLEvents}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Community Events
          </Button>
        </CardContent>
      </Card>
    );
  }

  const startTime = new Date(nextCall.start.dateTime || nextCall.start.date || '');
  const formattedDate = format(startTime, 'EEEE, MMM d');
  const formattedTime = format(startTime, 'h:mm a');

  // LIVE NOW State
  if (callStatus === 'LIVE') {
    return (
      <Card className="mastermind-widget-live border-2 border-red-500 bg-gradient-to-br from-red-50 to-white">
        <CardContent className="py-6">
          <div className="live-indicator flex items-center justify-center gap-2 bg-red-500 text-white py-3 px-6 rounded-lg mb-4 font-bold text-lg uppercase tracking-wide">
            <span className="pulse-dot w-3 h-3 bg-white rounded-full animate-pulse" />
            LIVE NOW
          </div>
          
          <h3 className="text-xl font-bold text-center mb-2">{nextCall.summary}</h3>
          <p className="text-center text-muted-foreground mb-6">
            Started at {formattedTime} • In Progress
          </p>
          
          <Button 
            className="w-full btn-join-live bg-red-500 hover:bg-red-600 text-white font-bold py-4 text-lg"
            onClick={openGHLEvents}
          >
            🎥 Join Call Now
          </Button>
          
          <p className="text-center text-sm text-muted-foreground mt-4 italic">
            You can still join! The call is in progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  // STARTING SOON State
  if (callStatus === 'STARTING_SOON') {
    return (
      <Card className="mastermind-widget-soon border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white">
        <CardContent className="py-6">
          <div className="alert-banner bg-amber-400 text-amber-900 py-3 px-4 rounded-lg mb-4 font-semibold text-center animate-pulse">
            ⏰ Call starts soon!
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="mastermind-icon text-2xl bg-gradient-to-br from-purple-500 to-purple-600 w-12 h-12 flex items-center justify-center rounded-xl shadow-lg">
              🎓
            </div>
            <div>
              <h3 className="text-sm text-muted-foreground">Next Mastermind Call</h3>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2">{nextCall.summary}</h3>
          <p className="text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {formattedDate} at {formattedTime}
          </p>
          
          <div className="countdown-container bg-purple-50 rounded-xl p-4 mb-4">
            <CountdownTimer targetDate={startTime} onComplete={fetchMastermindCalls} />
          </div>
          
          <div className="space-y-2">
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={openGHLEvents}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Call Details & Join Link
            </Button>
            <Button variant="outline" className="w-full" onClick={() => addToCalendar(nextCall)}>
              <Calendar className="h-4 w-4 mr-2" />
              Add to My Calendar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // UPCOMING State (default)
  return (
    <Card className="mastermind-widget border-2 border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="mastermind-icon text-2xl bg-gradient-to-br from-purple-500 to-purple-600 w-12 h-12 flex items-center justify-center rounded-xl shadow-lg">
            🎓
          </div>
          <div>
            <CardTitle className="text-lg">Next Mastermind Call</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="text-xl font-bold mb-2">{nextCall.summary}</h3>
        <p className="text-muted-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {formattedDate} at {formattedTime}
        </p>
        
        <div className="countdown-container bg-purple-50 rounded-xl p-4 mb-4">
          <CountdownTimer targetDate={startTime} onComplete={fetchMastermindCalls} />
        </div>
        
        <div className="space-y-2">
          <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={openGHLEvents}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Call Details & Join Link
          </Button>
          <Button variant="outline" className="w-full" onClick={() => addToCalendar(nextCall)}>
            <Calendar className="h-4 w-4 mr-2" />
            Add to My Calendar
          </Button>
        </div>

        {/* Upcoming Calls List */}
        {upcomingCalls.length > 0 && (
          <div className="mt-6 pt-4 border-t border-purple-100">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Upcoming Calls
            </h4>
            <div className="space-y-2">
              {upcomingCalls.map((call) => {
                const callStart = new Date(call.start.dateTime || call.start.date || '');
                return (
                  <div 
                    key={call.id} 
                    className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-lg"
                  >
                    <div className="text-lg">🎓</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{call.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(callStart, 'EEE, MMM d')} at {format(callStart, 'h:mm a')}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs"
                      onClick={() => addToCalendar(call)}
                    >
                      Remind
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <Button 
              variant="link" 
              className="w-full mt-2 text-purple-600"
              onClick={openGHLEvents}
            >
              View All Calls in Portal →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
