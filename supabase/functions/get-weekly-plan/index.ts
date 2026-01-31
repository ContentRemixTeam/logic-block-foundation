import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('EDGE FUNC: get-weekly-plan called');

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
    console.log('Getting weekly plan for user:', userId);

    // Use service role for database operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current cycle
    const { data: cycleData, error: cycleError } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
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

    // Fetch full cycle data to get metric names and additional data
    const { data: cycleMetricsData } = await supabaseClient
      .from('cycles_90_day')
      .select('*, biggest_bottleneck, discover_score, nurture_score, convert_score')
      .eq('cycle_id', currentCycle.cycle_id)
      .maybeSingle();

    const cycleMetrics = {
      metric_1_name: cycleMetricsData?.metric_1_name || null,
      metric_2_name: cycleMetricsData?.metric_2_name || null,
      metric_3_name: cycleMetricsData?.metric_3_name || null,
    };

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

      // Fetch full week data including metric targets, goal_rewrite, and new worksheet fields
      const { data: fullWeekData } = await supabaseClient
        .from('weekly_plans')
        .select('metric_1_target, metric_2_target, metric_3_target, challenges, adjustments, goal_rewrite, weekly_scratch_pad, goal_checkin_notes, alignment_reflection, alignment_rating')
        .eq('week_id', week.week_id)
        .maybeSingle();
      
      // Fetch previous week's data for autofill and carry-over
      const previousWeekStart = new Date(week.start_of_week);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekStr = previousWeekStart.toISOString().split('T')[0];
      
      const { data: previousWeekData } = await supabaseClient
        .from('weekly_plans')
        .select('week_id, goal_rewrite, top_3_priorities')
        .eq('user_id', userId)
        .eq('start_of_week', previousWeekStr)
        .maybeSingle();
      
      // Fetch full cycle data for CycleSnapshotCard
      const { data: fullCycleData } = await supabaseClient
        .from('cycles_90_day')
        .select('*')
        .eq('cycle_id', currentCycle.cycle_id)
        .single();
      
      // Calculate weekly summary
      const weekStart = new Date(week.start_of_week);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekStartStr = week.start_of_week;
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      // Count daily plans for this week
      const { count: dailyPlansCount } = await supabaseClient
        .from('daily_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('week_id', week.week_id);
      
      // Calculate habit completion for this week
      const { data: habits } = await supabaseClient
        .from('habits')
        .select('habit_id, habit_name')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      const totalHabits = (habits?.length || 0) * 7;
      
      const { data: habitLogs } = await supabaseClient
        .from('habit_logs')
        .select('log_id, habit_id, date, completed')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);
      
      const completedHabits = habitLogs?.filter(h => h.completed)?.length || 0;
      const habitPercent = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
      
      // Check if review exists
      const { data: reviewData } = await supabaseClient
        .from('weekly_reviews')
        .select('review_id')
        .eq('user_id', userId)
        .eq('week_id', week.week_id)
        .maybeSingle();
      
      // Fetch metric actuals from recent weekly reviews for trend calculation (13 weeks for full cycle)
      const { data: recentReviews } = await supabaseClient
        .from('weekly_reviews')
        .select('week_id, metric_1_actual, metric_2_actual, metric_3_actual, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(13);
      
      // Get the most recent metric actuals for current values
      const latestReview = recentReviews?.[0];
      const previousReview = recentReviews?.[1];
      
      // Helper function to calculate percent change
      const calculatePercentChange = (current: number | null, previous: number | null): number | null => {
        if (current === null || previous === null || previous === 0) return null;
        return Math.round(((current - previous) / previous) * 100);
      };
      
      // Calculate metric trends with percent change
      const metricTrends = {
        metric_1: {
          current: latestReview?.metric_1_actual ?? fullCycleData?.metric_1_start ?? null,
          previous: previousReview?.metric_1_actual ?? null,
          start: fullCycleData?.metric_1_start ?? null,
          goal: fullCycleData?.metric_1_goal ?? null,
          history: recentReviews?.map(r => r.metric_1_actual).reverse() ?? [],
          percentChange: calculatePercentChange(
            latestReview?.metric_1_actual ?? null,
            previousReview?.metric_1_actual ?? null
          ),
        },
        metric_2: {
          current: latestReview?.metric_2_actual ?? fullCycleData?.metric_2_start ?? null,
          previous: previousReview?.metric_2_actual ?? null,
          start: fullCycleData?.metric_2_start ?? null,
          goal: fullCycleData?.metric_2_goal ?? null,
          history: recentReviews?.map(r => r.metric_2_actual).reverse() ?? [],
          percentChange: calculatePercentChange(
            latestReview?.metric_2_actual ?? null,
            previousReview?.metric_2_actual ?? null
          ),
        },
        metric_3: {
          current: latestReview?.metric_3_actual ?? fullCycleData?.metric_3_start ?? null,
          previous: previousReview?.metric_3_actual ?? null,
          start: fullCycleData?.metric_3_start ?? null,
          goal: fullCycleData?.metric_3_goal ?? null,
          history: recentReviews?.map(r => r.metric_3_actual).reverse() ?? [],
          percentChange: calculatePercentChange(
            latestReview?.metric_3_actual ?? null,
            previousReview?.metric_3_actual ?? null
          ),
        },
      };
      
      // Calculate week number in cycle (1-13)
      const cycleStart = new Date(fullCycleData?.start_date || '');
      const weekNumber = Math.floor((weekStart.getTime() - cycleStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      // ============ NEW: Enhanced Data for Context Pull & Execution Summary ============
      
      // 1. Get content created this week
      const { data: contentData } = await supabaseClient
        .from('content_log')
        .select('platform')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);
      
      // 1b. Query launches for this cycle to determine launch status
      const { data: launchesData } = await supabaseClient
        .from('launches')
        .select('id, name, cart_opens, cart_closes, status')
        .eq('user_id', userId)
        .eq('cycle_id', currentCycle.cycle_id)
        .gte('cart_closes', weekStartStr)
        .order('cart_opens', { ascending: true });
      
      // Determine launch status dynamically
      let launchStatus: 'none' | 'approaching' | 'this_week' = 'none';
      if (launchesData && launchesData.length > 0) {
        const weekEndDate = weekEnd;
        
        for (const launch of launchesData) {
          const cartOpens = new Date(launch.cart_opens);
          const cartCloses = new Date(launch.cart_closes);
          
          // Check if cart opens this week or is currently open
          if ((cartOpens >= weekStart && cartOpens <= weekEndDate) || 
              (cartOpens <= weekEndDate && cartCloses >= weekStart)) {
            launchStatus = 'this_week';
            break;
          } else if (cartOpens > weekEndDate && cartOpens <= new Date(weekEndDate.getTime() + 14 * 24 * 60 * 60 * 1000)) {
            // Within 2 weeks approaching
            launchStatus = 'approaching';
          }
        }
      }
      
      // 1c. Query focus area actions (tasks tagged with focus area)
      const focusArea = fullCycleData?.focus_area?.toLowerCase() || '';
      const { data: focusAreaTasks } = await supabaseClient
        .from('tasks')
        .select('id, task_text, status, tags, category')
        .eq('user_id', userId)
        .gte('scheduled_date', weekStartStr)
        .lte('scheduled_date', weekEndStr);
      
      // Filter tasks by focus area (check tags or category)
      const focusActions = focusAreaTasks
        ?.filter(task => {
          if (!focusArea) return false;
          const taskTags = (task.tags || []).map((t: string) => String(t).toLowerCase());
          const taskCategory = (task.category || '').toLowerCase();
          return taskTags.includes(focusArea) || 
                 taskTags.includes('discover') || 
                 taskTags.includes('nurture') || 
                 taskTags.includes('convert') ||
                 taskCategory.includes(focusArea);
        })
        .map(task => ({
          title: task.task_text,
          completed: task.status === 'done',
        })) || [];
      
      // Aggregate content by platform
      const contentByPlatform: { platform: string; count: number }[] = [];
      if (contentData) {
        const platformCounts = contentData.reduce((acc, item) => {
          acc[item.platform] = (acc[item.platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        Object.entries(platformCounts).forEach(([platform, count]) => {
          contentByPlatform.push({ platform, count });
        });
      }
      
      // 2. Get offers and sales this week
      const { data: salesData } = await supabaseClient
        .from('sales_log')
        .select('amount, date')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);
      
      // Count offers from daily_plans (made_offer flag)
      const { data: dailyOffersData } = await supabaseClient
        .from('daily_plans')
        .select('date, made_offer')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);
      
      const offersCount = dailyOffersData?.filter(d => d.made_offer)?.length || 0;
      const salesCount = salesData?.length || 0;
      const revenue = salesData?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      
      // Calculate offer streak (consecutive days with offer)
      let streak = 0;
      if (dailyOffersData) {
        const sortedDays = [...dailyOffersData]
          .filter(d => d.made_offer)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const today = new Date();
        for (let i = 0; i < sortedDays.length; i++) {
          const dayDate = new Date(sortedDays[i].date);
          const expectedDate = new Date(today);
          expectedDate.setDate(expectedDate.getDate() - i);
          
          if (dayDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            streak++;
          } else {
            break;
          }
        }
      }
      
      // 3. Get task execution stats for this week
      const { data: taskStats } = await supabaseClient
        .from('tasks')
        .select('priority, status')
        .eq('user_id', userId)
        .gte('scheduled_date', weekStartStr)
        .lte('scheduled_date', weekEndStr);
      
      // Priority tasks (priority = true or priority 1-3)
      const priorityTasks = taskStats?.filter(t => t.priority === true || (typeof t.priority === 'number' && t.priority <= 3)) || [];
      const priorityCompleted = priorityTasks.filter(t => t.status === 'done').length;
      const priorityTotal = priorityTasks.length;
      
      // Strategic tasks (non-priority)
      const strategicTasks = taskStats?.filter(t => t.priority !== true && (typeof t.priority !== 'number' || t.priority > 3)) || [];
      const strategicCompleted = strategicTasks.filter(t => t.status === 'done').length;
      const strategicTotal = strategicTasks.length;
      
      // 4. Get daily alignment scores for the week
      const { data: alignmentData } = await supabaseClient
        .from('daily_plans')
        .select('alignment_score, date')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
        .not('alignment_score', 'is', null);
      
      const alignmentScores = alignmentData?.map(d => d.alignment_score).filter((s): s is number => s !== null) || [];
      const weeklyAlignmentAverage = alignmentScores.length > 0 
        ? Math.round((alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length) * 10) / 10 
        : null;
      
      // 5. Get CTFAR sessions from this week
      const { data: ctfarData } = await supabaseClient
        .from('ctfar')
        .select('thought, date, circumstance')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
        .order('date', { ascending: false })
        .limit(1);
      
      const previousCTFAR = ctfarData?.[0] ? {
        thought: ctfarData[0].thought,
        date: ctfarData[0].date,
        circumstance: ctfarData[0].circumstance,
      } : null;
      
      // 6. Build habit grid data
      const habitGrid: { habitName: string; habitId: string; days: boolean[] }[] = [];
      if (habits && habitLogs) {
        habits.forEach(habit => {
          const days: boolean[] = [];
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const dayStr = dayDate.toISOString().split('T')[0];
            const log = habitLogs.find(l => l.habit_id === habit.habit_id && l.date === dayStr);
            days.push(log?.completed || false);
          }
          habitGrid.push({
            habitName: habit.habit_name,
            habitId: habit.habit_id,
            days,
          });
        });
      }
      
      // 7. Get revenue plan for quarterly targets
      const { data: revenuePlan } = await supabaseClient
        .from('cycle_revenue_plan')
        .select('revenue_goal, sales_needed, price_per_sale')
        .eq('cycle_id', currentCycle.cycle_id)
        .maybeSingle();
      
      // 8. Get quarterly actuals (sales/revenue for whole cycle)
      const cycleStartStr = fullCycleData?.start_date;
      const cycleEndStr = fullCycleData?.end_date;
      
      const { data: cycleSalesData } = await supabaseClient
        .from('sales_log')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', cycleStartStr)
        .lte('date', cycleEndStr);
      
      const cycleRevenue = cycleSalesData?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      const cycleSalesCount = cycleSalesData?.length || 0;
      
      // Count offers for the cycle
      const { data: cycleOffersData } = await supabaseClient
        .from('daily_plans')
        .select('made_offer')
        .eq('user_id', userId)
        .gte('date', cycleStartStr)
        .lte('date', cycleEndStr);
      
      const cycleOffersCount = cycleOffersData?.filter(d => d.made_offer)?.length || 0;
      
      // ============ END: Enhanced Data ============
      
      return new Response(
        JSON.stringify({ 
          data: {
            week_id: week.week_id,
            start_of_week: week.start_of_week,
            top_3_priorities: week.top_3_priorities || [],
            weekly_thought: week.weekly_thought || '',
            weekly_feeling: week.weekly_feeling || '',
            challenges: fullWeekData?.challenges || null,
            adjustments: fullWeekData?.adjustments || null,
            weekly_summary: {
              daily_plans_completed: dailyPlansCount || 0,
              habit_completion_percent: habitPercent,
              review_completed: Boolean(reviewData),
            },
            cycle_metrics: cycleMetrics,
            metric_1_target: fullWeekData?.metric_1_target || null,
            metric_2_target: fullWeekData?.metric_2_target || null,
            metric_3_target: fullWeekData?.metric_3_target || null,
            // Goal rewrite fields
            goal_rewrite: fullWeekData?.goal_rewrite || '',
            previous_goal_rewrite: previousWeekData?.goal_rewrite || '',
            cycle_goal: fullCycleData?.goal || '',
            // Last week's priorities for carry-over
            last_week_priorities: previousWeekData?.top_3_priorities || [],
            last_week_id: previousWeekData?.week_id || null,
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
              metric_1_goal: fullCycleData.metric_1_goal,
              metric_2_name: fullCycleData.metric_2_name,
              metric_2_start: fullCycleData.metric_2_start,
              metric_2_goal: fullCycleData.metric_2_goal,
              metric_3_name: fullCycleData.metric_3_name,
              metric_3_start: fullCycleData.metric_3_start,
              metric_3_goal: fullCycleData.metric_3_goal,
              biggest_bottleneck: fullCycleData.biggest_bottleneck,
              discover_score: fullCycleData.discover_score,
              nurture_score: fullCycleData.nurture_score,
              convert_score: fullCycleData.convert_score,
            } : null,
            // New worksheet fields
            weekly_scratch_pad: fullWeekData?.weekly_scratch_pad || '',
            goal_checkin_notes: fullWeekData?.goal_checkin_notes || '',
            alignment_reflection: fullWeekData?.alignment_reflection || '',
            alignment_rating: fullWeekData?.alignment_rating ?? null,
            // Cycle analytics
            week_number: weekNumber,
            metric_trends: metricTrends,
            
            // ============ NEW: Enhanced Data ============
            // Context Pull data
            context_pull: {
              quarter_stats: {
                revenue_goal: revenuePlan?.revenue_goal ?? null,
                revenue_actual: cycleRevenue,
                sales_goal: revenuePlan?.sales_needed ?? null,
                sales_actual: cycleSalesCount,
                offers_goal: revenuePlan?.sales_needed ?? 90, // Use sales_needed as offers goal, fallback to 90
                offers_actual: cycleOffersCount,
              },
              execution_stats: {
                tasks_completed: priorityCompleted + strategicCompleted,
                tasks_total: priorityTotal + strategicTotal,
                habit_percent: habitPercent,
                alignment_average: weeklyAlignmentAverage,
              },
              bottleneck: fullCycleData?.biggest_bottleneck ?? null,
              launch_status: launchStatus,
            },
            // Execution Summary data
            execution_summary: {
              content_by_platform: contentByPlatform,
              offers_sales: {
                offers_count: offersCount,
                sales_count: salesCount,
                revenue: revenue,
                streak: streak,
              },
              task_execution: {
                priority_completed: priorityCompleted,
                priority_total: priorityTotal,
                strategic_completed: strategicCompleted,
                strategic_total: strategicTotal,
              },
              habit_grid: habitGrid,
            },
            // Focus area data (NEW)
            focus_area_data: {
              focus_actions: focusActions,
            },
            // CTFAR data
            previous_ctfar: previousCTFAR,
            weekly_alignment_average: weeklyAlignmentAverage,
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

    // First check if a week already exists (race condition check)
    const { data: existingWeek } = await supabaseClient
      .from('weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('start_of_week', startOfWeek)
      .maybeSingle();

    let newWeek = existingWeek;

    if (!existingWeek) {
      // Create new week
      const { data: createdWeek, error: insertError } = await supabaseClient
        .from('weekly_plans')
        .insert({
          user_id: userId,
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
        // If insert failed due to duplicate, try fetching again
        const { data: refetchedWeek, error: refetchError } = await supabaseClient
          .from('weekly_plans')
          .select('*')
          .eq('user_id', userId)
          .eq('cycle_id', currentCycle.cycle_id)
          .eq('start_of_week', startOfWeek)
          .maybeSingle();

        if (refetchError || !refetchedWeek) {
          throw insertError;
        }
        newWeek = refetchedWeek;
      } else {
        newWeek = createdWeek;
      }
    }

    if (!newWeek) {
      throw new Error('Failed to create or fetch weekly plan');
    }

    console.log('Returning week:', newWeek.week_id);

    return new Response(
      JSON.stringify({ 
        data: {
          week_id: newWeek.week_id,
          start_of_week: newWeek.start_of_week,
          top_3_priorities: newWeek.top_3_priorities || [],
          weekly_thought: newWeek.weekly_thought || '',
          weekly_feeling: newWeek.weekly_feeling || '',
          challenges: null,
          adjustments: null,
          weekly_summary: {
            daily_plans_completed: 0,
            habit_completion_percent: 0,
            review_completed: false,
          },
          cycle_metrics: cycleMetrics,
          metric_1_target: null,
          metric_2_target: null,
          metric_3_target: null,
          // Default empty enhanced data for new week
          context_pull: {
            quarter_stats: { revenue_goal: null, revenue_actual: 0, sales_goal: null, sales_actual: 0, offers_goal: 90, offers_actual: 0 },
            execution_stats: { tasks_completed: 0, tasks_total: 0, habit_percent: 0, alignment_average: null },
            bottleneck: null,
            launch_status: 'none',
          },
          execution_summary: {
            content_by_platform: [],
            offers_sales: { offers_count: 0, sales_count: 0, revenue: 0, streak: 0 },
            task_execution: { priority_completed: 0, priority_total: 0, strategic_completed: 0, strategic_total: 0 },
            habit_grid: [],
          },
          focus_area_data: {
            focus_actions: [],
          },
          previous_ctfar: null,
          weekly_alignment_average: null,
          metric_trends: null,
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
