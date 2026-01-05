import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Public Mastermind calendar ID
const MASTERMIND_CALENDAR_ID = '4dris5gs4pefjgtlejtq8d5gek@group.calendar.google.com';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: string;
  htmlLink?: string;
}

// Parse iCal date format (e.g., "20250109T190000Z" or "TZID=America/New_York:20250109T140000")
function parseICalDate(dateStr: string): Date {
  // Handle TZID format
  if (dateStr.includes('TZID=')) {
    const parts = dateStr.split(':');
    dateStr = parts[1];
  }
  
  // Remove any trailing Z and parse
  dateStr = dateStr.replace('Z', '');
  
  // Format: YYYYMMDDTHHMMSS
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(9, 11)) || 0;
  const minute = parseInt(dateStr.substring(11, 13)) || 0;
  const second = parseInt(dateStr.substring(13, 15)) || 0;
  
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

// Parse iCal format to extract events
function parseICalEvents(icalData: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icalData.split(/\r?\n/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  let currentKey = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle line continuation (lines starting with space or tab)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].substring(1);
    }
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = { id: '' };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.id && currentEvent.summary && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as CalendarEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const keyPart = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        // Extract base key (before any parameters like ;TZID=...)
        const baseKey = keyPart.split(';')[0];
        
        switch (baseKey) {
          case 'UID':
            currentEvent.id = value;
            break;
          case 'SUMMARY':
            currentEvent.summary = value.replace(/\\,/g, ',').replace(/\\n/g, '\n');
            break;
          case 'DESCRIPTION':
            currentEvent.description = value.replace(/\\,/g, ',').replace(/\\n/g, '\n');
            break;
          case 'LOCATION':
            currentEvent.location = value.replace(/\\,/g, ',');
            break;
          case 'DTSTART':
            const startDate = parseICalDate(keyPart.includes('TZID=') ? `${keyPart.split('TZID=')[1]}:${value}` : value);
            currentEvent.start = { dateTime: startDate.toISOString() };
            break;
          case 'DTEND':
            const endDate = parseICalDate(keyPart.includes('TZID=') ? `${keyPart.split('TZID=')[1]}:${value}` : value);
            currentEvent.end = { dateTime: endDate.toISOString() };
            break;
        }
      }
    }
  }
  
  return events;
}

serve(async (req) => {
  console.log('EDGE FUNC: get-mastermind-events called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Build iCal URL for the public calendar
    const encodedCalendarId = encodeURIComponent(MASTERMIND_CALENDAR_ID);
    const icalUrl = `https://calendar.google.com/calendar/ical/${encodedCalendarId}/public/basic.ics`;
    
    console.log('Fetching iCal from:', icalUrl);
    
    const response = await fetch(icalUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch calendar:', response.status, response.statusText);
      return new Response(JSON.stringify({ 
        events: [],
        error: 'Failed to fetch calendar' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const icalData = await response.text();
    console.log('Received iCal data length:', icalData.length);
    
    // Parse iCal data
    const allEvents = parseICalEvents(icalData);
    console.log('Parsed events count:', allEvents.length);
    
    // Filter for future events only (or currently happening)
    const now = new Date();
    const futureEvents = allEvents.filter(event => {
      const endTime = new Date(event.end.dateTime);
      return endTime >= now;
    });
    
    // Sort by start time
    futureEvents.sort((a, b) => 
      new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
    );
    
    console.log('Future events count:', futureEvents.length);
    
    return new Response(JSON.stringify({ events: futureEvents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in get-mastermind-events:', error);
    return new Response(JSON.stringify({ 
      events: [],
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
