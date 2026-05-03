import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('EDGE FUNC: create-tasks-from-priorities called');

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Cryptographically verify the JWT via the auth server
    const authClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { priorities, cycle_id, month_in_cycle, auto_schedule } = body;

    if (!priorities || !Array.isArray(priorities) || priorities.length === 0) {
      return new Response(JSON.stringify({ error: 'priorities array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get cycle info for scheduling
    const { data: cycleData } = await supabaseClient
      .from('cycles_90_day')
      .select('cycle_id, start_date, end_date')
      .eq('cycle_id', cycle_id)
      .eq('user_id', userId)
      .single();

    if (!cycleData) {
      return new Response(JSON.stringify({ error: 'Cycle not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or get project for next month priorities
    const projectName = `📋 Month ${(month_in_cycle || 1) + 1} Priorities`;
    
    let projectId: string | null = null;
    
    // Check for existing project
    const { data: existingProject } = await supabaseClient
      .from('projects')
      .select('id')
      .eq('cycle_id', cycle_id)
      .eq('user_id', userId)
      .eq('name', projectName)
      .maybeSingle();

    if (existingProject) {
      projectId = existingProject.id;
    } else {
      // Create new project
      const { data: newProject, error: projectError } = await supabaseClient
        .from('projects')
        .insert({
          user_id: userId,
          cycle_id: cycle_id,
          name: projectName,
          description: `Priorities rolled over from Month ${month_in_cycle || 1} review`,
          status: 'active',
          color: '#8B5CF6',
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project:', projectError);
        return new Response(JSON.stringify({ error: 'Failed to create project' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      projectId = newProject.id;
    }

    // Calculate first day of next month in cycle
    const cycleStart = new Date(cycleData.start_date);
    const nextMonthStart = new Date(cycleStart);
    nextMonthStart.setDate(nextMonthStart.getDate() + ((month_in_cycle || 1) * 30));
    
    // Create tasks from priorities
    const tasksToCreate = priorities
      .filter((p: string) => p && p.trim())
      .map((priority: string, index: number) => {
        const scheduledDate = auto_schedule 
          ? new Date(nextMonthStart.getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null;
        
        return {
          user_id: userId,
          cycle_id: cycle_id,
          project_id: projectId,
          task_text: priority.trim(),
          scheduled_date: scheduledDate,
          status: 'todo',
          priority: 'high',
          source: 'monthly_review',
          is_system_generated: false,
          month_in_cycle: (month_in_cycle || 1) + 1,
        };
      });

    if (tasksToCreate.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid priorities to create' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: createdTasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .insert(tasksToCreate)
      .select();

    if (tasksError) {
      console.error('Error creating tasks:', tasksError);
      return new Response(JSON.stringify({ error: 'Failed to create tasks' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      tasks_created: createdTasks.length,
      project_id: projectId,
      project_name: projectName,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in create-tasks-from-priorities:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
