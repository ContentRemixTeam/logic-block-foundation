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
    console.error('[generate-recurring-tasks] JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

// Get day of week name
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Check if today is a weekday (Mon-Fri)
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

// Calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

// Check if today matches recurrence pattern
function shouldCreateInstance(
  pattern: string, 
  recurrenceDays: string[], 
  today: Date, 
  monthlyDay?: number,
  createdAt?: string,
  recurrenceInterval?: number,
  recurrenceUnit?: string
): boolean {
  switch (pattern) {
    case 'daily':
      return true;
      
    case 'weekdays':
      return isWeekday(today);
      
    case 'weekly':
      const todayName = getDayName(today);
      return recurrenceDays.includes(todayName);
      
    case 'biweekly':
      // Check if it's been 2 weeks since creation
      if (!createdAt) return false;
      const createdDate = new Date(createdAt);
      const weeksSince = Math.floor(daysBetween(today, createdDate) / 7);
      // Only trigger on even weeks
      if (weeksSince % 2 !== 0) return false;
      // Check if today matches the selected day(s)
      const todayDayName = getDayName(today);
      return recurrenceDays.includes(todayDayName);
      
    case 'monthly':
      // Use custom day if provided, otherwise default to 1st
      const targetDay = monthlyDay || 1;
      // Handle months with fewer days (e.g., if targetDay is 31 but month only has 30 days)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const effectiveDay = Math.min(targetDay, lastDayOfMonth);
      return today.getDate() === effectiveDay;
      
    case 'quarterly':
      // Fire on the 1st of every 3rd month from creation
      if (!createdAt) return false;
      const created = new Date(createdAt);
      const monthsSince = (today.getFullYear() - created.getFullYear()) * 12 + 
                          (today.getMonth() - created.getMonth());
      // Only trigger every 3 months on the same day of month
      if (monthsSince % 3 !== 0) return false;
      return today.getDate() === created.getDate();
      
    case 'custom':
      // Use custom interval and unit
      if (!recurrenceInterval || !recurrenceUnit || !createdAt) return false;
      const startDate = new Date(createdAt);
      const daysDiff = daysBetween(today, startDate);
      
      switch (recurrenceUnit) {
        case 'days':
          return daysDiff % recurrenceInterval === 0;
        case 'weeks':
          const weeksDiff = Math.floor(daysDiff / 7);
          // Check if we're on the right week and same day of week
          if (weeksDiff % recurrenceInterval !== 0) return false;
          return today.getDay() === startDate.getDay();
        case 'months':
          const monthDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                           (today.getMonth() - startDate.getMonth());
          if (monthDiff % recurrenceInterval !== 0) return false;
          return today.getDate() === startDate.getDate();
        default:
          return false;
      }
      
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
    let skippedEndDate = 0;

    for (const parentTask of recurringTasks || []) {
      const pattern = parentTask.recurrence_pattern;
      const recurrenceDays = Array.isArray(parentTask.recurrence_days) ? parentTask.recurrence_days : [];
      
      // Check if recurrence has ended
      if (parentTask.recurrence_end_date) {
        const endDate = new Date(parentTask.recurrence_end_date);
        if (today > endDate) {
          console.log('Skipping task', parentTask.task_id, '- past end date');
          skippedEndDate++;
          continue;
        }
      }
      
      // Extract monthly_day from recurrence_days if it's a monthly pattern
      const monthlyDay = pattern === 'monthly' && recurrenceDays.length > 0 
        ? parseInt(recurrenceDays[0], 10) 
        : undefined;

      // Check if we should create an instance today
      if (!shouldCreateInstance(
        pattern, 
        recurrenceDays, 
        today, 
        monthlyDay,
        parentTask.created_at,
        parentTask.recurrence_interval,
        parentTask.recurrence_unit
      )) {
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

      // Check for average actual time from past instances (for smart estimation)
      let smartEstimatedMinutes = parentTask.estimated_minutes;
      
      if (parentTask.task_id) {
        const { data: avgData } = await supabase
          .from('recurring_task_averages')
          .select('avg_actual_minutes, instance_count')
          .eq('parent_task_id', parentTask.task_id)
          .single();

        // Use average if 3+ instances exist
        if (avgData && avgData.instance_count >= 3 && avgData.avg_actual_minutes) {
          smartEstimatedMinutes = Math.round(Number(avgData.avg_actual_minutes));
          console.log('Using smart estimate for task', parentTask.task_id, ':', smartEstimatedMinutes, 'min (avg of', avgData.instance_count, 'instances)');
        }
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
          sop_id: parentTask.sop_id,
          estimated_minutes: smartEstimatedMinutes,
          energy_level: parentTask.energy_level,
          context_tags: parentTask.context_tags,
        });

      if (insertError) {
        console.error('Error creating recurring instance:', insertError);
      } else {
        createdCount++;
        console.log('Created recurring instance for task:', parentTask.task_id);
      }
    }

    console.log('Generated', createdCount, 'recurring task instances, skipped', skippedEndDate, 'past end date');

    return new Response(JSON.stringify({ 
      success: true, 
      created: createdCount,
      skipped_end_date: skippedEndDate,
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
