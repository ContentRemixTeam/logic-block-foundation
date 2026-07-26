// Public (unauthenticated) testimonial submission endpoint.
// Validates input, rate limits per IP, and writes with the service role so the
// workshop_testimonials table stays closed to direct client inserts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FN = 'submit-workshop-testimonial';
const RATE_LIMIT = { requests: 5, windowMs: 10 * 60 * 1000 };
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Deterministic UUID derived from the client IP (rate_limits.user_id is a uuid). */
async function ipKey(ip: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${FN}:${ip}`)),
  );
  const hex = Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid request body' }, 400);
    }

    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const businessName = String(body.business_name ?? '').trim();
    const testimonial = String(body.testimonial ?? '').trim();
    const ratingRaw = Number(body.rating);
    const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : 5;

    // Same limits the previous RLS policy enforced.
    if (!email || email.length < 3 || email.length > 255 || !EMAIL_RE.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }
    if (name.length < 1 || name.length > 200) {
      return json({ error: 'Please enter your name (up to 200 characters).' }, 400);
    }
    if (testimonial.length < 1 || testimonial.length > 5000) {
      return json({ error: 'Please share a testimonial (up to 5000 characters).' }, 400);
    }
    if (businessName.length > 200) {
      return json({ error: 'Business name is too long.' }, 400);
    }

    // Rate limit per IP using the shared rate_limits pattern.
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';
    const key = await ipKey(ip);
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT.windowMs);

    const { data: existing } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', key)
      .eq('endpoint', FN)
      .maybeSingle();

    if (!existing || new Date(existing.window_start) < windowStart) {
      await supabase.from('rate_limits').upsert(
        { user_id: key, endpoint: FN, request_count: 1, window_start: now.toISOString() },
        { onConflict: 'user_id,endpoint' },
      );
    } else if ((existing.request_count ?? 0) >= RATE_LIMIT.requests) {
      return json({ error: 'Too many submissions right now. Please try again in a few minutes.' }, 429);
    } else {
      await supabase
        .from('rate_limits')
        .update({ request_count: (existing.request_count ?? 0) + 1 })
        .eq('user_id', key)
        .eq('endpoint', FN);
    }

    const { error } = await supabase.from('workshop_testimonials').insert({
      name: name.slice(0, 200),
      email,
      business_name: businessName ? businessName.slice(0, 200) : null,
      testimonial: testimonial.slice(0, 5000),
      rating,
      engine_data: body.engine_data ?? null,
    });

    if (error) {
      console.error(`[${FN}] insert failed:`, error.message);
      return json({ error: 'We could not save your testimonial. Please try again.' }, 500);
    }

    console.log(`[${FN}] testimonial stored`);
    return json({ success: true });
  } catch (error: unknown) {
    console.error(`[${FN}] error:`, error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
