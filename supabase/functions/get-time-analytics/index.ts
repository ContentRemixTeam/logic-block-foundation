import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAuthenticatedUserId(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await authClient.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('[get-time-analytics] JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    
    if (authError || !userId) {
      return new Response(JSON.stringify({ error: authError || 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get date ranges
    const now = new Date();
    const thirteenWeeksAgo = new Date(now.getTime() - 13 * 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Weekly time data (last 13 weeks)
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('time_entries')
      .select('estimated_minutes, actual_minutes, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', thirteenWeeksAgo.toISOString())
      .order('logged_at', { ascending: true });

    if (weeklyError) {
      console.error('Error fetching weekly data:', weeklyError);
    }

    // Aggregate by week
    const weeklyTimeData: Record<string, { estimated: number; actual: number; count: number }> = {};
    
    (weeklyData || []).forEach((entry: any) => {
      const date = new Date(entry.logged_at);
      // Get Monday of that week
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!weeklyTimeData[weekKey]) {
        weeklyTimeData[weekKey] = { estimated: 0, actual: 0, count: 0 };
      }
      weeklyTimeData[weekKey].estimated += entry.estimated_minutes || 0;
      weeklyTimeData[weekKey].actual += entry.actual_minutes || 0;
      weeklyTimeData[weekKey].count += 1;
    });

    const weeklyTimeSummary = Object.entries(weeklyTimeData)
      .map(([weekStart, data]) => ({
        week_start: weekStart,
        estimated_minutes: data.estimated,
        actual_minutes: data.actual,
        task_count: data.count,
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));

    // 2. Project breakdown (last 30 days)
    const { data: projectData, error: projectError } = await supabase
      .from('time_entries')
      .select(`
        actual_minutes,
        task:tasks!inner(
          project_id,
          project:projects(
            id,
            name,
            color
          )
        )
      `)
      .eq('user_id', userId)
      .gte('logged_at', thirtyDaysAgo.toISOString());

    if (projectError) {
      console.error('Error fetching project data:', projectError);
    }

    const projectBreakdown: Record<string, { name: string; color: string; minutes: number; count: number }> = {};
    
    (projectData || []).forEach((entry: any) => {
      const projectId = entry.task?.project_id || 'no_project';
      const projectName = entry.task?.project?.name || 'No Project';
      const projectColor = entry.task?.project?.color || '#94A3B8';
      
      if (!projectBreakdown[projectId]) {
        projectBreakdown[projectId] = { name: projectName, color: projectColor, minutes: 0, count: 0 };
      }
      projectBreakdown[projectId].minutes += entry.actual_minutes || 0;
      projectBreakdown[projectId].count += 1;
    });

    const projectSummary = Object.entries(projectBreakdown)
      .map(([projectId, data]) => ({
        project_id: projectId,
        project_name: data.name,
        project_color: data.color,
        total_minutes: data.minutes,
        task_count: data.count,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);

    // 3. Tag breakdown (last 30 days)
    const { data: tagData, error: tagError } = await supabase
      .from('time_entries')
      .select(`
        actual_minutes,
        estimated_minutes,
        task:tasks!inner(
          context_tags
        )
      `)
      .eq('user_id', userId)
      .gte('logged_at', thirtyDaysAgo.toISOString());

    if (tagError) {
      console.error('Error fetching tag data:', tagError);
    }

    const tagBreakdown: Record<string, { minutes: number; estimated: number; count: number }> = {};
    
    (tagData || []).forEach((entry: any) => {
      const tags = entry.task?.context_tags || [];
      if (tags.length === 0) {
        const tag = 'untagged';
        if (!tagBreakdown[tag]) {
          tagBreakdown[tag] = { minutes: 0, estimated: 0, count: 0 };
        }
        tagBreakdown[tag].minutes += entry.actual_minutes || 0;
        tagBreakdown[tag].estimated += entry.estimated_minutes || 0;
        tagBreakdown[tag].count += 1;
      } else {
        tags.forEach((tag: string) => {
          if (!tagBreakdown[tag]) {
            tagBreakdown[tag] = { minutes: 0, estimated: 0, count: 0 };
          }
          tagBreakdown[tag].minutes += entry.actual_minutes || 0;
          tagBreakdown[tag].estimated += entry.estimated_minutes || 0;
          tagBreakdown[tag].count += 1;
        });
      }
    });

    const tagSummary = Object.entries(tagBreakdown)
      .map(([tag, data]) => ({
        tag,
        total_minutes: data.minutes,
        estimated_minutes: data.estimated,
        task_count: data.count,
        accuracy: data.estimated > 0 
          ? Math.round((1 - Math.abs(data.minutes - data.estimated) / data.estimated) * 100)
          : null,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);

    // 4. Recurring task averages (from view)
    const { data: recurringData, error: recurringError } = await supabase
      .from('recurring_task_averages')
      .select('*');

    if (recurringError) {
      console.error('Error fetching recurring averages:', recurringError);
    }

    // Get parent task names
    const parentIds = (recurringData || []).map((r: any) => r.parent_task_id).filter(Boolean);
    
    let recurringWithNames: any[] = [];
    if (parentIds.length > 0) {
      const { data: parentTasks } = await supabase
        .from('tasks')
        .select('task_id, task_text')
        .in('task_id', parentIds)
        .eq('user_id', userId);

      const taskMap = new Map((parentTasks || []).map((t: any) => [t.task_id, t.task_text]));
      
      recurringWithNames = (recurringData || [])
        .filter((r: any) => taskMap.has(r.parent_task_id))
        .map((r: any) => ({
          parent_task_id: r.parent_task_id,
          task_text: taskMap.get(r.parent_task_id),
          instance_count: r.instance_count,
          avg_actual_minutes: Math.round(r.avg_actual_minutes || 0),
          avg_estimated_minutes: Math.round(r.avg_estimated_minutes || 0),
        }))
        .sort((a: any, b: any) => b.instance_count - a.instance_count);
    }

    // 5. Accuracy metrics
    const allTimeEntries = weeklyData || [];
    let totalEstimated = 0;
    let totalActual = 0;
    
    allTimeEntries.forEach((entry: any) => {
      if (entry.estimated_minutes && entry.actual_minutes) {
        totalEstimated += entry.estimated_minutes;
        totalActual += entry.actual_minutes;
      }
    });

    let accuracyPercent = null;
    let tendency = 'accurate';
    let tendencyPercent = 0;

    if (totalEstimated > 0 && totalActual > 0) {
      const difference = totalActual - totalEstimated;
      tendencyPercent = Math.abs(Math.round((difference / totalEstimated) * 100));
      
      if (difference > totalEstimated * 0.1) {
        tendency = 'underestimate';
      } else if (difference < -totalEstimated * 0.1) {
        tendency = 'overestimate';
      }
      
      accuracyPercent = Math.max(0, Math.round((1 - Math.abs(difference) / totalEstimated) * 100));
    }

    // Find best and worst estimated tags
    const tagsWithAccuracy = tagSummary.filter(t => t.accuracy !== null);
    const bestTag = tagsWithAccuracy.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))[0];
    const worstTag = tagsWithAccuracy.sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0))[0];

    const accuracyMetrics = {
      overall_accuracy_percent: accuracyPercent,
      tendency,
      tendency_percent: tendencyPercent,
      total_estimated_minutes: totalEstimated,
      total_actual_minutes: totalActual,
      best_estimated_tag: bestTag?.tag || null,
      best_estimated_accuracy: bestTag?.accuracy || null,
      worst_estimated_tag: worstTag?.tag || null,
      worst_estimated_accuracy: worstTag?.accuracy || null,
    };

    return new Response(JSON.stringify({
      weeklyTimeData: weeklyTimeSummary,
      projectBreakdown: projectSummary,
      tagBreakdown: tagSummary,
      recurringTaskAverages: recurringWithNames,
      accuracyMetrics,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
