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

// Calculate month_in_cycle (1, 2, or 3) based on cycle start date
function calculateMonthInCycle(cycleStartDate: string): number {
  const start = new Date(cycleStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Month 1: Days 0-29, Month 2: Days 30-59, Month 3: Days 60-89
  if (diffDays < 30) return 1;
  if (diffDays < 60) return 2;
  return 3;
}

// Get month date range for queries
function getMonthDateRange(cycleStartDate: string, monthInCycle: number): { startDate: string; endDate: string } {
  const start = new Date(cycleStartDate);
  
  const monthStart = new Date(start);
  monthStart.setDate(monthStart.getDate() + (monthInCycle - 1) * 30);
  
  const monthEnd = new Date(monthStart);
  monthEnd.setDate(monthEnd.getDate() + 29);
  
  return {
    startDate: monthStart.toISOString().split('T')[0],
    endDate: monthEnd.toISOString().split('T')[0],
  };
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

    // Get current cycle with full details
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
    const monthInCycle = calculateMonthInCycle(currentCycle.start_date);
    const { startDate: monthStartDate, endDate: monthEndDate } = getMonthDateRange(currentCycle.start_date, monthInCycle);

    // Get cycle month plan for current month focus
    const { data: monthPlanData } = await supabaseClient
      .from('cycle_month_plans')
      .select('main_focus, projects_text, sales_promos_text')
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('month_number', monthInCycle)
      .maybeSingle();

    // Try to get existing monthly review
    const { data: existingReview } = await supabaseClient
      .from('monthly_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('month_in_cycle', monthInCycle)
      .maybeSingle();

    let reviewData = existingReview;

    // Auto-create if missing
    if (!reviewData) {
      console.log('Auto-creating monthly review for month_in_cycle:', monthInCycle);
      const { data: newReview, error: insertError } = await supabaseClient
        .from('monthly_reviews')
        .insert({
          user_id: userId,
          cycle_id: currentCycle.cycle_id,
          month: new Date().getMonth() + 1,
          month_in_cycle: monthInCycle,
          wins: null,
          challenges: [],
          lessons: [],
          next_month_priorities: [],
          month_score: 5,
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
      console.log('Monthly review auto-created successfully');
    }

    // ==================== EXECUTION SUMMARY METRICS ====================
    
    // Total tasks scheduled this month (cycle-linked)
    const { count: tasksScheduledCount } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .gte('scheduled_date', monthStartDate)
      .lte('scheduled_date', monthEndDate);

    // Completed tasks this month
    const { count: tasksCompletedCount } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('is_completed', true)
      .gte('completed_at', monthStartDate)
      .lte('completed_at', monthEndDate + 'T23:59:59Z');

    // Tasks rescheduled 3+ times
    const { count: tasksRescheduled3Plus } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .gte('reschedule_count_30d', 3);

    // Content tasks completed
    const { count: contentTasksCompleted } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('is_completed', true)
      .eq('category', 'content')
      .gte('completed_at', monthStartDate)
      .lte('completed_at', monthEndDate + 'T23:59:59Z');

    // Nurture tasks completed  
    const { count: nurtureTasksCompleted } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('is_completed', true)
      .eq('category', 'nurture')
      .gte('completed_at', monthStartDate)
      .lte('completed_at', monthEndDate + 'T23:59:59Z');

    // Offer tasks completed
    const { count: offerTasksCompleted } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cycle_id', currentCycle.cycle_id)
      .eq('is_completed', true)
      .eq('category', 'offer')
      .gte('completed_at', monthStartDate)
      .lte('completed_at', monthEndDate + 'T23:59:59Z');

    // Calculate habit consistency for the month
    const { data: habitLogs } = await supabaseClient
      .from('habit_logs')
      .select('completed')
      .eq('user_id', userId)
      .gte('date', monthStartDate)
      .lte('date', monthEndDate);

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

    // Generate suggested wins from execution summary
    const suggestedWins: string[] = [];
    if ((contentTasksCompleted || 0) > 0) {
      suggestedWins.push(`Completed ${contentTasksCompleted} content tasks this month`);
    }
    if ((nurtureTasksCompleted || 0) > 0) {
      suggestedWins.push(`Completed ${nurtureTasksCompleted} nurture activities`);
    }
    if ((offerTasksCompleted || 0) > 0) {
      suggestedWins.push(`Made ${offerTasksCompleted} offers/sales activities`);
    }
    if (habitConsistency >= 70) {
      suggestedWins.push(`Maintained ${habitConsistency}% habit consistency`);
    }

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
      return Array.isArray(value) ? value : fallback;
    };

    // Handle wins - could be text or array
    let wins = [];
    if (reviewData.wins) {
      if (typeof reviewData.wins === 'string') {
        wins = [reviewData.wins].filter(Boolean);
      } else {
        wins = parseJSON(reviewData.wins, []);
      }
    }
    
    const challenges = parseJSON(reviewData.challenges, []).map(String).filter(Boolean);
    const lessons = parseJSON(reviewData.lessons, []).map(String).filter(Boolean);
    const priorities = parseJSON(reviewData.next_month_priorities, []).map(String).filter(Boolean);

    return new Response(
      JSON.stringify({
        review_id: reviewData.review_id,
        cycle_id: reviewData.cycle_id,
        month: reviewData.month,
        month_in_cycle: monthInCycle,
        cycle_goal: currentCycle.goal,
        month_focus: monthPlanData?.main_focus || null,
        month_projects: monthPlanData?.projects_text || null,
        
        // Reflection data
        wins,
        challenges,
        lessons,
        priorities,
        month_score: reviewData.month_score || 5,
        
        // Execution summary
        execution_summary: {
          tasks_scheduled: tasksScheduledCount || 0,
          tasks_completed: tasksCompletedCount || 0,
          tasks_rescheduled_3plus: tasksRescheduled3Plus || 0,
          content_tasks_completed: contentTasksCompleted || 0,
          nurture_tasks_completed: nurtureTasksCompleted || 0,
          offer_tasks_completed: offerTasksCompleted || 0,
          habit_consistency: habitConsistency,
        },
        
        suggested_wins: suggestedWins,
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
