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
  console.log('EDGE FUNC: get-weekly-plan called');

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

    console.log('Getting weekly plan for user:', userId);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for database operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current cycle
    const { data: cycleData, error: cycleError } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    if (cycleError) {
      console.error('Error getting current cycle:', cycleError);
      throw cycleError;
    }

    if (!cycleData || cycleData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No active cycle found',
          data: null 
        }), 
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const currentCycle = cycleData[0];
    console.log('Current cycle:', currentCycle.cycle_id);

    // Fetch full cycle data to get metric names
    const { data: fullCycleData } = await supabaseClient
      .from('cycles_90_day')
      .select('metric_1_name, metric_2_name, metric_3_name')
      .eq('cycle_id', currentCycle.cycle_id)
      .maybeSingle();

    const cycleMetrics = {
      metric_1_name: fullCycleData?.metric_1_name || null,
      metric_2_name: fullCycleData?.metric_2_name || null,
      metric_3_name: fullCycleData?.metric_3_name || null,
    };

    // Get current week
    const { data: weekData, error: weekError } = await supabaseClient.rpc('get_current_week', {
      p_cycle_id: currentCycle.cycle_id,
    });

    if (weekError) {
      console.error('Error getting current week:', weekError);
      throw weekError;
    }

    // If week exists, return it with summary
    if (weekData && weekData.length > 0) {
      const week = weekData[0];
      console.log('Found existing week:', week.week_id);

      // Fetch full week data including metric targets and goal_rewrite
      const { data: fullWeekData } = await supabaseClient
        .from('weekly_plans')
        .select('metric_1_target, metric_2_target, metric_3_target, challenges, adjustments, goal_rewrite')
        .eq('week_id', week.week_id)
        .maybeSingle();
      
      // Fetch previous week's goal_rewrite for autofill
      const previousWeekStart = new Date(week.start_of_week);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekStr = previousWeekStart.toISOString().split('T')[0];
      
      const { data: previousWeekData } = await supabaseClient
        .from('weekly_plans')
        .select('goal_rewrite')
        .eq('user_id', userId)
        .eq('start_of_week', previousWeekStr)
        .maybeSingle();
      
      // Fetch full cycle data for CycleSnapshotCard
      const { data: fullCycleData } = await supabaseClient
        .from('cycles_90_day')
        .select('*')
        .eq('cycle_id', currentCycle.cycle_id)
        .single();
      
      // Calculate weekly summary
      const weekStart = new Date(week.start_of_week);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Count daily plans for this week
      const { count: dailyPlansCount } = await supabaseClient
        .from('daily_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('week_id', week.week_id);
      
      // Calculate habit completion for this week
      const { data: habits } = await supabaseClient
        .from('habits')
        .select('habit_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      const totalHabits = (habits?.length || 0) * 7;
      
      const { data: habitLogs } = await supabaseClient
        .from('habit_logs')
        .select('log_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('date', week.start_of_week)
        .lte('date', weekEnd.toISOString().split('T')[0]);
      
      const completedHabits = habitLogs?.length || 0;
      const habitPercent = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
      
      // Check if review exists
      const { data: reviewData } = await supabaseClient
        .from('weekly_reviews')
        .select('review_id')
        .eq('user_id', userId)
        .eq('week_id', week.week_id)
        .maybeSingle();
      
      return new Response(
        JSON.stringify({ 
          data: {
            week_id: week.week_id,
            start_of_week: week.start_of_week,
            top_3_priorities: week.top_3_priorities || [],
            weekly_thought: week.weekly_thought || '',
            weekly_feeling: week.weekly_feeling || '',
            challenges: fullWeekData?.challenges || null,
            adjustments: fullWeekData?.adjustments || null,
            weekly_summary: {
              daily_plans_completed: dailyPlansCount || 0,
              habit_completion_percent: habitPercent,
              review_completed: Boolean(reviewData),
            },
            cycle_metrics: cycleMetrics,
            metric_1_target: fullWeekData?.metric_1_target || null,
            metric_2_target: fullWeekData?.metric_2_target || null,
            metric_3_target: fullWeekData?.metric_3_target || null,
            // Goal rewrite fields
            goal_rewrite: fullWeekData?.goal_rewrite || '',
            previous_goal_rewrite: previousWeekData?.goal_rewrite || '',
            cycle_goal: fullCycleData?.goal || '',
            // Full cycle data for CycleSnapshotCard
            cycle: fullCycleData ? {
              cycle_id: fullCycleData.cycle_id,
              goal: fullCycleData.goal,
              why: fullCycleData.why,
              identity: fullCycleData.identity,
              focus_area: fullCycleData.focus_area,
              start_date: fullCycleData.start_date,
              end_date: fullCycleData.end_date,
              metric_1_name: fullCycleData.metric_1_name,
              metric_1_start: fullCycleData.metric_1_start,
              metric_2_name: fullCycleData.metric_2_name,
              metric_2_start: fullCycleData.metric_2_start,
              metric_3_name: fullCycleData.metric_3_name,
              metric_3_start: fullCycleData.metric_3_start,
            } : null,
          }
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Auto-create week if it doesn't exist
    console.log('No week found, creating new week');
    
    // Calculate Monday of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const startOfWeek = monday.toISOString().split('T')[0];

    // First check if a week already exists (race condition check)
    const { data: existingWeek } = await supabaseClient
      .from('weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('start_of_week', startOfWeek)
      .maybeSingle();

    let newWeek = existingWeek;

    if (!existingWeek) {
      // Create new week
      const { data: createdWeek, error: insertError } = await supabaseClient
        .from('weekly_plans')
        .insert({
          user_id: userId,
          cycle_id: currentCycle.cycle_id,
          start_of_week: startOfWeek,
          top_3_priorities: [],
          weekly_thought: '',
          weekly_feeling: '',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating week:', insertError);
        // If insert failed due to duplicate, try fetching again
        const { data: refetchedWeek, error: refetchError } = await supabaseClient
          .from('weekly_plans')
          .select('*')
          .eq('user_id', userId)
          .eq('cycle_id', currentCycle.cycle_id)
          .eq('start_of_week', startOfWeek)
          .maybeSingle();

        if (refetchError || !refetchedWeek) {
          throw insertError;
        }
        newWeek = refetchedWeek;
      } else {
        newWeek = createdWeek;
      }
    }

    if (!newWeek) {
      throw new Error('Failed to create or fetch weekly plan');
    }

    console.log('Returning week:', newWeek.week_id);

    return new Response(
      JSON.stringify({ 
        data: {
          week_id: newWeek.week_id,
          start_of_week: newWeek.start_of_week,
          top_3_priorities: newWeek.top_3_priorities || [],
          weekly_thought: newWeek.weekly_thought || '',
          weekly_feeling: newWeek.weekly_feeling || '',
          challenges: null,
          adjustments: null,
          weekly_summary: {
            daily_plans_completed: 0,
            habit_completion_percent: 0,
            review_completed: false,
          },
          cycle_metrics: cycleMetrics,
          metric_1_target: null,
          metric_2_target: null,
          metric_3_target: null,
        }
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in get-weekly-plan function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
