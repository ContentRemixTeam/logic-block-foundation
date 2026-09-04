// deno-lint-ignore no-import-prefix
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type JsonObject = Record<string, unknown>;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function authorized(req: Request, secret: string): boolean {
  const supplied = req.headers.get('X-GHL-Api-Key')
    ?? req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    ?? '';
  if (supplied.length !== secret.length) return false;
  let difference = 0;
  for (let index = 0; index < supplied.length; index += 1) {
    difference |= supplied.charCodeAt(index) ^ secret.charCodeAt(index);
  }
  return difference === 0;
}

function textValue(...values: unknown[]): string {
  for (const candidate of values) {
    if (typeof candidate !== 'string' && typeof candidate !== 'number') continue;
    const normalized = String(candidate).trim();
    if (normalized) return normalized;
  }
  return '';
}

function objectValue(value: unknown): JsonObject {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('GHL_WEBHOOK_SECRET') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!secret || !supabaseUrl || !serviceKey) return json({ error: 'Webhook unavailable' }, 500);
  if (!authorized(req, secret)) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await req.json() as JsonObject;
    const contact = objectValue(body.contact);
    const data = objectValue(body.data);
    const dataContact = objectValue(data.contact);
    const order = objectValue(body.order);
    const orderProduct = objectValue(order.product);
    const orderPrice = objectValue(order.price);
    const transaction = objectValue(body.transaction);
    const email = textValue(body.email, contact.email, data.email, dataContact.email);
    const eventType = textValue(body.eventType, body.event_type, body.type, 'purchase').toLowerCase();
    const productId = textValue(body.productId, body.product_id, orderProduct.id, data.productId);
    const priceId = textValue(body.priceId, body.price_id, orderPrice.id, data.priceId);
    const orderId = textValue(body.orderId, body.order_id, order.id, data.orderId);
    const transactionId = textValue(body.transactionId, body.transaction_id, transaction.id, data.transactionId);
    const eventId = textValue(body.eventId, body.event_id, body.id,
      transactionId && `${eventType}:${transactionId}`,
      orderId && `${eventType}:${orderId}`);
    const effectiveAt = textValue(body.effectiveAt, body.effective_at, body.createdAt, body.created_at) || new Date().toISOString();

    if (!email || !eventId || !productId || !priceId) {
      return json({ error: 'email, eventId, productId, and priceId are required' }, 400);
    }

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: responseData, error } = await service.rpc('process_planner_commerce_event', {
      p_provider: 'ghl',
      p_event_id: eventId,
      p_email: email,
      p_event_type: eventType,
      p_product_id: productId,
      p_price_id: priceId,
      p_order_id: orderId || null,
      p_transaction_id: transactionId || null,
      p_effective_at: effectiveAt,
    });
    if (error) {
      const rejected = /Invalid|Unmapped|Email|required/i.test(error.message);
      return json({ error: rejected ? error.message : 'Planner entitlement update failed' }, rejected ? 422 : 500);
    }

    const result = (responseData ?? {}) as Record<string, unknown>;
    if (result.status === 'event_id_payload_conflict') return json(result, 409);
    return json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400);
    console.error('[ghl-webhook-planner-access]', error instanceof Error ? error.message : 'unknown_error');
    return json({ error: 'Webhook unavailable' }, 500);
  }
});
