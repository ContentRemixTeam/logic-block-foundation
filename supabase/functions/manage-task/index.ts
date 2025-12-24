import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode JWT to get user ID
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, task_id, task_text, scheduled_date, priority, is_completed } = body;

    let result;

    switch (action) {
      case 'create':
        result = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            task_text,
            scheduled_date: scheduled_date || null,
            priority: priority || null,
            source: 'manual',
            is_completed: false,
          })
          .select()
          .single();
        break;

      case 'update':
        const updateData: Record<string, any> = {};
        if (task_text !== undefined) updateData.task_text = task_text;
        if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
        if (priority !== undefined) updateData.priority = priority;
        if (is_completed !== undefined) {
          updateData.is_completed = is_completed;
          updateData.completed_at = is_completed ? new Date().toISOString() : null;
        }

        result = await supabase
          .from('tasks')
          .update(updateData)
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .select()
          .single();
        break;

      case 'delete':
        result = await supabase
          .from('tasks')
          .delete()
          .eq('task_id', task_id)
          .eq('user_id', userId);
        break;

      case 'toggle':
        // Get current status
        const { data: currentTask } = await supabase
          .from('tasks')
          .select('is_completed')
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .single();

        const newStatus = !currentTask?.is_completed;
        result = await supabase
          .from('tasks')
          .update({
            is_completed: newStatus,
            completed_at: newStatus ? new Date().toISOString() : null,
          })
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .select()
          .single();
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: result.data, success: true }), {
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
