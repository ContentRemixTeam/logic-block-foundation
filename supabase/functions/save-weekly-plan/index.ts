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
  console.log('EDGE FUNC: save-weekly-plan called');

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
      console.error('Failed to decode user ID from JWT');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User ID from JWT:', userId);

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Rate limit check
    const rateCheck = await checkRateLimit(supabaseClient, userId, 'save-weekly-plan', 'mutation');
    if (!rateCheck.allowed) {
      console.log('Rate limit exceeded for user:', userId);
      return rateLimitResponse(rateCheck.retryAfter!);
    }

    const body = await req.json();
    const { week_id, top_3_priorities, weekly_thought, weekly_feeling, challenges, adjustments, metric_1_target, metric_2_target, metric_3_target, goal_rewrite } = body;

    console.log('Saving weekly plan for user:', userId, 'week:', week_id);

    // Validate and normalize priorities
    let priorities = [];
    if (Array.isArray(top_3_priorities)) {
      priorities = top_3_priorities.filter((p) => typeof p === 'string' && p.trim()).slice(0, 3);
    }

    // Normalize goal_rewrite
    const normalizedGoalRewrite = typeof goal_rewrite === 'string' ? goal_rewrite.substring(0, 1000) : null;

    // Update weekly plan
    const { data, error: updateError } = await supabaseClient
      .from('weekly_plans')
      .update({
        top_3_priorities: priorities,
        weekly_thought: weekly_thought || null,
        weekly_feeling: weekly_feeling || null,
        challenges: challenges || null,
        adjustments: adjustments || null,
        metric_1_target: metric_1_target ?? null,
        metric_2_target: metric_2_target ?? null,
        metric_3_target: metric_3_target ?? null,
        goal_rewrite: normalizedGoalRewrite,
        updated_at: new Date().toISOString(),
      })
      .eq('week_id', week_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating weekly plan:', updateError);
      throw updateError;
    }

    console.log('Weekly plan updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          week_id: data.week_id,
          top_3_priorities: data.top_3_priorities,
          weekly_thought: data.weekly_thought,
          weekly_feeling: data.weekly_feeling,
          challenges: data.challenges,
          adjustments: data.adjustments,
        }
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in save-weekly-plan function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
