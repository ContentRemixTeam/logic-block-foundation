import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('google_calendar_connection')
      .select('selected_calendar_id, selected_calendar_name, is_active, updated_at')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ 
          connected: false,
          calendarSelected: false,
          selectedCalendars: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get selected calendars from new multi-calendar table
    const { data: selectedCalendars, error: calError } = await supabase
      .from('google_selected_calendars')
      .select('calendar_id, calendar_name, is_enabled, color')
      .eq('user_id', user.id)
      .eq('is_enabled', true);

    // Transform to expected format
    const calendarsArray = (selectedCalendars || []).map(cal => ({
      id: cal.calendar_id,
      name: cal.calendar_name,
      isEnabled: cal.is_enabled,
      color: cal.color,
    }));

    // Get sync state (use first calendar for backward compatibility)
    const { data: syncState } = await supabase
      .from('google_sync_state')
      .select('sync_status, last_full_sync_at, last_incremental_sync_at, last_error_message')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const lastSyncAt = syncState?.last_incremental_sync_at || syncState?.last_full_sync_at;

    // Determine if calendars are selected (new way or legacy way)
    const hasSelectedCalendars = calendarsArray.length > 0 || !!connection.selected_calendar_id;

    return new Response(
      JSON.stringify({
        connected: connection.is_active,
        calendarSelected: hasSelectedCalendars,
        // Legacy single calendar support
        calendarName: calendarsArray[0]?.name || connection.selected_calendar_name,
        calendarId: calendarsArray[0]?.id || connection.selected_calendar_id,
        // New multi-calendar support
        selectedCalendars: calendarsArray.length > 0 ? calendarsArray : (
          // Fallback to legacy single calendar if no multi-calendar data
          connection.selected_calendar_id ? [{
            id: connection.selected_calendar_id,
            name: connection.selected_calendar_name || 'Calendar',
            isEnabled: true,
          }] : []
        ),
        syncStatus: syncState?.sync_status || 'unknown',
        lastSyncAt,
        lastError: syncState?.last_error_message,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in google-get-status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});