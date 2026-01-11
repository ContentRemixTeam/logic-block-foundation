import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== ZOD SCHEMA ====================

const DailyPlanSchema = z.object({
  day_id: z.string().uuid('Invalid day ID'),
  top_3_today: z.array(z.string().max(500, 'Top 3 item too long')).max(3, 'Maximum 3 items allowed').optional(),
  selected_weekly_priorities: z.array(z.string().max(500)).optional(),
  thought: z.string().max(500, 'Thought must be under 500 characters').optional(),
  feeling: z.string().max(200, 'Feeling must be under 200 characters').optional(),
  deep_mode_notes: z.record(z.any()).optional(),
  scratch_pad_content: z.string().optional(),
  scratch_pad_title: z.string().max(200, 'Scratch pad title must be under 200 characters').nullable().optional(),
  one_thing: z.string().max(500, 'One thing must be under 500 characters').nullable().optional(),
  goal_rewrite: z.string().max(1000, 'Goal rewrite must be under 1000 characters').nullable().optional(),
});

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

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  console.log('EDGE FUNC: save-daily-plan called');

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

    // Rate limit check
    const rateCheck = await checkRateLimit(supabaseClient, userId, 'save-daily-plan', 'mutation');
    if (!rateCheck.allowed) {
      console.log('Rate limit exceeded for user:', userId);
      return rateLimitResponse(rateCheck.retryAfter!);
    }

    const body = await req.json();

    // ==================== ZOD VALIDATION ====================
    const parseResult = DailyPlanSchema.safeParse(body);
    if (!parseResult.success) {
      console.log('Validation failed:', parseResult.error.errors);
      return validationErrorResponse(parseResult.error);
    }

    const validatedData = parseResult.data;
    const { 
      day_id, top_3_today, selected_weekly_priorities, thought, 
      feeling, deep_mode_notes, scratch_pad_content, scratch_pad_title, 
      one_thing, goal_rewrite 
    } = validatedData;

    console.log('Saving daily plan:', { userId, day_id });

    // Normalize validated arrays (filter empty strings)
    const normalizedTop3 = Array.isArray(top_3_today)
      ? top_3_today.filter((item) => item.trim()).slice(0, 3)
      : [];

    const normalizedWeeklyPriorities = Array.isArray(selected_weekly_priorities)
      ? selected_weekly_priorities.filter((item) => item.trim())
      : [];

    // Update daily plan
    const { data, error: updateError } = await supabaseClient
      .from('daily_plans')
      .update({
        top_3_today: normalizedTop3,
        selected_weekly_priorities: normalizedWeeklyPriorities,
        thought: (thought || '').substring(0, 500),
        feeling: (feeling || '').substring(0, 200),
        deep_mode_notes: deep_mode_notes || {},
        scratch_pad_content: scratch_pad_content || '',
        scratch_pad_title: scratch_pad_title ? scratch_pad_title.substring(0, 200) : null,
        one_thing: one_thing ? one_thing.substring(0, 500) : null,
        goal_rewrite: goal_rewrite ? goal_rewrite.substring(0, 1000) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('day_id', day_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Daily plan saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          day_id: data.day_id,
          top_3_today: data.top_3_today,
          selected_weekly_priorities: data.selected_weekly_priorities,
          thought: data.thought,
          feeling: data.feeling,
          deep_mode_notes: data.deep_mode_notes,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in save-daily-plan:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
