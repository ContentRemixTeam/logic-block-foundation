import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== ZOD SCHEMAS ====================

const TaskPrioritySchema = z.enum(['low', 'medium', 'high']).nullable().optional();
const TaskEnergyLevelSchema = z.enum(['low', 'medium', 'high']).nullable().optional();
const TaskStatusSchema = z.enum(['backlog', 'todo', 'in_progress', 'blocked', 'done', 'focus', 'scheduled', 'waiting', 'someday']).nullable().optional();

// Shared optional fields for update operations
const OptionalTaskFields = z.object({
  task_text: z.string().min(1, 'Task text is required').max(500, 'Task text must be under 500 characters').optional(),
  task_description: z.string().max(5000, 'Description must be under 5000 characters').nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  priority: TaskPrioritySchema,
  energy_level: TaskEnergyLevelSchema,
  status: TaskStatusSchema,
  estimated_minutes: z.number().min(0).max(1440, 'Estimated minutes must be 0-1440').nullable().optional(),
  actual_minutes: z.number().min(0).nullable().optional(),
  time_block_start: z.string().nullable().optional(),
  time_block_end: z.string().nullable().optional(),
  context_tags: z.array(z.string().max(50)).optional(),
  goal_id: z.string().uuid().nullable().optional(),
  waiting_on: z.string().max(500).nullable().optional(),
  subtasks: z.array(z.any()).optional(),
  notes: z.string().max(5000).nullable().optional(),
  position_in_column: z.number().nullable().optional(),
  planned_day: z.string().nullable().optional(),
  day_order: z.number().optional(),
  project_id: z.string().uuid().nullable().optional(),
  project_column: z.string().nullable().optional(),
  section_id: z.string().uuid().nullable().optional(),
  cycle_id: z.string().uuid().nullable().optional(),
  recurrence_pattern: z.string().nullable().optional(),
  recurrence_days: z.array(z.any()).optional(),
  recurrence_interval: z.number().min(1).max(365).nullable().optional(),
  recurrence_unit: z.enum(['days', 'weeks', 'months']).nullable().optional(),
  recurrence_end_date: z.string().nullable().optional(),
  sop_id: z.string().uuid().nullable().optional(),
  checklist_progress: z.array(z.any()).optional(),
  priority_order: z.number().min(1).max(3).nullable().optional(),
  daily_plan_id: z.string().uuid().nullable().optional(),
  source: z.enum(['manual', 'scratch_pad', 'top_3']).optional(),
  is_completed: z.boolean().optional(),
});

const CreateTaskSchema = z.object({
  action: z.literal('create'),
  task_text: z.string().min(1, 'Task text is required').max(500, 'Task text must be under 500 characters'),
  task_description: z.string().max(5000, 'Description must be under 5000 characters').nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  priority: TaskPrioritySchema,
  energy_level: TaskEnergyLevelSchema,
  status: TaskStatusSchema,
  estimated_minutes: z.number().min(0).max(1440, 'Estimated minutes must be 0-1440').nullable().optional(),
  actual_minutes: z.number().min(0).nullable().optional(),
  time_block_start: z.string().nullable().optional(),
  time_block_end: z.string().nullable().optional(),
  context_tags: z.array(z.string().max(50)).optional(),
  goal_id: z.string().uuid().nullable().optional(),
  waiting_on: z.string().max(500).nullable().optional(),
  subtasks: z.array(z.any()).optional(),
  notes: z.string().max(5000).nullable().optional(),
  position_in_column: z.number().nullable().optional(),
  planned_day: z.string().nullable().optional(),
  day_order: z.number().optional(),
  project_id: z.string().uuid().nullable().optional(),
  project_column: z.string().nullable().optional(),
  section_id: z.string().uuid().nullable().optional(),
  cycle_id: z.string().uuid().nullable().optional(),
  recurrence_pattern: z.string().nullable().optional(),
  recurrence_days: z.array(z.any()).optional(),
  recurrence_interval: z.number().min(1).max(365).nullable().optional(),
  recurrence_unit: z.enum(['days', 'weeks', 'months']).nullable().optional(),
  recurrence_end_date: z.string().nullable().optional(),
  sop_id: z.string().uuid().nullable().optional(),
  checklist_progress: z.array(z.any()).optional(),
  priority_order: z.number().min(1).max(3).nullable().optional(),
  daily_plan_id: z.string().uuid().nullable().optional(),
  source: z.enum(['manual', 'scratch_pad', 'top_3']).optional(),
});

const UpdateTaskSchema = OptionalTaskFields.extend({
  action: z.literal('update'),
  task_id: z.string().uuid('Invalid task ID'),
  change_source: z.string().optional(),
});

const DeleteTaskSchema = z.object({
  action: z.literal('delete'),
  task_id: z.string().uuid('Invalid task ID'),
  delete_type: z.enum(['single', 'future', 'all']).optional(),
});

const ToggleTaskSchema = z.object({
  action: z.literal('toggle'),
  task_id: z.string().uuid('Invalid task ID'),
});

const ToggleChecklistSchema = z.object({
  action: z.literal('toggle_checklist_item'),
  task_id: z.string().uuid('Invalid task ID'),
  item_id: z.string(),
});

const DetachSopSchema = z.object({
  action: z.literal('detach_sop'),
  task_id: z.string().uuid('Invalid task ID'),
});

const TaskInputSchema = z.discriminatedUnion('action', [
  CreateTaskSchema,
  UpdateTaskSchema,
  DeleteTaskSchema,
  ToggleTaskSchema,
  ToggleChecklistSchema,
  DetachSopSchema,
]);

// ==================== VALIDATION ERROR HELPER ====================

function validationErrorResponse(error: z.ZodError) {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ==================== AUTH HELPERS ====================

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

// ==================== RATE LIMITING ====================

const RATE_LIMITS = {
  mutation: { requests: 60, windowMs: 60000 },
  read: { requests: 120, windowMs: 60000 }
};

async function checkRateLimit(
  supabase: any, 
  userId: string, 
  endpoint: string, 
  type: 'mutation' | 'read'
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const limit = RATE_LIMITS[type];
    const now = new Date();
    const windowStart = new Date(now.getTime() - limit.windowMs);
    
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single();
    
    if (!existing || new Date(existing.window_start) < windowStart) {
      await supabase
        .from('rate_limits')
        .upsert({
          user_id: userId,
          endpoint: endpoint,
          request_count: 1,
          window_start: now.toISOString()
        }, { onConflict: 'user_id,endpoint' });
      return { allowed: true };
    }
    
    if (existing.request_count >= limit.requests) {
      const windowEnd = new Date(existing.window_start).getTime() + limit.windowMs;
      const retryAfter = Math.ceil((windowEnd - now.getTime()) / 1000);
      return { allowed: false, retryAfter: Math.max(1, retryAfter) };
    }
    
    await supabase
      .from('rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error (allowing request):', error);
    return { allowed: true };
  }
}

function rateLimitResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests. Please wait before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: retryAfter
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter)
      }
    }
  );
}

// ==================== UTILITY FUNCTIONS ====================

function isValidTimeValue(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return true;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

// ==================== MAIN HANDLER ====================

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

    // Rate limit check
    const rateCheck = await checkRateLimit(supabase, userId, 'manage-task', 'mutation');
    if (!rateCheck.allowed) {
      console.log('Rate limit exceeded for user:', userId);
      return rateLimitResponse(rateCheck.retryAfter!);
    }

    const body = await req.json();
    
    // ==================== ZOD VALIDATION ====================
    const parseResult = TaskInputSchema.safeParse(body);
    if (!parseResult.success) {
      console.log('Validation failed:', parseResult.error.errors);
      return validationErrorResponse(parseResult.error);
    }
    
    const validatedData = parseResult.data;
    const { action } = validatedData;

    let result;

    switch (action) {
      case 'create': {
        const { 
          task_text, task_description, scheduled_date, priority, 
          recurrence_pattern, recurrence_days, recurrence_interval, 
          recurrence_unit, recurrence_end_date, sop_id, checklist_progress,
          priority_order, source, daily_plan_id, estimated_minutes,
          actual_minutes, time_block_start, time_block_end, energy_level,
          context_tags, goal_id, status, waiting_on, subtasks, notes,
          position_in_column, planned_day, day_order, project_id,
          project_column, section_id, cycle_id
        } = validatedData;
        
        const isRecurringParent = recurrence_pattern && recurrence_pattern !== 'none';
        
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
            task_text: task_text.substring(0, 500),
            task_description: task_description ? task_description.substring(0, 5000) : null,
            scheduled_date: scheduled_date || null,
            priority: priority || null,
            source: source || 'manual',
            is_completed: false,
            recurrence_pattern: recurrence_pattern || null,
            recurrence_days: recurrence_days || [],
            recurrence_interval: recurrence_interval || null,
            recurrence_unit: recurrence_unit || null,
            recurrence_end_date: recurrence_end_date || null,
            is_recurring_parent: isRecurringParent,
            sop_id: sop_id || null,
            checklist_progress: checklist_progress || [],
            priority_order: priority_order || null,
            daily_plan_id: daily_plan_id || null,
            estimated_minutes: estimated_minutes || null,
            actual_minutes: actual_minutes || null,
            time_block_start: isValidTimeValue(time_block_start) ? time_block_start : null,
            time_block_end: isValidTimeValue(time_block_end) ? time_block_end : null,
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
            project_id: project_id || null,
            project_column: project_column || 'todo',
            section_id: section_id || null,
            cycle_id: cycle_id || null,
          })
          .select()
          .single();
        break;
      }

      case 'update': {
        const { task_id, change_source, ...updateFields } = validatedData;
        
        // First, fetch current task state for reschedule tracking
        const { data: currentTaskState } = await supabase
          .from('tasks')
          .select('scheduled_date, planned_day, time_block_start, original_scheduled_at, original_due_date')
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .single();

        const updateData: Record<string, any> = {};
        
        if (updateFields.task_text !== undefined) updateData.task_text = updateFields.task_text.substring(0, 500);
        if (updateFields.task_description !== undefined) updateData.task_description = updateFields.task_description ? updateFields.task_description.substring(0, 5000) : null;
        if (updateFields.scheduled_date !== undefined) updateData.scheduled_date = updateFields.scheduled_date;
        if (updateFields.priority !== undefined) updateData.priority = updateFields.priority;
        if (updateFields.recurrence_pattern !== undefined) {
          updateData.recurrence_pattern = updateFields.recurrence_pattern;
          updateData.is_recurring_parent = updateFields.recurrence_pattern && updateFields.recurrence_pattern !== 'none';
        }
        if (updateFields.recurrence_days !== undefined) updateData.recurrence_days = updateFields.recurrence_days;
        if (updateFields.recurrence_interval !== undefined) updateData.recurrence_interval = updateFields.recurrence_interval;
        if (updateFields.recurrence_unit !== undefined) updateData.recurrence_unit = updateFields.recurrence_unit;
        if (updateFields.recurrence_end_date !== undefined) updateData.recurrence_end_date = updateFields.recurrence_end_date;
        if (updateFields.is_completed !== undefined) {
          updateData.is_completed = updateFields.is_completed;
          updateData.completed_at = updateFields.is_completed ? new Date().toISOString() : null;
        }
        if (updateFields.sop_id !== undefined) updateData.sop_id = updateFields.sop_id;
        if (updateFields.checklist_progress !== undefined) updateData.checklist_progress = updateFields.checklist_progress;
        if (updateFields.priority_order !== undefined) updateData.priority_order = updateFields.priority_order;
        if (updateFields.daily_plan_id !== undefined) updateData.daily_plan_id = updateFields.daily_plan_id;
        if (updateFields.estimated_minutes !== undefined) updateData.estimated_minutes = updateFields.estimated_minutes;
        if (updateFields.actual_minutes !== undefined) updateData.actual_minutes = updateFields.actual_minutes;
        if (updateFields.time_block_start !== undefined) updateData.time_block_start = updateFields.time_block_start === null ? null : (isValidTimeValue(updateFields.time_block_start) ? updateFields.time_block_start : null);
        if (updateFields.time_block_end !== undefined) updateData.time_block_end = updateFields.time_block_end === null ? null : (isValidTimeValue(updateFields.time_block_end) ? updateFields.time_block_end : null);
        if (updateFields.energy_level !== undefined) updateData.energy_level = updateFields.energy_level;
        if (updateFields.context_tags !== undefined) updateData.context_tags = updateFields.context_tags;
        if (updateFields.goal_id !== undefined) updateData.goal_id = updateFields.goal_id;
        if (updateFields.status !== undefined) updateData.status = updateFields.status;
        if (updateFields.waiting_on !== undefined) updateData.waiting_on = updateFields.waiting_on;
        if (updateFields.subtasks !== undefined) updateData.subtasks = updateFields.subtasks;
        if (updateFields.notes !== undefined) updateData.notes = updateFields.notes;
        if (updateFields.position_in_column !== undefined) updateData.position_in_column = updateFields.position_in_column;
        if (updateFields.planned_day !== undefined) updateData.planned_day = updateFields.planned_day;
        if (updateFields.day_order !== undefined) updateData.day_order = updateFields.day_order;
        if (updateFields.project_id !== undefined) updateData.project_id = updateFields.project_id;
        if (updateFields.project_column !== undefined) updateData.project_column = updateFields.project_column;
        if (updateFields.section_id !== undefined) updateData.section_id = updateFields.section_id;
        if (updateFields.cycle_id !== undefined) updateData.cycle_id = updateFields.cycle_id;

        // Reschedule tracking
        const prevScheduled = currentTaskState?.planned_day || currentTaskState?.time_block_start;
        const newScheduled = updateFields.planned_day !== undefined ? updateFields.planned_day : (updateFields.time_block_start !== undefined ? updateFields.time_block_start : null);
        const prevDueDate = currentTaskState?.scheduled_date;
        const newDueDate = updateFields.scheduled_date !== undefined ? updateFields.scheduled_date : null;
        
        const scheduleChanged = (updateFields.planned_day !== undefined && prevScheduled !== updateFields.planned_day) || 
                               (updateFields.time_block_start !== undefined && currentTaskState?.time_block_start !== updateFields.time_block_start);
        const dueDateChanged = updateFields.scheduled_date !== undefined && prevDueDate !== updateFields.scheduled_date;
        
        if (scheduleChanged || dueDateChanged) {
          if (!currentTaskState?.original_scheduled_at && prevScheduled) {
            updateData.original_scheduled_at = prevScheduled;
          }
          if (!currentTaskState?.original_due_date && prevDueDate) {
            updateData.original_due_date = prevDueDate;
          }
          
          updateData.last_rescheduled_at = new Date().toISOString();
          
          await supabase
            .from('task_schedule_history')
            .insert({
              user_id: userId,
              task_id: task_id,
              previous_scheduled_at: prevScheduled || null,
              new_scheduled_at: newScheduled || updateFields.planned_day || null,
              previous_due_date: prevDueDate || null,
              new_due_date: newDueDate || null,
              change_source: change_source || 'api',
            });
          
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { count } = await supabase
            .from('task_schedule_history')
            .select('*', { count: 'exact', head: true })
            .eq('task_id', task_id)
            .eq('user_id', userId)
            .gte('changed_at', thirtyDaysAgo.toISOString());
          
          updateData.reschedule_count_30d = count || 0;
          
          let daysPushed = 0;
          const originalScheduled = currentTaskState?.original_scheduled_at || prevScheduled;
          const originalDue = currentTaskState?.original_due_date || prevDueDate;
          
          if (originalScheduled && newScheduled) {
            const origDate = new Date(originalScheduled);
            const newDate = new Date(newScheduled);
            daysPushed = Math.floor((newDate.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
          } else if (originalDue && newDueDate) {
            const origDate = new Date(originalDue);
            const newDate = new Date(newDueDate);
            daysPushed = Math.floor((newDate.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          updateData.reschedule_loop_active = (count || 0) >= 3 || daysPushed >= 7;
        }

        result = await supabase
          .from('tasks')
          .update(updateData)
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .select()
          .single();
        break;
      }

      case 'delete': {
        const { task_id, delete_type } = validatedData;
        
        const { data: taskToDelete } = await supabase
          .from('tasks')
          .select('is_recurring_parent, parent_task_id')
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .single();

        if (taskToDelete?.is_recurring_parent && delete_type === 'all') {
          await supabase
            .from('tasks')
            .delete()
            .eq('parent_task_id', task_id)
            .eq('user_id', userId);
        }

        if (delete_type === 'future' && taskToDelete?.parent_task_id) {
          await supabase
            .from('tasks')
            .delete()
            .eq('task_id', taskToDelete.parent_task_id)
            .eq('user_id', userId);
        }

        result = await supabase
          .from('tasks')
          .delete()
          .eq('task_id', task_id)
          .eq('user_id', userId);
        break;
      }

      case 'toggle': {
        const { task_id } = validatedData;
        
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
      }

      case 'toggle_checklist_item': {
        const { task_id, item_id } = validatedData;
        
        const { data: taskWithChecklist } = await supabase
          .from('tasks')
          .select('checklist_progress')
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .single();
        
        let currentProgress = taskWithChecklist?.checklist_progress || [];
        const existingIndex = currentProgress.findIndex((p: any) => p.item_id === item_id);
        
        if (existingIndex >= 0) {
          currentProgress[existingIndex].completed = !currentProgress[existingIndex].completed;
        } else {
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
      }

      case 'detach_sop': {
        const { task_id } = validatedData;
        
        result = await supabase
          .from('tasks')
          .update({ sop_id: null })
          .eq('task_id', task_id)
          .eq('user_id', userId)
          .select()
          .single();
        break;
      }
    }

    if (result?.error) {
      console.error('Database error:', result.error);
      throw result.error;
    }

    return new Response(
      JSON.stringify({ success: true, data: result?.data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in manage-task:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
