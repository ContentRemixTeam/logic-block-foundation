import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decryptToken(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    const parts = decoded.split(':');
    return parts.slice(1).join(':');
  } catch {
    return encrypted;
  }
}

function encryptToken(token: string): string {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'default-key';
  const combined = `${key.substring(0, 10)}:${token}`;
  return btoa(combined);
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: connection, error } = await supabase
    .from('google_calendar_connection')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    return null;
  }

  const tokenExpiry = new Date(connection.token_expiry);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000;

  if (tokenExpiry.getTime() - now.getTime() > bufferTime) {
    return decryptToken(connection.access_token_encrypted);
  }

  const refreshToken = decryptToken(connection.refresh_token_encrypted);
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error('Token refresh failed:', data);
    return null;
  }

  const newExpiry = new Date(Date.now() + (data.expires_in * 1000));
  const serviceSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  await serviceSupabase
    .from('google_calendar_connection')
    .update({
      access_token_encrypted: encryptToken(data.access_token),
      token_expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return data.access_token;
}

interface CalendarToSync {
  calendar_id: string;
  calendar_name: string;
  color?: string;
}

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  syncToken: string | null
): Promise<{ events: any[]; newSyncToken: string | null; isFullSync: boolean; requiresRetry: boolean }> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  let events: any[] = [];
  let newSyncToken: string | null = null;
  const isFullSync = !syncToken;

  const params = new URLSearchParams({
    maxResults: '250',
    singleEvents: 'true',
  });

  if (syncToken) {
    params.set('syncToken', syncToken);
  } else {
    // Full sync - get events from last 30 days to next 90 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90);
    
    params.set('timeMin', timeMin.toISOString());
    params.set('timeMax', timeMax.toISOString());
    params.set('showDeleted', 'false');
  }

  let pageToken: string | null = null;

  do {
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle 410 Gone - sync token expired
      if (response.status === 410) {
        console.log('Sync token expired for calendar:', calendarId);
        return { events: [], newSyncToken: null, isFullSync: true, requiresRetry: true };
      }

      throw new Error(error.error?.message || 'Failed to fetch events');
    }

    const data = await response.json();
    events = events.concat(data.items || []);
    pageToken = data.nextPageToken || null;
    newSyncToken = data.nextSyncToken || newSyncToken;

  } while (pageToken);

  return { events, newSyncToken, isFullSync, requiresRetry: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection status
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connection')
      .select('is_active')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection || !connection.is_active) {
      return new Response(
        JSON.stringify({ error: 'No active Google Calendar connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all selected calendars from multi-calendar table
    const { data: selectedCalendars, error: calError } = await supabase
      .from('google_selected_calendars')
      .select('calendar_id, calendar_name, color')
      .eq('user_id', user.id)
      .eq('is_enabled', true);

    // Fallback to legacy single calendar if no multi-calendar data
    let calendarsToSync: CalendarToSync[] = selectedCalendars || [];
    
    if (calendarsToSync.length === 0) {
      const { data: legacyConn } = await supabase
        .from('google_calendar_connection')
        .select('selected_calendar_id, selected_calendar_name')
        .eq('user_id', user.id)
        .single();
      
      if (legacyConn?.selected_calendar_id) {
        calendarsToSync = [{
          calendar_id: legacyConn.selected_calendar_id,
          calendar_name: legacyConn.selected_calendar_name || 'Calendar',
        }];
      }
    }

    if (calendarsToSync.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No calendars selected for sync' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      await supabase
        .from('google_sync_state')
        .update({
          sync_status: 'error',
          last_error_message: 'Failed to get valid access token',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ error: 'Failed to get valid access token. Please reconnect.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sync states for all calendars
    const { data: syncStates } = await supabase
      .from('google_sync_state')
      .select('calendar_id, sync_token')
      .eq('user_id', user.id);

    const syncStateMap = new Map((syncStates || []).map(s => [s.calendar_id, s.sync_token]));

    // Aggregate results from all calendars
    let allNewEvents: any[] = [];
    let allUpdatedEvents: any[] = [];
    let allDeletedEventIds: string[] = [];
    let totalFetched = 0;
    let anyRequiresRetry = false;

    for (const calendar of calendarsToSync) {
      const syncToken = syncStateMap.get(calendar.calendar_id) || null;
      
      try {
        const { events, newSyncToken, isFullSync, requiresRetry } = await fetchCalendarEvents(
          accessToken,
          calendar.calendar_id,
          syncToken
        );

        if (requiresRetry) {
          // Clear sync token and mark for retry
          await supabase
            .from('google_sync_state')
            .upsert({
              user_id: user.id,
              calendar_id: calendar.calendar_id,
              sync_token: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          anyRequiresRetry = true;
          continue;
        }

        // Process events for this calendar
        const processedEvents: any[] = [];
        const deletedEventIds: string[] = [];

        for (const event of events) {
          if (event.status === 'cancelled') {
            deletedEventIds.push(event.id);
            continue;
          }

          // Skip events without proper times (like all-day events)
          if (!event.start?.dateTime || !event.end?.dateTime) {
            continue;
          }

          processedEvents.push({
            googleEventId: event.id,
            title: event.summary || 'Untitled',
            description: event.description || '',
            startTime: event.start.dateTime,
            endTime: event.end.dateTime,
            timeZone: event.start.timeZone || 'UTC',
            etag: event.etag,
            updated: event.updated,
            // Add source calendar info
            sourceCalendarId: calendar.calendar_id,
            sourceCalendarName: calendar.calendar_name,
            calendarColor: calendar.color,
          });
        }

        totalFetched += events.length;

        // Get existing mappings for this calendar
        const { data: existingMappings } = await supabase
          .from('event_sync_mapping')
          .select('app_block_id, google_event_id, google_etag')
          .eq('user_id', user.id);

        const mappingsByGoogleId = new Map(
          (existingMappings || []).map(m => [m.google_event_id, m])
        );

        // Categorize events
        const newEvents = processedEvents.filter(e => !mappingsByGoogleId.has(e.googleEventId));
        const updatedEvents = processedEvents.filter(e => {
          const mapping = mappingsByGoogleId.get(e.googleEventId);
          return mapping && mapping.google_etag !== e.etag;
        });

        allNewEvents = allNewEvents.concat(newEvents);
        allUpdatedEvents = allUpdatedEvents.concat(updatedEvents);
        allDeletedEventIds = allDeletedEventIds.concat(deletedEventIds);

        // Handle deleted events - remove mappings
        if (deletedEventIds.length > 0) {
          await supabase
            .from('event_sync_mapping')
            .delete()
            .eq('user_id', user.id)
            .in('google_event_id', deletedEventIds);
        }

        // Update sync state for this calendar
        const updateData: any = {
          user_id: user.id,
          calendar_id: calendar.calendar_id,
          sync_status: 'active',
          last_error_message: null,
          updated_at: new Date().toISOString(),
        };

        if (newSyncToken) {
          updateData.sync_token = newSyncToken;
        }

        if (isFullSync) {
          updateData.last_full_sync_at = new Date().toISOString();
        } else {
          updateData.last_incremental_sync_at = new Date().toISOString();
        }

        await supabase
          .from('google_sync_state')
          .upsert(updateData, { onConflict: 'user_id' });

        console.log('Poll completed for calendar:', calendar.calendar_id, 
          '- New:', newEvents.length, 
          '- Updated:', updatedEvents.length,
          '- Deleted:', deletedEventIds.length);

      } catch (calError) {
        console.error('Error syncing calendar:', calendar.calendar_id, calError);
        // Continue with other calendars
      }
    }

    if (anyRequiresRetry) {
      return new Response(
        JSON.stringify({ 
          message: 'Sync token expired for one or more calendars, please retry for full sync',
          requiresRetry: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Poll completed for user:', user.id, 
      '- Calendars:', calendarsToSync.length,
      '- Total New:', allNewEvents.length, 
      '- Total Updated:', allUpdatedEvents.length,
      '- Total Deleted:', allDeletedEventIds.length);

    return new Response(
      JSON.stringify({
        success: true,
        calendarsPolled: calendarsToSync.length,
        stats: {
          totalFetched,
          newEvents: allNewEvents.length,
          updatedEvents: allUpdatedEvents.length,
          deletedEvents: allDeletedEventIds.length,
        },
        newEvents: allNewEvents,
        updatedEvents: allUpdatedEvents,
        deletedEventIds: allDeletedEventIds,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in google-poll-changes:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});