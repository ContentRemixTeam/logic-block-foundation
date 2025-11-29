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

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

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

    // Try to load existing daily plan
    const { data: existingPlan, error: planError } = await supabaseClient
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (planError) {
      console.error('Plan load error:', planError);
      throw planError;
    }

    // If plan exists, return it
    if (existingPlan) {
      console.log('Found existing plan:', existingPlan.day_id);
      return new Response(
        JSON.stringify({
          data: {
            day_id: existingPlan.day_id,
            date: existingPlan.date,
            top_3_today: existingPlan.top_3_today || [],
            selected_weekly_priorities: existingPlan.selected_weekly_priorities || [],
            thought: existingPlan.thought || '',
            feeling: existingPlan.feeling || '',
            deep_mode_notes: existingPlan.deep_mode_notes || {},
            weekly_priorities: currentWeek?.top_3_priorities || [],
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Auto-create new plan
    console.log('Creating new daily plan');
    const { data: newPlan, error: insertError } = await supabaseClient
      .from('daily_plans')
      .insert({
        user_id: userId,
        cycle_id: currentCycle.cycle_id,
        week_id: currentWeek?.week_id || null,
        date: today,
        top_3_today: [],
        selected_weekly_priorities: [],
        thought: '',
        feeling: '',
        deep_mode_notes: {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Created new plan:', newPlan.day_id);

    return new Response(
      JSON.stringify({
        data: {
          day_id: newPlan.day_id,
          date: newPlan.date,
          top_3_today: [],
          selected_weekly_priorities: [],
          thought: '',
          feeling: '',
          deep_mode_notes: {},
          weekly_priorities: currentWeek?.top_3_priorities || [],
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
