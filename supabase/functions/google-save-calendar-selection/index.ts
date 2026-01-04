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

    const { calendarId, calendarName } = await req.json();

    if (!calendarId) {
      return new Response(
        JSON.stringify({ error: 'Calendar ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update calendar selection
    const { error: updateError } = await supabase
      .from('google_calendar_connection')
      .update({
        selected_calendar_id: calendarId,
        selected_calendar_name: calendarName,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating calendar selection:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save calendar selection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize or update sync state
    const { error: syncStateError } = await supabase
      .from('google_sync_state')
      .upsert({
        user_id: user.id,
        calendar_id: calendarId,
        sync_status: 'active',
        sync_token: null, // Will be set after first sync
        last_error_message: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (syncStateError) {
      console.error('Error initializing sync state:', syncStateError);
      // Non-fatal, continue
    }

    console.log('Calendar selection saved for user:', user.id, 'Calendar:', calendarId);

    return new Response(
      JSON.stringify({ success: true, calendarId, calendarName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in google-save-calendar-selection:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
