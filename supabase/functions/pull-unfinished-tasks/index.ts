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

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await authClient.auth.getUser();
  
  if (error || !user) {
    console.error('JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: user.id, error: null };
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

    // Calculate date range: 7 days ago to today
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    console.log(`Pulling unfinished tasks from ${sevenDaysAgoStr} to ${todayStr}`);

    // Find incomplete tasks from the past week
    // Either planned_day or scheduled_date was in the past week
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('task_id')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .or(
        `and(planned_day.gte.${sevenDaysAgoStr},planned_day.lte.${todayStr}),and(scheduled_date.gte.${sevenDaysAgoStr},scheduled_date.lte.${todayStr})`
      );

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        count: 0,
        message: 'No unfinished tasks found from last week' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const taskIds = tasks.map(t => t.task_id);

    // Update all these tasks: set planned_day to null (move to inbox)
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        planned_day: null,
        day_order: 0 
      })
      .in('task_id', taskIds)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating tasks:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Moved ${taskIds.length} tasks to inbox`);

    return new Response(JSON.stringify({ 
      success: true, 
      count: taskIds.length,
      message: `Moved ${taskIds.length} tasks to inbox` 
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
