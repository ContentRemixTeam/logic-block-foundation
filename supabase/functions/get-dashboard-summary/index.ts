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
    let { data: cycleData } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    console.log('CYCLE RPC RESULT:', {
      hasCycleData: Boolean(cycleData),
      cycleDataLength: cycleData?.length,
      firstCycleId: cycleData?.[0]?.cycle_id,
    });

    // FALLBACK: If RPC returned no current cycle, try direct query to find any cycle
    if (!cycleData || cycleData.length === 0) {
      console.warn('⚠️ get_current_cycle RPC returned no data, trying direct query...');
      
      const { data: directCycles, error: directError } = await supabaseClient
        .from('cycles_90_day')
        .select('cycle_id, goal, start_date, end_date, why, identity, target_feeling')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (directError) {
        console.error('Direct cycle query failed:', directError);
      } else if (directCycles && directCycles.length > 0) {
        console.log('✅ Found cycle via direct query that RPC missed!', {
          cycleId: directCycles[0].cycle_id,
          goal: directCycles[0].goal?.substring(0, 30)
        });
        // Transform to match RPC output format and use as current cycle
        cycleData = directCycles.map(c => ({
          cycle_id: c.cycle_id,
          goal: c.goal,
          start_date: c.start_date,
          end_date: c.end_date,
          why: c.why,
          identity: c.identity,
          target_feeling: c.target_feeling,
          days_remaining: Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        }));
      } else {
        console.log('ℹ️ No cycles found for user via direct query either');
      }
    }

    let focusArea = null;
    let thingsToRemember: any[] = [];
    let diagnosticScores = { discover: null as number | null, nurture: null as number | null, convert: null as number | null };
    let revenueData = { goal: null as number | null, current: 0 };
    let identityData = { identity: null as string | null, why: null as string | null, feeling: null as string | null };
    let audienceData = { target: null as string | null, frustration: null as string | null, message: null as string | null };
    let weeklyReviewStatus = { exists: false, score: null as number | null };
    let monthlyReviewStatus = { exists: false, score: null as number | null, wins_count: 0 };
    let cycleSummaryStatus = { exists: false, is_complete: false, score: null as number | null, wins_count: 0 };

    // Success metrics data
    let metricsData = { 
      metric1_name: null as string | null, 
      metric1_start: null as number | null,
      metric2_name: null as string | null, 
      metric2_start: null as number | null,
      metric3_name: null as string | null, 
      metric3_start: null as number | null,
    };

    if (cycleData && cycleData.length > 0) {
      const currentCycle = cycleData[0];

      // Fetch full cycle data including all fields + metrics
      const { data: fullCycleData } = await supabaseClient
        .from('cycles_90_day')
        .select('focus_area, things_to_remember, discover_score, nurture_score, convert_score, identity, why, target_feeling, audience_target, audience_frustration, signature_message, office_hours_start, office_hours_end, office_hours_days, weekly_planning_day, weekly_debrief_day, metric_1_name, metric_1_start, metric_2_name, metric_2_start, metric_3_name, metric_3_start, start_date, day1_top3, day2_top3, day3_top3')
        .eq('cycle_id', currentCycle.cycle_id)
        .maybeSingle();
      
      focusArea = fullCycleData?.focus_area || null;
      thingsToRemember = fullCycleData?.things_to_remember || [];
      diagnosticScores = {
        discover: fullCycleData?.discover_score || null,
        nurture: fullCycleData?.nurture_score || null,
        convert: fullCycleData?.convert_score || null,
      };
      identityData = {
        identity: fullCycleData?.identity || null,
        why: fullCycleData?.why || null,
        feeling: fullCycleData?.target_feeling || null,
      };
      audienceData = {
        target: fullCycleData?.audience_target || null,
        frustration: fullCycleData?.audience_frustration || null,
        message: fullCycleData?.signature_message || null,
      };
      
      // Set metrics data
      metricsData = {
        metric1_name: fullCycleData?.metric_1_name || null,
        metric1_start: fullCycleData?.metric_1_start || null,
        metric2_name: fullCycleData?.metric_2_name || null,
        metric2_start: fullCycleData?.metric_2_start || null,
        metric3_name: fullCycleData?.metric_3_name || null,
        metric3_start: fullCycleData?.metric_3_start || null,
      };

      // Fetch revenue plan data
      const { data: revenuePlanData } = await supabaseClient
        .from('cycle_revenue_plan')
        .select('revenue_goal')
        .eq('cycle_id', currentCycle.cycle_id)
        .maybeSingle();

      if (revenuePlanData?.revenue_goal) {
        revenueData.goal = revenuePlanData.revenue_goal;
      }
      
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

    // Extract office hours data
    const officeHoursData = cycleData && cycleData.length > 0 ? {
      office_hours_start: (await supabaseClient.from('cycles_90_day').select('office_hours_start').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.office_hours_start || null,
      office_hours_end: (await supabaseClient.from('cycles_90_day').select('office_hours_end').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.office_hours_end || null,
      office_hours_days: (await supabaseClient.from('cycles_90_day').select('office_hours_days').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.office_hours_days || null,
      weekly_planning_day: (await supabaseClient.from('cycles_90_day').select('weekly_planning_day').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.weekly_planning_day || null,
      weekly_debrief_day: (await supabaseClient.from('cycles_90_day').select('weekly_debrief_day').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.weekly_debrief_day || null,
    } : {
      office_hours_start: null,
      office_hours_end: null,
      office_hours_days: null,
      weekly_planning_day: null,
      weekly_debrief_day: null,
    };

    // First 3 days data for new cycle checklist
    const first3DaysData = cycleData && cycleData.length > 0 ? {
      start_date: (await supabaseClient.from('cycles_90_day').select('start_date').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.start_date || null,
      day1_top3: (await supabaseClient.from('cycles_90_day').select('day1_top3').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.day1_top3 || [],
      day2_top3: (await supabaseClient.from('cycles_90_day').select('day2_top3').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.day2_top3 || [],
      day3_top3: (await supabaseClient.from('cycles_90_day').select('day3_top3').eq('cycle_id', cycleData[0].cycle_id).maybeSingle()).data?.day3_top3 || [],
    } : {
      start_date: null,
      day1_top3: [],
      day2_top3: [],
      day3_top3: [],
    };

    // Merge all data into cycle data
    const enhancedData = {
      ...data,
      cycle: {
        ...(data?.cycle || {}),
        focus_area: focusArea,
        things_to_remember: thingsToRemember,
        diagnostic_scores: diagnosticScores,
        identity_data: identityData,
        audience_data: audienceData,
        ...officeHoursData,
      },
      revenue: revenueData,
      weekly_review_status: weeklyReviewStatus,
      monthly_review_status: monthlyReviewStatus,
      cycle_summary_status: cycleSummaryStatus,
      metrics: metricsData,
      first_3_days: first3DaysData,
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