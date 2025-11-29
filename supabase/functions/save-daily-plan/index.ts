import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode JWT to get user ID
function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.sub || null;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  console.log('EDGE FUNC: save-daily-plan called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { day_id, top_3_today, selected_weekly_priorities, thought, feeling, deep_mode_notes } = body;

    console.log('Saving daily plan:', { userId, day_id });

    // Validate and normalize arrays
    const normalizedTop3 = Array.isArray(top_3_today)
      ? top_3_today.filter((item) => typeof item === 'string' && item.trim()).slice(0, 3)
      : [];

    const normalizedWeeklyPriorities = Array.isArray(selected_weekly_priorities)
      ? selected_weekly_priorities.filter((item) => typeof item === 'string' && item.trim())
      : [];

    // Validate deep mode notes
    const normalizedDeepNotes = typeof deep_mode_notes === 'object' && deep_mode_notes !== null
      ? deep_mode_notes
      : {};

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Update daily plan
    const { data, error: updateError } = await supabaseClient
      .from('daily_plans')
      .update({
        top_3_today: normalizedTop3,
        selected_weekly_priorities: normalizedWeeklyPriorities,
        thought: (thought || '').substring(0, 500),
        feeling: (feeling || '').substring(0, 200),
        deep_mode_notes: normalizedDeepNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('day_id', day_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Daily plan saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          day_id: data.day_id,
          top_3_today: data.top_3_today,
          selected_weekly_priorities: data.selected_weekly_priorities,
          thought: data.thought,
          feeling: data.feeling,
          deep_mode_notes: data.deep_mode_notes,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in save-daily-plan:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
