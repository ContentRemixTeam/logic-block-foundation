import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ghl-api-key, x-webhook-secret',
};

type PlannerOffer = 'annual' | 'lifetime';

const PLANNER_PRODUCTS = {
  annual: '6a66194eef7b0732eca1d699',
  lifetime: '6a661949ef7b076cc4a1d68b',
} as const;

const PLANNER_PRICES = {
  annual: '6a66195cef7b077ab8a1d771',
  lifetime: '6a66195a03821ead5895d089',
} as const;

function authorized(req: Request): boolean {
  const secret = Deno.env.get('GHL_WEBHOOK_SECRET');
  const supplied = req.headers.get('X-GHL-Api-Key')
    ?? req.headers.get('X-Webhook-Secret')
    ?? req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(secret && supplied && supplied.length === secret.length &&
    supplied.split('').every((char, index) => char === secret[index]));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function addOneYear(date: Date) {
  return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
}

function getOffer(body: Record<string, any>): PlannerOffer | null {
  const productId = String(body.productId ?? body.product_id ?? body.data?.productId ?? body.order?.productId ?? '');
  const priceId = String(body.priceId ?? body.price_id ?? body.data?.priceId ?? body.order?.priceId ?? '');
  if (productId === PLANNER_PRODUCTS.annual && priceId === PLANNER_PRICES.annual) return 'annual';
  if (productId === PLANNER_PRODUCTS.lifetime && priceId === PLANNER_PRICES.lifetime) return 'lifetime';
  if (productId || priceId) return null;

  const value = String(
    body.planner_offer ?? body.offer ?? body.product ?? body.product_name ??
    body.order?.productName ?? body.data?.productName ?? ''
  ).toLowerCase();
  if (value.includes('lifetime')) return 'lifetime';
  if (value.includes('annual') || value.includes('year')) return 'annual';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await req.json() as Record<string, any>;
    const email = String(body.email ?? body.contact?.email ?? body.data?.email ?? '').trim().toLowerCase();
    const offer = getOffer(body);
    if (!email || !email.includes('@')) return json({ error: 'A valid email is required' }, 400);
    if (!offer) return json({ error: 'planner_offer must be explicitly annual or lifetime' }, 400);

    const incomingOrderId = String(body.orderId ?? body.order_id ?? body.data?.orderId ?? body.order?.id ?? '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const today = new Date();

    const { data: existing, error: lookupError } = await supabase
      .from('entitlements')
      .select('id, email, first_name, last_name, planner_tier, planner_status, planner_ends_at, planner_order_id')
      .ilike('email', email)
      .maybeSingle();
    if (lookupError) return json({ error: lookupError.message }, 500);

    if (existing && incomingOrderId && existing.planner_order_id === incomingOrderId) {
      return json({ success: true, replayed: true, entitlement: existing });
    }

    const existingEnd = existing?.planner_ends_at
      ? new Date(`${existing.planner_ends_at}T12:00:00`)
      : null;
    const annualBase = existingEnd && existingEnd > today ? existingEnd : today;
    const endsAt = offer === 'annual' ? addOneYear(annualBase).toISOString().slice(0, 10) : null;

    const values = {
      planner_tier: offer,
      planner_status: 'active',
      planner_starts_at: today.toISOString().slice(0, 10),
      planner_ends_at: endsAt,
      planner_product_id: String(body.productId ?? body.product_id ?? body.data?.productId ?? body.order?.productId ?? PLANNER_PRODUCTS[offer]),
      planner_price_id: String(body.priceId ?? body.price_id ?? body.data?.priceId ?? body.order?.priceId ?? PLANNER_PRICES[offer]),
      planner_order_id: incomingOrderId,
      planner_last_purchase_at: new Date().toISOString(),
      first_name: body.first_name ?? body.firstName ?? body.contact?.first_name ?? existing?.first_name ?? null,
      last_name: body.last_name ?? body.lastName ?? body.contact?.last_name ?? existing?.last_name ?? null,
    };

    const result = existing
      ? await supabase.from('entitlements').update(values).eq('id', existing.id).select('id, email, planner_tier, planner_status, planner_starts_at, planner_ends_at').single()
      : await supabase.from('entitlements').insert({ email, tier: 'planner', ...values }).select('id, email, planner_tier, planner_status, planner_starts_at, planner_ends_at').single();

    if (result.error) return json({ error: result.error.message }, 500);
    return json({ success: true, entitlement: result.data });
  } catch (error) {
    console.error('[ghl-webhook-grant-planner]', error);
    return json({ error: 'Invalid request' }, 400);
  }
});
