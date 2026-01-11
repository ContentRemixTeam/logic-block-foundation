import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to decode JWT and extract user ID
function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
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
  console.log('EDGE FUNC: save-user-settings called');

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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract user ID from JWT first
    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      console.error('Failed to extract user ID from JWT');
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User ID from JWT:', userId);

    // Use service role client for database operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limit check
    const rateCheck = await checkRateLimit(supabaseClient, userId, 'save-user-settings', 'mutation');
    if (!rateCheck.allowed) {
      console.log('Rate limit exceeded for user:', userId);
      return rateLimitResponse(rateCheck.retryAfter!);
    }

    const body = await req.json();
    const {
      daily_review_questions,
      weekly_review_questions,
      monthly_review_questions,
      cycle_summary_questions,
      theme_preference,
      works_weekends,
      has_seen_tour,
    } = body;

    // Build update data object - only include fields that are provided
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Handle review questions arrays if provided
    if (daily_review_questions !== undefined) {
      const normalizedDaily = (daily_review_questions ?? []).map(String).filter(Boolean);
      updateData.daily_review_questions = JSON.stringify(normalizedDaily);
    }
    
    if (weekly_review_questions !== undefined) {
      const normalizedWeekly = (weekly_review_questions ?? []).map(String).filter(Boolean);
      updateData.weekly_review_questions = JSON.stringify(normalizedWeekly);
    }
    
    if (monthly_review_questions !== undefined) {
      const normalizedMonthly = (monthly_review_questions ?? []).map(String).filter(Boolean);
      updateData.monthly_review_questions = JSON.stringify(normalizedMonthly);
    }
    
    if (cycle_summary_questions !== undefined) {
      const normalizedCycleSummary = (cycle_summary_questions ?? []).map(String).filter(Boolean);
      updateData.cycle_summary_questions = JSON.stringify(normalizedCycleSummary);
    }

    if (theme_preference !== undefined) {
      updateData.theme_preference = theme_preference;
    }

    if (works_weekends !== undefined) {
      updateData.works_weekends = works_weekends;
    }

    // Handle tour state
    if (has_seen_tour !== undefined) {
      updateData.has_seen_tour = has_seen_tour === true;
      console.log('Saving has_seen_tour:', has_seen_tour);
    }

    const { error } = await supabaseClient
      .from('user_settings')
      .upsert(updateData, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving settings:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save settings' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in save-user-settings:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
