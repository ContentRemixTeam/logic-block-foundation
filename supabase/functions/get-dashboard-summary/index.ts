import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode JWT to get user ID (basic validation)
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
  console.log('EDGE FUNC: get-dashboard-summary called', {
    method: req.method,
    hasAuthHeader: Boolean(req.headers.get('Authorization')),
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header check:', {
      hasAuthHeader: Boolean(authHeader),
    });

    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract user ID from JWT
    const userId = getUserIdFromJWT(authHeader);
    console.log('User ID from JWT:', { userId: Boolean(userId) });

    if (!userId) {
      console.error('Invalid JWT or missing user ID');
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasUrl: Boolean(SUPABASE_URL),
      hasServiceKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client with user's JWT for auth context
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('Calling get_dashboard_summary RPC for user:', userId);
    const { data, error: rpcError } = await supabaseClient.rpc('get_dashboard_summary', {
      p_user_id: userId,
    });

    console.log('RPC result:', {
      hasData: Boolean(data),
      dataType: typeof data,
      error: rpcError?.message,
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return new Response(
        JSON.stringify({ error: rpcError.message || 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get current cycle and week to check review status
    const { data: cycleData } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    let weeklyReviewStatus = { exists: false, score: null };

    if (cycleData && cycleData.length > 0) {
      const { data: weekData } = await supabaseClient.rpc('get_current_week', {
        p_cycle_id: cycleData[0].cycle_id,
      });

      if (weekData && weekData.length > 0) {
        const { data: reviewData } = await supabaseClient
          .from('weekly_reviews')
          .select('habit_summary')
          .eq('user_id', userId)
          .eq('week_id', weekData[0].week_id)
          .maybeSingle();

        if (reviewData?.habit_summary) {
          weeklyReviewStatus = {
            exists: true,
            score: reviewData.habit_summary.weekly_score || null,
          };
        }
      }
    }

    console.log('Dashboard summary fetched successfully');

    return new Response(JSON.stringify({ 
      data: {
        ...data,
        weekly_review_status: weeklyReviewStatus,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('CATCH ERROR in get-dashboard-summary:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
