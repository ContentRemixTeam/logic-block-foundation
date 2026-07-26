// Shared helpers for GoHighLevel webhook endpoints.
// Never logs or returns the webhook secret.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-ghl-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Constant-time-ish comparison of the provided key against GHL_WEBHOOK_SECRET. */
export function verifyWebhookAuth(req: Request): boolean {
  const secret = Deno.env.get('GHL_WEBHOOK_SECRET');
  if (!secret) {
    console.error('GHL_WEBHOOK_SECRET not configured - rejecting request');
    return false;
  }

  const apiKey =
    req.headers.get('X-Webhook-Secret') ||
    req.headers.get('X-GHL-Api-Key') ||
    req.headers.get('Authorization')?.replace('Bearer ', '') ||
    '';

  if (!apiKey) {
    console.error('No webhook secret provided in request headers');
    return false;
  }
  if (apiKey.length !== secret.length) return false;

  let result = 0;
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return result === 0;
}

type Payload = Record<string, any>;

/** GHL payloads vary in shape; dig through the common wrappers. */
function pick(body: Payload, keys: string[]): string {
  const scopes = [body, body?.contact, body?.data, body?.data?.contact, body?.customData];
  for (const scope of scopes) {
    if (!scope || typeof scope !== 'object') continue;
    for (const key of keys) {
      const value = scope[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
  }
  return '';
}

export interface ParsedContact {
  email: string;
  firstName: string;
  lastName: string;
  ghlContactId: string;
  reason: string;
  raw: Payload;
}

export function parseContact(body: Payload): ParsedContact {
  return {
    email: pick(body, ['email', 'Email']).toLowerCase(),
    firstName: pick(body, ['first_name', 'firstName']),
    lastName: pick(body, ['last_name', 'lastName']),
    ghlContactId: pick(body, ['ghl_contact_id', 'contact_id', 'contactId', 'id']),
    reason: pick(body, ['reason', 'cancellation_reason']),
    raw: body,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string) => EMAIL_RE.test(email) && email.length <= 255;

/** Redacted payload summary safe for logs. */
export function safeLog(fn: string, contact: ParsedContact) {
  console.log(
    `[${fn}] request`,
    JSON.stringify({
      email: contact.email,
      has_first_name: Boolean(contact.firstName),
      has_last_name: Boolean(contact.lastName),
      ghl_contact_id: contact.ghlContactId || null,
    }),
  );
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Server configuration error: missing Supabase credentials');
  return createClient(url, key, { auth: { persistSession: false } });
}

export const today = () => new Date().toISOString().split('T')[0];

/**
 * Standard wrapper: CORS preflight, method check, auth, JSON parsing.
 */
export async function withWebhook(
  fnName: string,
  req: Request,
  handler: (contact: ParsedContact, body: Payload) => Promise<Response>,
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!verifyWebhookAuth(req)) {
    console.error(`[${fnName}] authentication failed`);
    return json({ success: false, error: 'Unauthorized - invalid or missing webhook secret' }, 401);
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const contact = parseContact(body);
  safeLog(fnName, contact);

  if (!contact.email || !isValidEmail(contact.email)) {
    return json({ success: false, error: 'A valid email is required' }, 400);
  }

  try {
    return await handler(contact, body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${fnName}] error:`, message);
    return json({ success: false, error: message }, 500);
  }
}
