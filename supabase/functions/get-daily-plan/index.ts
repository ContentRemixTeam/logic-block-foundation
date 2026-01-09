import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('EDGE FUNC: get-daily-plan called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client to validate the token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Validate the user's token by calling getUser with the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !userData?.user?.id) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

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

    // Fetch full cycle data including focus_area and all cycle fields for CycleSnapshotCard
    const { data: fullCycleData } = await supabaseClient
      .from('cycles_90_day')
      .select('*')
      .eq('cycle_id', currentCycle.cycle_id)
      .single();
    
    const focusArea = fullCycleData?.focus_area || null;

    // Fetch yesterday's goal_rewrite for autofill
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const { data: yesterdayPlan } = await supabaseClient
      .from('daily_plans')
      .select('goal_rewrite')
      .eq('user_id', userId)
      .eq('date', yesterdayStr)
      .maybeSingle();

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

    // Fetch Top 3 tasks for today (tasks with priority_order 1, 2, or 3)
    const { data: top3Tasks, error: top3Error } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('scheduled_date', today)
      .not('priority_order', 'is', null)
      .order('priority_order', { ascending: true });

    if (top3Error) {
      console.error('Top 3 tasks error:', top3Error);
    }

    // Fetch other tasks for today (quick tasks from scratch pad, etc.)
    const { data: otherTasks, error: otherTasksError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('scheduled_date', today)
      .is('priority_order', null)
      .order('created_at', { ascending: true });

    if (otherTasksError) {
      console.error('Other tasks error:', otherTasksError);
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
          scratch_pad_title: plan.scratch_pad_title || '',
          one_thing: plan.one_thing || '',
          top_3_tasks: top3Tasks || [],
          other_tasks: otherTasks || [],
          // Goal rewrite fields
          goal_rewrite: plan.goal_rewrite || '',
          previous_goal_rewrite: yesterdayPlan?.goal_rewrite || '',
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