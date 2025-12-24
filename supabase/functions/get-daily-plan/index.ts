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
  console.log('EDGE FUNC: get-daily-plan called');

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('Loading daily plan for:', { userId, date: today });

    // Get current cycle
    const { data: cycleData, error: cycleError } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    if (cycleError) {
      console.error('Cycle error:', cycleError);
      throw cycleError;
    }

    if (!cycleData || cycleData.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No active cycle found',
          data: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const currentCycle = cycleData[0];
    console.log('Current cycle:', currentCycle.cycle_id);

    // Fetch full cycle data including focus_area
    const { data: fullCycleData } = await supabaseClient
      .from('cycles_90_day')
      .select('focus_area')
      .eq('cycle_id', currentCycle.cycle_id)
      .single();
    
    const focusArea = fullCycleData?.focus_area || null;

    // Get current week
    const { data: weekData, error: weekError } = await supabaseClient.rpc('get_current_week', {
      p_cycle_id: currentCycle.cycle_id,
    });

    if (weekError) {
      console.error('Week error:', weekError);
      throw weekError;
    }

    let currentWeek = null;
    if (weekData && weekData.length > 0) {
      currentWeek = weekData[0];
      console.log('Current week:', currentWeek.week_id);
    }

    // Use upsert to handle race conditions - insert if not exists, otherwise do nothing
    const { data: upsertedPlan, error: upsertError } = await supabaseClient
      .from('daily_plans')
      .upsert(
        {
          user_id: userId,
          cycle_id: currentCycle.cycle_id,
          week_id: currentWeek?.week_id || null,
          date: today,
          top_3_today: [],
          selected_weekly_priorities: [],
          thought: '',
          feeling: '',
          deep_mode_notes: {},
        },
        {
          onConflict: 'user_id,date',
          ignoreDuplicates: true, // Don't update if exists
        }
      )
      .select()
      .maybeSingle();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    // Fetch the plan (either just created or existing)
    const { data: plan, error: fetchError } = await supabaseClient
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }

    console.log('Returning plan:', plan.day_id);

    return new Response(
      JSON.stringify({
        data: {
          day_id: plan.day_id,
          date: plan.date,
          top_3_today: plan.top_3_today || [],
          selected_weekly_priorities: plan.selected_weekly_priorities || [],
          thought: plan.thought || '',
          feeling: plan.feeling || '',
          deep_mode_notes: plan.deep_mode_notes || {},
          weekly_priorities: currentWeek?.top_3_priorities || [],
          focus_area: focusArea,
          scratch_pad_content: plan.scratch_pad_content || '',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in get-daily-plan:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
