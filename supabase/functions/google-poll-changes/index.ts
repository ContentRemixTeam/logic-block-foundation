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

    // Get connection and sync state
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connection')
      .select('selected_calendar_id, is_active')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection || !connection.is_active || !connection.selected_calendar_id) {
      return new Response(
        JSON.stringify({ error: 'No active Google Calendar connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: syncState, error: stateError } = await supabase
      .from('google_sync_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

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

    const calendarId = encodeURIComponent(connection.selected_calendar_id);
    let syncToken = syncState?.sync_token;
    let isFullSync = !syncToken;
    let events: any[] = [];
    let newSyncToken: string | null = null;

    // Build API URL
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

      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle 410 Gone - sync token expired
        if (response.status === 410) {
          console.log('Sync token expired, performing full sync');
          
          // Clear sync token and retry
          await supabase
            .from('google_sync_state')
            .update({
              sync_token: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          // Recursive call with cleared token
          return new Response(
            JSON.stringify({ 
              message: 'Sync token expired, please retry for full sync',
              requiresRetry: true 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.error('Failed to fetch events:', error);
        
        await supabase
          .from('google_sync_state')
          .update({
            sync_status: 'error',
            last_error_message: error.error?.message || 'Failed to fetch events',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ error: `Failed to fetch events: ${error.error?.message || 'Unknown error'}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      events = events.concat(data.items || []);
      pageToken = data.nextPageToken || null;
      newSyncToken = data.nextSyncToken || newSyncToken;

    } while (pageToken);

    // Process events
    const processedEvents: any[] = [];
    const deletedEventIds: string[] = [];

    for (const event of events) {
      if (event.status === 'cancelled') {
        deletedEventIds.push(event.id);
        continue;
      }

      // Only process events with start/end times (skip all-day events)
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
      });
    }

    // Get existing mappings
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

    // Handle deleted events - remove mappings
    if (deletedEventIds.length > 0) {
      await supabase
        .from('event_sync_mapping')
        .delete()
        .eq('user_id', user.id)
        .in('google_event_id', deletedEventIds);
    }

    // Update sync state
    const updateData: any = {
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
      .upsert({
        user_id: user.id,
        calendar_id: connection.selected_calendar_id,
        ...updateData,
      }, { onConflict: 'user_id' });

    console.log('Poll completed for user:', user.id, 
      '- New:', newEvents.length, 
      '- Updated:', updatedEvents.length,
      '- Deleted:', deletedEventIds.length);

    return new Response(
      JSON.stringify({
        success: true,
        isFullSync,
        stats: {
          totalFetched: events.length,
          newEvents: newEvents.length,
          updatedEvents: updatedEvents.length,
          deletedEvents: deletedEventIds.length,
        },
        newEvents,
        updatedEvents,
        deletedEventIds,
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
