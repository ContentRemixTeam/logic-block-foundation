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
    const { 
      action, 
      task_id, 
      task_text, 
      task_description,
      scheduled_date, 
      priority, 
      is_completed,
      recurrence_pattern,
      recurrence_days,
      delete_type, // 'single', 'future', 'all'
      sop_id,
      checklist_progress,
      priority_order, // 1, 2, or 3 for Top 3 tasks
      source, // 'manual', 'scratch_pad', 'top_3'
      daily_plan_id,
      // Enhanced fields
      estimated_minutes,
      actual_minutes,
      time_block_start,
      time_block_end,
      energy_level,
      context_tags,
      goal_id,
      status,
      waiting_on,
      subtasks,
      notes,
      position_in_column,
      // Weekly planning fields
      planned_day,
      day_order
    } = body;

    let result;

    switch (action) {
      case 'create':
        const isRecurringParent = recurrence_pattern && recurrence_pattern !== 'none';
        
        // If sop_id provided, increment times_used
        if (sop_id) {
          const { data: sopData } = await supabase
            .from('sops')
            .select('times_used')
            .eq('sop_id', sop_id)
            .eq('user_id', userId)
            .single();
          
          if (sopData) {
            await supabase
              .from('sops')
              .update({ times_used: (sopData.times_used || 0) + 1 })
              .eq('sop_id', sop_id)
              .eq('user_id', userId);
          }
        }
        
        result = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            task_text: (task_text || '').substring(0, 500),
            task_description: task_description ? task_description.substring(0, 5000) : null,
            scheduled_date: scheduled_date || null,
            priority: priority || null,
            source: source || 'manual',
            is_completed: false,
            recurrence_pattern: recurrence_pattern || null,
            recurrence_days: recurrence_days || [],
            is_recurring_parent: isRecurringParent,
            sop_id: sop_id || null,
            checklist_progress: checklist_progress || [],
            priority_order: priority_order || null,
            daily_plan_id: daily_plan_id || null,
            // New enhanced fields
            estimated_minutes: estimated_minutes || null,
            actual_minutes: actual_minutes || null,
            time_block_start: time_block_start || null,
            time_block_end: time_block_end || null,
            energy_level: energy_level || null,
            context_tags: context_tags || [],
            goal_id: goal_id || null,
            status: status || 'backlog',
            waiting_on: waiting_on || null,
            subtasks: subtasks || [],
            notes: notes || null,
            position_in_column: position_in_column || null,
            planned_day: planned_day || null,
            day_order: day_order || 0,
          })
          .select()
          .single();
        break;

      case 'update':
        const updateData: Record<string, any> = {};
        if (task_text !== undefined) updateData.task_text = task_text.substring(0, 500);
        if (task_description !== undefined) updateData.task_description = task_description ? task_description.substring(0, 5000) : null;
        if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
        if (priority !== undefined) updateData.priority = priority;
        if (recurrence_pattern !== undefined) {
          updateData.recurrence_pattern = recurrence_pattern;
          updateData.is_recurring_parent = recurrence_pattern && recurrence_pattern !== 'none';
        }
        if (recurrence_days !== undefined) updateData.recurrence_days = recurrence_days;
        if (is_completed !== undefined) {
          updateData.is_completed = is_completed;
          updateData.completed_at = is_completed ? new Date().toISOString() : null;
        }
        if (sop_id !== undefined) updateData.sop_id = sop_id;
        if (checklist_progress !== undefined) updateData.checklist_progress = checklist_progress;
        if (priority_order !== undefined) updateData.priority_order = priority_order;
        if (daily_plan_id !== undefined) updateData.daily_plan_id = daily_plan_id;
        // New enhanced fields
        if (estimated_minutes !== undefined) updateData.estimated_minutes = estimated_minutes;
        if (actual_minutes !== undefined) updateData.actual_minutes = actual_minutes;
        if (time_block_start !== undefined) updateData.time_block_start = time_block_start;
        if (time_block_end !== undefined) updateData.time_block_end = time_block_end;
        if (energy_level !== undefined) updateData.energy_level = energy_level;
        if (context_tags !== undefined) updateData.context_tags = context_tags;
        if (goal_id !== undefined) updateData.goal_id = goal_id;
        if (status !== undefined) updateData.status = status;
        if (waiting_on !== undefined) updateData.waiting_on = waiting_on;
        if (subtasks !== undefined) updateData.subtasks = subtasks;
        if (notes !== undefined) updateData.notes = notes;
        if (position_in_column !== undefined) updateData.position_in_column = position_in_column;
        // Weekly planning fields
        if (planned_day !== undefined) updateData.planned_day = planned_day;
        if (day_order !== undefined) updateData.day_order = day_order;

        result = await supabase
          .from('tasks')
          .update(updateData)
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .select()
          .single();
        break;

      case 'delete':
        // Check if this is a recurring parent task
        const { data: taskToDelete } = await supabase
          .from('tasks')
          .select('is_recurring_parent, parent_task_id')
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .single();

        if (taskToDelete?.is_recurring_parent && delete_type === 'all') {
          // Delete parent and all child instances
          await supabase
            .from('tasks')
            .delete()
            .eq('parent_task_id', task_id)
            .eq('user_id', userId);
        }

        if (delete_type === 'future' && taskToDelete?.parent_task_id) {
          // Stop recurring - delete parent
          await supabase
            .from('tasks')
            .delete()
            .eq('task_id', taskToDelete.parent_task_id)
            .eq('user_id', userId);
        }

        // Delete the task itself
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

      case 'toggle_checklist_item':
        // Toggle a specific checklist item
        const { item_id } = body;
        
        const { data: taskWithChecklist } = await supabase
          .from('tasks')
          .select('checklist_progress')
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .single();
        
        let currentProgress = taskWithChecklist?.checklist_progress || [];
        const existingIndex = currentProgress.findIndex((p: any) => p.item_id === item_id);
        
        if (existingIndex >= 0) {
          // Toggle existing
          currentProgress[existingIndex].completed = !currentProgress[existingIndex].completed;
        } else {
          // Add new as completed
          currentProgress.push({ item_id, completed: true });
        }
        
        result = await supabase
          .from('tasks')
          .update({ checklist_progress: currentProgress })
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .select()
          .single();
        break;

      case 'detach_sop':
        // Remove SOP link but keep the description content
        result = await supabase
          .from('tasks')
          .update({ sop_id: null })
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
