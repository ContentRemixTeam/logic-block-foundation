import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportTask {
  task_text: string;
  task_description?: string;
  scheduled_date?: string;
  priority?: string;
  is_completed?: boolean;
  estimated_minutes?: number;
  context_tags?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { tasks } = await req.json() as { tasks: ImportTask[] };

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tasks provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Importing ${tasks.length} tasks for user ${user.id}`);

    // Prepare tasks for insertion
    const tasksToInsert = tasks.map(task => ({
      user_id: user.id,
      task_text: task.task_text,
      task_description: task.task_description || null,
      scheduled_date: task.scheduled_date || null,
      priority: task.priority || null,
      is_completed: task.is_completed || false,
      estimated_minutes: task.estimated_minutes || null,
      context_tags: task.context_tags || null,
      status: task.is_completed ? 'done' : 'backlog',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Batch insert tasks
    const batchSize = 100;
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < tasksToInsert.length; i += batchSize) {
      const batch = tasksToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(batch)
        .select('task_id');

      if (error) {
        console.error('Batch insert error:', error);
        failed += batch.length;
      } else {
        imported += data?.length || 0;
      }
    }

    console.log(`Import complete: ${imported} imported, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported, 
        failed,
        total: tasks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
