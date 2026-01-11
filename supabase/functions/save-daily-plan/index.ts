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

// Rate limiting configuration
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
    const { day_id, top_3_today, selected_weekly_priorities, thought, feeling, deep_mode_notes, scratch_pad_content, scratch_pad_title, one_thing, goal_rewrite } = body;

    console.log('Saving daily plan:', { userId, day_id });

    // Validate and normalize arrays
    const normalizedTop3 = Array.isArray(top_3_today)
      ? top_3_today.filter((item) => typeof item === 'string' && item.trim()).slice(0, 3)
      : [];

    const normalizedWeeklyPriorities = Array.isArray(selected_weekly_priorities)
      ? selected_weekly_priorities.filter((item) => typeof item === 'string' && item.trim())
      : [];

    // Validate deep mode notes
    const normalizedDeepNotes = typeof deep_mode_notes === 'object' && deep_mode_notes !== null
      ? deep_mode_notes
      : {};

    // Normalize scratch pad content and title
    const normalizedScratchPad = typeof scratch_pad_content === 'string' ? scratch_pad_content : '';
    const normalizedScratchPadTitle = typeof scratch_pad_title === 'string' ? scratch_pad_title.substring(0, 200) : null;
    
    // Normalize one_thing
    const normalizedOneThing = typeof one_thing === 'string' ? one_thing.substring(0, 500) : null;
    
    // Normalize goal_rewrite
    const normalizedGoalRewrite = typeof goal_rewrite === 'string' ? goal_rewrite.substring(0, 1000) : null;

    // Update daily plan
    const { data, error: updateError } = await supabaseClient
      .from('daily_plans')
      .update({
        top_3_today: normalizedTop3,
        selected_weekly_priorities: normalizedWeeklyPriorities,
        thought: (thought || '').substring(0, 500),
        feeling: (feeling || '').substring(0, 200),
        deep_mode_notes: normalizedDeepNotes,
        scratch_pad_content: normalizedScratchPad,
        scratch_pad_title: normalizedScratchPadTitle,
        one_thing: normalizedOneThing,
        goal_rewrite: normalizedGoalRewrite,
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
