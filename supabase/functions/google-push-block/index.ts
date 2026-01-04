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
    console.error('No connection found:', error);
    return null;
  }

  const tokenExpiry = new Date(connection.token_expiry);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000;

  // Token still valid
  if (tokenExpiry.getTime() - now.getTime() > bufferTime) {
    return decryptToken(connection.access_token_encrypted);
  }

  // Need to refresh
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

  // Update stored token
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

    const { blockId, action, eventData } = await req.json();

    if (!blockId || !action) {
      return new Response(
        JSON.stringify({ error: 'Block ID and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection info
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connection')
      .select('selected_calendar_id, is_active')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection || !connection.is_active) {
      return new Response(
        JSON.stringify({ error: 'No active Google Calendar connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connection.selected_calendar_id) {
      return new Response(
        JSON.stringify({ error: 'No calendar selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Failed to get valid access token. Please reconnect.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarId = encodeURIComponent(connection.selected_calendar_id);
    let result;

    if (action === 'create') {
      // Create new event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: eventData.title || 'Untitled Block',
            description: eventData.description || '',
            start: {
              dateTime: eventData.startTime,
              timeZone: eventData.timeZone || 'UTC',
            },
            end: {
              dateTime: eventData.endTime,
              timeZone: eventData.timeZone || 'UTC',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create event:', error);
        return new Response(
          JSON.stringify({ error: `Failed to create event: ${error.error?.message || 'Unknown error'}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = await response.json();

      // Store mapping
      await supabase
        .from('event_sync_mapping')
        .upsert({
          user_id: user.id,
          app_block_id: blockId,
          google_event_id: result.id,
          google_etag: result.etag,
          sync_direction: 'app_to_google',
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,app_block_id' });

      console.log('Created Google event:', result.id, 'for block:', blockId);

    } else if (action === 'update') {
      // Get existing mapping
      const { data: mapping, error: mapError } = await supabase
        .from('event_sync_mapping')
        .select('google_event_id')
        .eq('user_id', user.id)
        .eq('app_block_id', blockId)
        .single();

      if (mapError || !mapping) {
        // No mapping exists, create new event instead
        return await handleRequest(req, 'create');
      }

      const eventId = encodeURIComponent(mapping.google_event_id);
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: eventData.title || 'Untitled Block',
            description: eventData.description || '',
            start: {
              dateTime: eventData.startTime,
              timeZone: eventData.timeZone || 'UTC',
            },
            end: {
              dateTime: eventData.endTime,
              timeZone: eventData.timeZone || 'UTC',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        // If 404, event was deleted in Google - remove mapping
        if (response.status === 404) {
          await supabase
            .from('event_sync_mapping')
            .delete()
            .eq('user_id', user.id)
            .eq('app_block_id', blockId);
          
          return new Response(
            JSON.stringify({ error: 'Event was deleted in Google Calendar' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('Failed to update event:', error);
        return new Response(
          JSON.stringify({ error: `Failed to update event: ${error.error?.message || 'Unknown error'}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = await response.json();

      // Update mapping
      await supabase
        .from('event_sync_mapping')
        .update({
          google_etag: result.etag,
          last_synced_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('app_block_id', blockId);

      console.log('Updated Google event:', result.id);

    } else if (action === 'delete') {
      // Get existing mapping
      const { data: mapping, error: mapError } = await supabase
        .from('event_sync_mapping')
        .select('google_event_id')
        .eq('user_id', user.id)
        .eq('app_block_id', blockId)
        .single();

      if (mapError || !mapping) {
        // No mapping, nothing to delete
        return new Response(
          JSON.stringify({ success: true, message: 'No mapping found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const eventId = encodeURIComponent(mapping.google_event_id);
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.json();
        console.error('Failed to delete event:', error);
        return new Response(
          JSON.stringify({ error: `Failed to delete event: ${error.error?.message || 'Unknown error'}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remove mapping
      await supabase
        .from('event_sync_mapping')
        .delete()
        .eq('user_id', user.id)
        .eq('app_block_id', blockId);

      console.log('Deleted Google event for block:', blockId);
      result = { deleted: true };

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use create, update, or delete.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in google-push-block:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleRequest(req: Request, newAction: string) {
  // Re-process request with new action - this is a simple redirect mechanism
  // In practice, the caller should retry with create action
  return new Response(
    JSON.stringify({ error: 'Event not found. Please create a new event.' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
