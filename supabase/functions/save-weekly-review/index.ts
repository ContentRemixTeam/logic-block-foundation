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
    console.log('EDGE FUNC: save-weekly-review called');

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

    const body = await req.json();
    const { 
      week_id, wins, challenges, lessons, intentions, weekly_score, focus_reflection, 
      metric_1_actual, metric_2_actual, metric_3_actual, metric_4_actual, metric_5_actual,
      share_to_community, goal_support 
    } = body;

    console.log('Save request:', { week_id, userId, hasWins: Boolean(wins) });

    if (!week_id) {
      return new Response(JSON.stringify({ error: 'week_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize arrays
    const normalizedWins = Array.isArray(wins) ? wins.map(String).filter(Boolean) : [];
    const normalizedChallenges = Array.isArray(challenges) ? challenges.map(String).filter(Boolean) : [];
    const normalizedLessons = Array.isArray(lessons) ? lessons.map(String).filter(Boolean) : [];
    const normalizedIntentions = Array.isArray(intentions) ? intentions.map(String).filter(Boolean) : [];
    const normalizedScore = typeof weekly_score === 'number' ? Math.max(0, Math.min(10, weekly_score)) : 0;

    const reviewData = {
      wins: normalizedWins,
      challenges: normalizedChallenges,
      lessons: normalizedLessons,
      intentions: normalizedIntentions,
      weekly_score: normalizedScore,
      focus_reflection: focus_reflection || '',
      goal_support: goal_support || '',
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Update or insert review with all 5 metrics
    const { error: upsertError } = await supabase
      .from('weekly_reviews')
      .upsert({
        user_id: userId,
        week_id: week_id,
        habit_summary: reviewData,
        wins: normalizedWins.join('\n'),
        challenges: normalizedChallenges.join('\n'),
        adjustments: normalizedIntentions.join('\n'),
        metric_1_actual: metric_1_actual ?? null,
        metric_2_actual: metric_2_actual ?? null,
        metric_3_actual: metric_3_actual ?? null,
        metric_4_actual: metric_4_actual ?? null,
        metric_5_actual: metric_5_actual ?? null,
        share_to_community: share_to_community ?? false,
        goal_support: goal_support || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,week_id',
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save review' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Review saved successfully with metrics 1-5');

    return new Response(JSON.stringify({ success: true }), {
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