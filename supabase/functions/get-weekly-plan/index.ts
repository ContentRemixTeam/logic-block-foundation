import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create authenticated client to get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Getting weekly plan for user:', user.id);

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get current cycle
    const { data: cycleData, error: cycleError } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: user.id,
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
      
      // Calculate weekly summary
      const weekStart = new Date(week.start_of_week);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Count daily plans for this week
      const { count: dailyPlansCount } = await supabaseClient
        .from('daily_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('week_id', week.week_id);
      
      // Calculate habit completion for this week
      const { data: habits } = await supabaseClient
        .from('habits')
        .select('habit_id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      const totalHabits = (habits?.length || 0) * 7;
      
      const { data: habitLogs } = await supabaseClient
        .from('habit_logs')
        .select('log_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('date', week.start_of_week)
        .lte('date', weekEnd.toISOString().split('T')[0]);
      
      const completedHabits = habitLogs?.length || 0;
      const habitPercent = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
      
      // Check if review exists
      const { data: reviewData } = await supabaseClient
        .from('weekly_reviews')
        .select('review_id')
        .eq('user_id', user.id)
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
            challenges: null,
            adjustments: null,
            weekly_summary: {
              daily_plans_completed: dailyPlansCount || 0,
              habit_completion_percent: habitPercent,
              review_completed: Boolean(reviewData),
            },
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

    // Create new week
    const { data: newWeek, error: insertError } = await supabaseClient
      .from('weekly_plans')
      .insert({
        user_id: user.id,
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
      throw insertError;
    }

    console.log('Created new week:', newWeek.week_id);

    return new Response(
      JSON.stringify({ 
        data: {
          week_id: newWeek.week_id,
          start_of_week: newWeek.start_of_week,
          top_3_priorities: [],
          weekly_thought: '',
          weekly_feeling: '',
          challenges: null,
          adjustments: null,
          weekly_summary: {
            daily_plans_completed: 0,
            habit_completion_percent: 0,
            review_completed: false,
          },
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
