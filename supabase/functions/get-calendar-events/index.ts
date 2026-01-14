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
    console.log('No connection found for user:', userId);
    return null;
  }

  const tokenExpiry = new Date(connection.token_expiry);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000;

  if (tokenExpiry.getTime() - now.getTime() > bufferTime) {
    return decryptToken(connection.access_token_encrypted);
  }

  // Refresh token
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
        JSON.stringify({ error: 'No authorization header', events: [] }),
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
        JSON.stringify({ error: 'Unauthorized', events: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'startDate and endDate are required', events: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connection')
      .select('selected_calendar_id, is_active')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection || !connection.is_active || !connection.selected_calendar_id) {
      console.log('No active calendar connection for user:', user.id);
      return new Response(
        JSON.stringify({ events: [], connected: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Failed to get valid access token', events: [], connected: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarId = encodeURIComponent(connection.selected_calendar_id);
    
    // Build API URL - Google Calendar API requires RFC3339/ISO 8601 format
    // Convert date strings to proper timestamps with timezone
    const timeMin = startDate.includes('T') ? startDate : `${startDate}T00:00:00Z`;
    const timeMax = endDate.includes('T') ? endDate : `${endDate}T23:59:59Z`;
    
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`;
    
    console.log('Fetching calendar events from:', startDate, 'to:', endDate);
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to fetch events:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calendar events', events: [], connected: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const items = data.items || [];

    // Transform events
    const events = items.map((event: any) => ({
      id: event.id,
      summary: event.summary || 'Untitled Event',
      description: event.description || '',
      start: event.start,
      end: event.end,
      location: event.location || '',
      htmlLink: event.htmlLink,
      hangoutLink: event.hangoutLink,
      conferenceData: event.conferenceData,
      attendees: event.attendees,
      organizer: event.organizer,
      status: event.status,
      colorId: event.colorId,
    }));

    console.log('Fetched', events.length, 'events for user:', user.id);

    return new Response(
      JSON.stringify({ events, connected: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in get-calendar-events:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, events: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
