import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provision-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Constant-time string compare
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function verifySecret(req: Request): boolean {
  const expected = Deno.env.get('PROVISION_WEBHOOK_SECRET');
  if (!expected) {
    console.error('PROVISION_WEBHOOK_SECRET not configured');
    return false;
  }
  const provided = req.headers.get('x-provision-secret') || '';
  if (!provided) return false;
  return safeEqual(provided, expected);
}

// Simple in-memory rate limit per IP (per warm instance)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateStore.get(ip);
  if (!entry || entry.resetAt < now) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!rateLimit(ip)) {
    return json({ error: 'Too many requests' }, 429);
  }

  if (!verifySecret(req)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const rawEmail = (body?.email ?? '').toString().trim().toLowerCase();
  const accessLevel = body?.access_level;
  const ghlContactId = body?.ghl_contact_id ?? null;

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return json({ error: 'Valid email required' }, 400);
  }
  if (accessLevel !== 'lifetime' && accessLevel !== 'annual') {
    return json({ error: "access_level must be 'lifetime' or 'annual'" }, 400);
  }

  const expiresAt =
    accessLevel === 'annual'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  try {
    // Find existing row
    const { data: existing, error: fetchErr } = await admin
      .from('member_access')
      .select('*')
      .eq('email', rawEmail)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    let outcome: 'created' | 'updated' | 'reactivated' = 'created';

    if (existing) {
      outcome = existing.status === 'revoked' ? 'reactivated' : 'updated';
      const { error: updErr } = await admin
        .from('member_access')
        .update({
          access_level: accessLevel,
          access_expires_at: expiresAt,
          status: 'active',
          source: 'ghl',
          ghl_contact_id: ghlContactId ?? existing.ghl_contact_id,
          revoked_at: null,
        })
        .eq('id', existing.id);
      if (updErr) throw updErr;
    } else {
      // Look for existing auth user with this email
      let userId: string | null = null;
      const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      // listUsers can't filter; use RPC-less approach: try to find via profiles table
      try {
        const { data: prof } = await admin
          .from('user_profiles')
          .select('id')
          .ilike('email', rawEmail)
          .maybeSingle();
        if (prof?.id) userId = prof.id;
      } catch { /* ignore */ }

      const { error: insErr } = await admin.from('member_access').insert({
        email: rawEmail,
        access_level: accessLevel,
        access_expires_at: expiresAt,
        status: 'active',
        source: 'ghl',
        ghl_contact_id: ghlContactId,
        user_id: userId,
      });
      if (insErr) throw insErr;

      // If no user exists, send invite so they can set a password
      if (!userId) {
        const redirectTo = `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://')}`; // fallback
        const siteRedirect = Deno.env.get('PUBLIC_SITE_URL') || undefined;
        const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(rawEmail, {
          redirectTo: siteRedirect,
          data: { source: 'ghl', access_level: accessLevel },
        });
        if (inviteErr) {
          // Non-fatal: invite may fail if user already exists between checks. Log and continue.
          console.warn('inviteUserByEmail warning:', inviteErr.message);
        }
      }
    }

    // Audit log (no secrets, no headers)
    await admin.from('provision_events').insert({
      action: `provision:${outcome}`,
      email: rawEmail,
      payload: {
        access_level: accessLevel,
        ghl_contact_id: ghlContactId,
        expires_at: expiresAt,
      },
    });

    return json({ status: outcome, email: rawEmail, access_level: accessLevel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('provision-member error:', msg);
    return json({ error: msg }, 500);
  }
});
