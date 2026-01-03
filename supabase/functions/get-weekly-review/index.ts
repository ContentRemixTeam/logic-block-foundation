import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch (e) {
    console.error('JWT decode error:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('EDGE FUNC: get-weekly-review called', {
      method: req.method,
      hasAuthHeader: Boolean(req.headers.get('Authorization')),
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User ID from JWT:', { userId: Boolean(userId) });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current cycle
    const { data: cycleData, error: cycleError } = await supabase.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    if (cycleError) {
      console.error('Cycle error:', cycleError);
      return new Response(JSON.stringify({ error: 'Failed to get current cycle' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentCycle = cycleData?.[0];
    if (!currentCycle) {
      return new Response(
        JSON.stringify({
          error: 'No active cycle',
          week_id: null,
          focus_area: null,
          wins: [],
          challenges: [],
          lessons: [],
          intentions: [],
          weekly_score: 0,
          focus_reflection: '',
          habit_stats: { total: 0, completed: 0, percent: 0 },
          cycle_progress: { total_days: 90, completed_days: 0, percent: 0 },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch full cycle data including focus_area and metric names
    const { data: fullCycleData } = await supabase
      .from('cycles_90_day')
      .select('focus_area, metric_1_name, metric_2_name, metric_3_name')
      .eq('cycle_id', currentCycle.cycle_id)
      .single();
    
    const focusArea = fullCycleData?.focus_area || null;
    const cycleMetrics = {
      metric_1_name: fullCycleData?.metric_1_name || null,
      metric_2_name: fullCycleData?.metric_2_name || null,
      metric_3_name: fullCycleData?.metric_3_name || null,
    };

    // Get current week
    const { data: weekData, error: weekError } = await supabase.rpc('get_current_week', {
      p_cycle_id: currentCycle.cycle_id,
    });

    if (weekError) {
      console.error('Week error:', weekError);
      return new Response(JSON.stringify({ error: 'Failed to get current week' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentWeek = weekData?.[0];
    if (!currentWeek) {
      return new Response(
        JSON.stringify({
          error: 'No active week',
          week_id: null,
          focus_area: focusArea,
          wins: [],
          challenges: [],
          lessons: [],
          intentions: [],
          weekly_score: 0,
          focus_reflection: '',
          habit_stats: { total: 0, completed: 0, percent: 0 },
          cycle_progress: { total_days: 90, completed_days: 0, percent: 0 },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to load existing review
    const { data: existingReview, error: reviewError } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('week_id', currentWeek.week_id)
      .maybeSingle();

    console.log('Existing review:', { found: Boolean(existingReview), error: reviewError?.message });

    let reviewData = existingReview?.habit_summary || {
      wins: [],
      challenges: [],
      lessons: [],
      intentions: [],
      weekly_score: 0,
      focus_reflection: '',
    };
    
    // If no review exists, auto-create one
    if (!existingReview) {
      reviewData = {
        wins: [],
        challenges: [],
        lessons: [],
        intentions: [],
        weekly_score: 0,
        focus_reflection: '',
      };

      const { error: insertError } = await supabase.from('weekly_reviews').insert({
        user_id: userId,
        week_id: currentWeek.week_id,
        habit_summary: reviewData,
        wins: '',
        challenges: '',
        adjustments: '',
      });

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('Auto-created new weekly review');
      }
    }

    // Get previous week's review for trend comparison
    const previousWeekStart = new Date(currentWeek.start_of_week);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const prevWeekStartStr = previousWeekStart.toISOString().split('T')[0];

    const { data: previousWeekPlan } = await supabase
      .from('weekly_plans')
      .select('week_id')
      .eq('user_id', userId)
      .eq('start_of_week', prevWeekStartStr)
      .maybeSingle();

    let previousMetrics = null;
    if (previousWeekPlan) {
      const { data: prevReview } = await supabase
        .from('weekly_reviews')
        .select('metric_1_actual, metric_2_actual, metric_3_actual')
        .eq('user_id', userId)
        .eq('week_id', previousWeekPlan.week_id)
        .maybeSingle();
      
      if (prevReview) {
        previousMetrics = {
          metric_1_actual: prevReview.metric_1_actual,
          metric_2_actual: prevReview.metric_2_actual,
          metric_3_actual: prevReview.metric_3_actual,
        };
      }
    }

    // Calculate habit stats for the week
    const weekStart = new Date(currentWeek.start_of_week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('habit_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    const totalHabits = (habits?.length || 0) * 7; // 7 days per week

    const { data: habitLogs, error: logsError } = await supabase
      .from('habit_logs')
      .select('log_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', currentWeek.start_of_week)
      .lte('date', weekEnd.toISOString().split('T')[0]);

    const completedHabits = habitLogs?.length || 0;
    const habitPercent = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

    // Calculate cycle progress
    const cycleStart = new Date(currentCycle.start_date);
    const cycleEnd = new Date(currentCycle.end_date);
    const today = new Date();
    const totalDays = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const completedDays = Math.ceil((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const cyclePercent = Math.min(100, Math.max(0, Math.round((completedDays / totalDays) * 100)));

    const response = {
      week_id: currentWeek.week_id,
      focus_area: focusArea,
      wins: Array.isArray(reviewData.wins) ? reviewData.wins : [],
      challenges: Array.isArray(reviewData.challenges) ? reviewData.challenges : [],
      lessons: Array.isArray(reviewData.lessons) ? reviewData.lessons : [],
      intentions: Array.isArray(reviewData.intentions) ? reviewData.intentions : [],
      weekly_score: reviewData.weekly_score || 0,
      focus_reflection: reviewData.focus_reflection || '',
      share_to_community: existingReview?.share_to_community || false,
      habit_stats: {
        total: totalHabits,
        completed: completedHabits,
        percent: habitPercent,
      },
      cycle_progress: {
        total_days: totalDays,
        completed_days: completedDays,
        percent: cyclePercent,
      },
      cycle_metrics: cycleMetrics,
      metric_1_actual: existingReview?.metric_1_actual || null,
      metric_2_actual: existingReview?.metric_2_actual || null,
      metric_3_actual: existingReview?.metric_3_actual || null,
      previous_metrics: previousMetrics,
    };

    console.log('Returning review data:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
