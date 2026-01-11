import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Plus, Check, Calendar, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

interface RSVP {
  id: string;
  event_id: string;
  event_summary: string;
  event_start: string;
  event_end: string;
}

interface MastermindCallsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeekStart?: Date;
}

const CIRCLE_EVENTS_URL = 'https://portal.faithmariah.com/communities/groups/mastermind/events';

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

export function MastermindCallsPanel({ 
  open, 
  onOpenChange,
  currentWeekStart = new Date()
}: MastermindCallsPanelProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingEvent, setAddingEvent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-schedule'>('upcoming');

  const rsvpEventIds = new Set(rsvps.map(r => r.event_id));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch mastermind events
      const eventsRes = await supabase.functions.invoke('get-mastermind-events');
      if (eventsRes.data?.events) {
        setEvents(eventsRes.data.events);
      }

      // Fetch user's RSVPs
      const rsvpsRes = await supabase.functions.invoke('manage-mastermind-rsvp', {
        body: { action: 'list' }
      });
      if (rsvpsRes.data?.rsvps) {
        setRsvps(rsvpsRes.data.rsvps);
      }
    } catch (error) {
      console.error('Error fetching mastermind data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const handleAddToSchedule = async (event: CalendarEvent) => {
    setAddingEvent(event.id);
    try {
      const { error } = await supabase.functions.invoke('manage-mastermind-rsvp', {
        body: {
          action: 'add',
          event_id: event.id,
          event_summary: event.summary,
          event_start: event.start.dateTime,
          event_end: event.end.dateTime,
        }
      });

      if (error) throw error;

      // Add to local state
      setRsvps(prev => [...prev, {
        id: crypto.randomUUID(),
        event_id: event.id,
        event_summary: event.summary,
        event_start: event.start.dateTime,
        event_end: event.end.dateTime,
      }]);

      toast({
        title: '📅 Added to your schedule!',
        description: parseEventTitle(event.summary),
      });
    } catch (error) {
      console.error('Error adding RSVP:', error);
      toast({
        title: 'Failed to add to schedule',
        variant: 'destructive',
      });
    } finally {
      setAddingEvent(null);
    }
  };

  const handleRemoveFromSchedule = async (eventId: string) => {
    setAddingEvent(eventId);
    try {
      const { error } = await supabase.functions.invoke('manage-mastermind-rsvp', {
        body: {
          action: 'remove',
          event_id: eventId,
        }
      });

      if (error) throw error;

      setRsvps(prev => prev.filter(r => r.event_id !== eventId));

      toast({
        title: 'Removed from schedule',
      });
    } catch (error) {
      console.error('Error removing RSVP:', error);
      toast({
        title: 'Failed to remove from schedule',
        variant: 'destructive',
      });
    } finally {
      setAddingEvent(null);
    }
  };

  const thisWeekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const thisWeekEvents = events.filter(e => {
    const eventDate = parseISO(e.start.dateTime);
    return eventDate >= thisWeekStart && eventDate <= thisWeekEnd;
  });

  const futureEvents = events.filter(e => {
    const eventDate = parseISO(e.start.dateTime);
    return eventDate > thisWeekEnd;
  });

  const renderEventCard = (event: CalendarEvent, isRsvpd: boolean) => {
    const startTime = parseISO(event.start.dateTime);
    const title = parseEventTitle(event.summary);
    const isAdding = addingEvent === event.id;

    return (
      <div 
        key={event.id}
        className={cn(
          'p-3 rounded-lg border transition-all',
          isRsvpd 
            ? 'bg-primary/5 border-primary/30' 
            : 'bg-card hover:bg-muted/50'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-pink-500 shrink-0" />
              <span className="font-medium truncate">{title}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(startTime, 'EEE, MMM d')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(startTime, 'h:mm a')}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant={isRsvpd ? 'outline' : 'default'}
            disabled={isAdding}
            onClick={() => isRsvpd ? handleRemoveFromSchedule(event.id) : handleAddToSchedule(event)}
            className={cn(
              'shrink-0',
              !isRsvpd && 'bg-[hsl(330,81%,54%)] hover:bg-[hsl(330,81%,48%)]'
            )}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRsvpd ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-pink-500" />
            Mastermind Calls
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'my-schedule')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">All Upcoming</TabsTrigger>
            <TabsTrigger value="my-schedule">
              My Schedule
              {rsvps.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 w-5 p-0 justify-center">
                  {rsvps.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming calls scheduled</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => window.open(CIRCLE_EVENTS_URL, '_blank')}
                  >
                    View community events <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* This Week */}
                  {thisWeekEvents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        This Week
                        <Badge variant="outline">{thisWeekEvents.length}</Badge>
                      </h3>
                      <div className="space-y-2">
                        {thisWeekEvents.map(e => renderEventCard(e, rsvpEventIds.has(e.id)))}
                      </div>
                    </div>
                  )}

                  {/* Future */}
                  {futureEvents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        Coming Up
                        <Badge variant="outline">{futureEvents.length}</Badge>
                      </h3>
                      <div className="space-y-2">
                        {futureEvents.map(e => renderEventCard(e, rsvpEventIds.has(e.id)))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="my-schedule" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : rsvps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No calls added to your schedule</p>
                  <p className="text-sm mt-1">Add calls from the "All Upcoming" tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rsvps.map(rsvp => {
                    const event = events.find(e => e.id === rsvp.event_id);
                    if (event) {
                      return renderEventCard(event, true);
                    }
                    // Fallback for RSVPs where the event might not be in the list anymore
                    const startTime = parseISO(rsvp.event_start);
                    return (
                      <div key={rsvp.id} className="p-3 rounded-lg border bg-primary/5 border-primary/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <GraduationCap className="h-4 w-4 text-pink-500 shrink-0" />
                              <span className="font-medium truncate">{parseEventTitle(rsvp.event_summary)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(startTime, 'EEE, MMM d')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(startTime, 'h:mm a')}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={addingEvent === rsvp.event_id}
                            onClick={() => handleRemoveFromSchedule(rsvp.event_id)}
                          >
                            {addingEvent === rsvp.event_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Added
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
