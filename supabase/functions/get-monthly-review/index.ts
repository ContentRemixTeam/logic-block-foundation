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
  console.log('EDGE FUNC: get-monthly-review called');

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

    if (!cycleData || cycleData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active cycle found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const currentCycle = cycleData[0];
    const currentMonth = new Date().getMonth() + 1;

    // Try to get existing monthly review
    const { data: existingReview } = await supabaseClient
      .from('monthly_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('month', currentMonth)
      .maybeSingle();

    let reviewData = existingReview;

    // Auto-create if missing
    if (!reviewData) {
      const { data: newReview, error: insertError } = await supabaseClient
        .from('monthly_reviews')
        .insert({
          user_id: userId,
          cycle_id: currentCycle.cycle_id,
          month: currentMonth,
          wins: JSON.stringify([]),
          habit_trends: JSON.stringify({}),
          thought_patterns: JSON.stringify({}),
          adjustments: JSON.stringify([]),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating monthly review:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create monthly review' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      reviewData = newReview;
    }

    // Calculate habit consistency for the month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const { data: habitLogs } = await supabaseClient
      .from('habit_logs')
      .select('completed')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0]);

    const totalLogs = habitLogs?.length || 0;
    const completedLogs = habitLogs?.filter((log) => log.completed).length || 0;
    const habitConsistency = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0;

    // Calculate cycle progress
    const today = new Date();
    const startDate = new Date(currentCycle.start_date);
    const endDate = new Date(currentCycle.end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const completedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const cycleProgressPercent = Math.min(100, Math.max(0, Math.round((completedDays / totalDays) * 100)));

    // Parse and normalize data
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

    const wins = parseJSON(reviewData.wins, []).map(String).filter(Boolean);
    const challenges = parseJSON(reviewData.habit_trends, {}).challenges || [];
    const lessons = parseJSON(reviewData.thought_patterns, {}).lessons || [];
    const priorities = parseJSON(reviewData.adjustments, []).map(String).filter(Boolean);

    return new Response(
      JSON.stringify({
        review_id: reviewData.review_id,
        cycle_id: reviewData.cycle_id,
        month: reviewData.month,
        wins,
        challenges: Array.isArray(challenges) ? challenges.map(String).filter(Boolean) : [],
        lessons: Array.isArray(lessons) ? lessons.map(String).filter(Boolean) : [],
        priorities,
        month_score: 5,
        habit_consistency: habitConsistency,
        cycle_progress_percent: cycleProgressPercent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in get-monthly-review:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
