import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectedCalendar {
  id: string;
  name: string;
  isEnabled: boolean;
  color?: string;
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

    const body = await req.json();
    
    // Support both old single calendar format and new multi-calendar format
    let calendarsToSave: SelectedCalendar[] = [];
    
    if (body.calendars && Array.isArray(body.calendars)) {
      // New multi-calendar format
      calendarsToSave = body.calendars;
    } else if (body.calendarId) {
      // Old single calendar format - maintain backward compatibility
      calendarsToSave = [{
        id: body.calendarId,
        name: body.calendarName || 'Calendar',
        isEnabled: true,
      }];
    }

    if (calendarsToSave.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one calendar is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete existing selections for this user
    await supabase
      .from('google_selected_calendars')
      .delete()
      .eq('user_id', user.id);

    // Insert new selections
    const insertData = calendarsToSave.map(cal => ({
      user_id: user.id,
      calendar_id: cal.id,
      calendar_name: cal.name,
      is_enabled: cal.isEnabled !== false,
      color: cal.color || null,
    }));

    const { error: insertError } = await supabase
      .from('google_selected_calendars')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting calendar selections:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save calendar selections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also update legacy google_calendar_connection for backward compatibility
    // Use the first calendar as the "primary" selection
    const primaryCalendar = calendarsToSave[0];
    const { error: updateError } = await supabase
      .from('google_calendar_connection')
      .update({
        selected_calendar_id: primaryCalendar.id,
        selected_calendar_name: primaryCalendar.name,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating legacy connection:', updateError);
      // Non-fatal, continue
    }

    // Initialize or update sync state for each calendar
    for (const cal of calendarsToSave) {
      const { error: syncStateError } = await supabase
        .from('google_sync_state')
        .upsert({
          user_id: user.id,
          calendar_id: cal.id,
          sync_status: 'active',
          sync_token: null, // Will be set after first sync
          last_error_message: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (syncStateError) {
        console.error('Error initializing sync state for calendar:', cal.id, syncStateError);
        // Non-fatal, continue
      }
    }

    console.log('Calendar selections saved for user:', user.id, 'Calendars:', calendarsToSave.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        calendars: calendarsToSave,
        // Backward compatibility
        calendarId: primaryCalendar.id,
        calendarName: primaryCalendar.name,
      }),
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