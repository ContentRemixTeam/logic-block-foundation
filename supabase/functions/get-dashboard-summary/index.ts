import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log('Auth header check:', { hasAuthHeader: Boolean(authHeader) });

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('Environment check:', {
      hasUrl: Boolean(supabaseUrl),
      hasServiceKey: Boolean(supabaseServiceKey),
    });

    // Create service role client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the token by getting the user with the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Invalid JWT token:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log('User ID validated:', { userId: Boolean(userId) });

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

    let focusArea = null;
    let thingsToRemember: any[] = [];
    let weeklyReviewStatus = { exists: false, score: null as number | null };
    let monthlyReviewStatus = { exists: false, score: null as number | null, wins_count: 0 };
    let cycleSummaryStatus = { exists: false, is_complete: false, score: null as number | null, wins_count: 0 };

    if (cycleData && cycleData.length > 0) {
      const currentCycle = cycleData[0];

      // Fetch full cycle data including focus_area and things_to_remember
      const { data: fullCycleData } = await supabaseClient
        .from('cycles_90_day')
        .select('focus_area, things_to_remember')
        .eq('cycle_id', currentCycle.cycle_id)
        .maybeSingle();
      
      focusArea = fullCycleData?.focus_area || null;
      thingsToRemember = fullCycleData?.things_to_remember || [];
      
      // Check weekly review
      const { data: weekData } = await supabaseClient.rpc('get_current_week', {
        p_cycle_id: currentCycle.cycle_id,
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

      // Check monthly review
      const currentMonth = new Date().getMonth() + 1;
      const { data: monthlyData } = await supabaseClient
        .from('monthly_reviews')
        .select('wins, habit_trends')
        .eq('user_id', userId)
        .eq('cycle_id', currentCycle.cycle_id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (monthlyData) {
        const parseJSON = (value: any, fallback: any) => {
          if (!value) return fallback;
          try {
            return typeof value === 'string' ? JSON.parse(value) : value;
          } catch {
            return fallback;
          }
        };
        const wins = parseJSON(monthlyData.wins, []);
        monthlyReviewStatus = {
          exists: true,
          score: null,
          wins_count: Array.isArray(wins) ? wins.filter(Boolean).length : 0,
        };
      }

      // Check cycle summary (if cycle is complete)
      const today = new Date();
      const endDate = new Date(currentCycle.end_date);
      const isCycleComplete = today > endDate;

      if (isCycleComplete) {
        const parseJSON = (value: any, fallback: any) => {
          if (!value) return fallback;
          try {
            return typeof value === 'string' ? JSON.parse(value) : value;
          } catch {
            return fallback;
          }
        };

        const summaryData = parseJSON(currentCycle.supporting_projects, {});
        const hasSummary = summaryData.cycle_score !== undefined || summaryData.identity_shifts;

        cycleSummaryStatus = {
          exists: hasSummary,
          is_complete: true,
          score: summaryData.cycle_score !== undefined ? Number(summaryData.cycle_score) : null,
          wins_count: 0,
        };
      }
    }

    console.log('Dashboard summary fetched successfully');

    // Merge focus_area and things_to_remember into cycle data
    const enhancedData = {
      ...data,
      cycle: {
        ...(data?.cycle || {}),
        focus_area: focusArea,
        things_to_remember: thingsToRemember,
      },
      weekly_review_status: weeklyReviewStatus,
      monthly_review_status: monthlyReviewStatus,
      cycle_summary_status: cycleSummaryStatus,
    };

    return new Response(JSON.stringify({ 
      data: enhancedData
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