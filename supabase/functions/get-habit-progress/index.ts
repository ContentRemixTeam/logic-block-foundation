import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  console.log('EDGE FUNC: get-habit-progress called');

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

    // Get current cycle
    const { data: cycleData } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];

    // Get all active habits
    const { data: habits } = await supabaseClient
      .from('habits')
      .select('habit_id, habit_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_archived', false);

    if (!habits || habits.length === 0) {
      return new Response(
        JSON.stringify({
          overall_completion: 0,
          weekly_completion: 0,
          cycle_completion: 0,
          current_streak: 0,
          habits: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Calculate streaks and completions for each habit
    const habitProgress = await Promise.all(
      habits.map(async (habit) => {
        // Get logs for this habit
        const { data: logs } = await supabaseClient
          .from('habit_logs')
          .select('date, completed')
          .eq('user_id', userId)
          .eq('habit_id', habit.habit_id)
          .order('date', { ascending: false })
          .limit(90);

        // Calculate current streak
        let streak = 0;
        if (logs && logs.length > 0) {
          const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          for (const log of sortedLogs) {
            if (log.completed) {
              streak++;
            } else {
              break;
            }
          }
        }

        // Week completion
        const weekLogs = logs?.filter((log) => log.date >= weekStart) || [];
        const weekCompleted = weekLogs.filter((log) => log.completed).length;
        const weekTotal = weekLogs.length;
        const weekPercent = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

        // Cycle completion
        let cyclePercent = 0;
        if (cycleData && cycleData.length > 0) {
          const cycleStart = cycleData[0].start_date;
          const cycleLogs = logs?.filter((log) => log.date >= cycleStart) || [];
          const cycleCompleted = cycleLogs.filter((log) => log.completed).length;
          const cycleTotal = cycleLogs.length;
          cyclePercent = cycleTotal > 0 ? Math.round((cycleCompleted / cycleTotal) * 100) : 0;
        }

        return {
          habit_id: habit.habit_id,
          habit_name: habit.habit_name,
          streak,
          week_percent: weekPercent,
          cycle_percent: cyclePercent,
        };
      })
    );

    // Calculate overall stats
    const overallWeekPercent = habitProgress.length > 0
      ? Math.round(habitProgress.reduce((sum, h) => sum + h.week_percent, 0) / habitProgress.length)
      : 0;

    const overallCyclePercent = habitProgress.length > 0
      ? Math.round(habitProgress.reduce((sum, h) => sum + h.cycle_percent, 0) / habitProgress.length)
      : 0;

    const maxStreak = habitProgress.length > 0
      ? Math.max(...habitProgress.map((h) => h.streak))
      : 0;

    return new Response(
      JSON.stringify({
        overall_completion: overallCyclePercent,
        weekly_completion: overallWeekPercent,
        cycle_completion: overallCyclePercent,
        current_streak: maxStreak,
        habits: habitProgress,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in get-habit-progress:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
