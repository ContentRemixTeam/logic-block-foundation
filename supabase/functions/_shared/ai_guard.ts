// Shared auth + rate limiting guard for AI generation edge functions.
// Uses the SAME public.rate_limits table/pattern as save-daily-plan.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const aiCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI generations are expensive — cap them tighter than normal mutations.
const AI_RATE_LIMIT = { requests: 15, windowMs: 60000 };

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

/** Validates the caller's JWT. Returns the user id, or null when unauthenticated. */
export async function getAuthenticatedUser(
  req: Request
): Promise<{ userId: string | null; supabase: ReturnType<typeof serviceClient> }> {
  const supabase = serviceClient();
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, supabase };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error('AI guard: JWT validation failed', error?.message);
    return { userId: null, supabase };
  }

  return { userId: data.user.id, supabase };
}

export function unauthorizedResponse(headers: Record<string, string> = aiCorsHeaders) {
  return new Response(
    JSON.stringify({ error: 'You need to be signed in to use AI generation.', code: 'UNAUTHORIZED' }),
    { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}

/** Same window/upsert pattern as save-daily-plan's checkRateLimit. */
export async function checkAiRateLimit(
  supabase: any,
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - AI_RATE_LIMIT.windowMs);

    const { data: existing } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (!existing || new Date(existing.window_start) < windowStart) {
      await supabase.from('rate_limits').upsert(
        {
          user_id: userId,
          endpoint,
          request_count: 1,
          window_start: now.toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      );
      return { allowed: true };
    }

    if (existing.request_count >= AI_RATE_LIMIT.requests) {
      const windowEnd = new Date(existing.window_start).getTime() + AI_RATE_LIMIT.windowMs;
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
    console.error('AI rate limit check error (allowing request):', error);
    return { allowed: true };
  }
}

export function aiRateLimitResponse(retryAfter: number, headers: Record<string, string> = aiCorsHeaders) {
  return new Response(
    JSON.stringify({
      error: "That's a lot of ideas at once — take a breath and try again in a moment.",
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: retryAfter,
    }),
    {
      status: 429,
      headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    }
  );
}

/**
 * One-call guard: returns { userId, supabase } on success or a Response to return immediately.
 */
export async function guardAiRequest(
  req: Request,
  endpoint: string,
  headers: Record<string, string> = aiCorsHeaders
): Promise<
  | { ok: true; userId: string; supabase: ReturnType<typeof serviceClient> }
  | { ok: false; response: Response }
> {
  const { userId, supabase } = await getAuthenticatedUser(req);
  if (!userId) {
    return { ok: false, response: unauthorizedResponse(headers) };
  }

  const rate = await checkAiRateLimit(supabase, userId, endpoint);
  if (!rate.allowed) {
    return { ok: false, response: aiRateLimitResponse(rate.retryAfter!, headers) };
  }

  return { ok: true, userId, supabase };
}
