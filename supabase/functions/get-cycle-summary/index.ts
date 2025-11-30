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
  console.log('EDGE FUNC: get-cycle-summary called');

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

    // Get current or most recent cycle
    const { data: cycleData } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    let cycle = cycleData && cycleData.length > 0 ? cycleData[0] : null;

    // If no current cycle, get the most recent one
    if (!cycle) {
      const { data: recentCycle } = await supabaseClient
        .from('cycles_90_day')
        .select('*')
        .eq('user_id', userId)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      cycle = recentCycle;
    }

    if (!cycle) {
      return new Response(
        JSON.stringify({ error: 'No cycle found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if cycle is complete
    const today = new Date();
    const endDate = new Date(cycle.end_date);
    const isCycleComplete = today > endDate;

    console.log('Cycle status:', {
      cycle_id: cycle.cycle_id,
      end_date: cycle.end_date,
      is_complete: isCycleComplete,
    });

    // Get or parse existing summary from supporting_projects field
    const parseJSON = (value: any, fallback: any) => {
      if (!value) return fallback;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return fallback;
        }
      }
      return value;
    };

    const existingSummary = parseJSON(cycle.supporting_projects, {});
    const hasSummary = existingSummary.identity_shifts || existingSummary.final_results || existingSummary.cycle_score;

    // Get all monthly reviews for this cycle
    const { data: monthlyReviews } = await supabaseClient
      .from('monthly_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.cycle_id)
      .order('month', { ascending: true });

    // Aggregate data from monthly reviews
    const allWins: string[] = [];
    const allChallenges: string[] = [];
    const allLessons: string[] = [];

    monthlyReviews?.forEach((review) => {
      const wins = parseJSON(review.wins, []);
      const trends = parseJSON(review.habit_trends, {});
      const patterns = parseJSON(review.thought_patterns, {});

      allWins.push(...wins.map(String).filter(Boolean));
      if (Array.isArray(trends.challenges)) {
        allChallenges.push(...trends.challenges.map(String).filter(Boolean));
      }
      if (Array.isArray(patterns.lessons)) {
        allLessons.push(...patterns.lessons.map(String).filter(Boolean));
      }
    });

    // Get habit completion stats for the entire cycle
    const { data: habitLogs } = await supabaseClient
      .from('habit_logs')
      .select('completed')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.cycle_id);

    const totalLogs = habitLogs?.length || 0;
    const completedLogs = habitLogs?.filter((log) => log.completed).length || 0;
    const overallHabitScore = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0;

    // Use existing summary if available, otherwise return defaults
    const identityShifts = Array.isArray(existingSummary.identity_shifts) 
      ? existingSummary.identity_shifts.map(String).filter(Boolean) 
      : [];
    const finalResults = Array.isArray(existingSummary.final_results)
      ? existingSummary.final_results.map(String).filter(Boolean)
      : [];
    const nextCycleFocus = Array.isArray(existingSummary.next_cycle_focus)
      ? existingSummary.next_cycle_focus.map(String).filter(Boolean)
      : [];
    const cycleScore = Number(existingSummary.cycle_score ?? 5);

    return new Response(
      JSON.stringify({
        cycle_id: cycle.cycle_id,
        cycle_goal: cycle.goal,
        cycle_why: cycle.why,
        cycle_identity: cycle.identity,
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        is_complete: isCycleComplete,
        has_summary: hasSummary,
        overall_wins: allWins,
        overall_challenges: allChallenges,
        overall_lessons: allLessons,
        identity_shifts: identityShifts,
        final_results: finalResults,
        next_cycle_focus: nextCycleFocus,
        cycle_score: cycleScore,
        overall_habit_score: overallHabitScore,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in get-cycle-summary:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
