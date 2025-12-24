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

// Get day of week name
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Check if today matches recurrence pattern
function shouldCreateInstance(pattern: string, recurrenceDays: string[], today: Date): boolean {
  switch (pattern) {
    case 'daily':
      return true;
    case 'weekly':
      const todayName = getDayName(today);
      return recurrenceDays.includes(todayName);
    case 'monthly':
      // Check if today is the same day of month as when task was created
      // For simplicity, we'll check if it's the 1st (or last day if 1st doesn't exist)
      return today.getDate() === 1;
    default:
      return false;
  }
}

Deno.serve(async (req) => {
  console.log('EDGE FUNC: generate-recurring-tasks called');

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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('Generating recurring tasks for user:', userId, 'date:', todayStr);

    // Get all recurring parent tasks for this user
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_recurring_parent', true)
      .is('is_completed', false);

    if (fetchError) {
      console.error('Error fetching recurring tasks:', fetchError);
      throw fetchError;
    }

    console.log('Found recurring parent tasks:', recurringTasks?.length || 0);

    let createdCount = 0;

    for (const parentTask of recurringTasks || []) {
      const pattern = parentTask.recurrence_pattern;
      const recurrenceDays = Array.isArray(parentTask.recurrence_days) ? parentTask.recurrence_days : [];

      // Check if we should create an instance today
      if (!shouldCreateInstance(pattern, recurrenceDays, today)) {
        console.log('Skipping task', parentTask.task_id, '- not scheduled for today');
        continue;
      }

      // Check if instance already exists for today
      const { data: existingInstance } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('parent_task_id', parentTask.task_id)
        .eq('scheduled_date', todayStr)
        .single();

      if (existingInstance) {
        console.log('Instance already exists for task', parentTask.task_id);
        continue;
      }

      // Create new instance
      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          task_text: parentTask.task_text,
          task_description: parentTask.task_description,
          scheduled_date: todayStr,
          priority: parentTask.priority,
          source: 'recurring',
          is_completed: false,
          parent_task_id: parentTask.task_id,
          recurrence_pattern: null, // Instance doesn't recur
          is_recurring_parent: false,
        });

      if (insertError) {
        console.error('Error creating recurring instance:', insertError);
      } else {
        createdCount++;
        console.log('Created recurring instance for task:', parentTask.task_id);
      }
    }

    console.log('Generated', createdCount, 'recurring task instances');

    return new Response(JSON.stringify({ 
      success: true, 
      created: createdCount,
      date: todayStr
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
