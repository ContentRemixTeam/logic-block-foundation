// Grants paid Low Battery Planner access (annual or lifetime).
import { withWebhook, json, serviceClient, today } from '../_shared/ghl_webhook.ts';

const FN = 'ghl-webhook-grant-planner';

function pickOffer(body: Record<string, any>): string {
  const scopes = [body, body?.data, body?.customData, body?.contact];
  for (const scope of scopes) {
    if (!scope || typeof scope !== 'object') continue;
    const raw = scope.planner_offer ?? scope.plannerOffer ?? scope.offer ?? scope.tier;
    if (typeof raw === 'string' && raw.trim()) return raw.trim().toLowerCase();
  }
  return '';
}

function pickField(body: Record<string, any>, keys: string[]): string {
  const scopes = [body, body?.data, body?.customData];
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

function oneYearFromToday(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

Deno.serve((req) =>
  withWebhook(FN, req, async (contact, body) => {
    const offer = pickOffer(body);
    if (offer !== 'annual' && offer !== 'lifetime') {
      return json(
        { success: false, error: "planner_offer must be either 'annual' or 'lifetime'", received: offer || null },
        400,
      );
    }

    const supabase = serviceClient();
    const { email, firstName, lastName, ghlContactId } = contact;
    const productId = pickField(body, ['productId', 'product_id']);
    const priceId = pickField(body, ['priceId', 'price_id']);
    const orderId = pickField(body, ['orderId', 'order_id']);

    const startsAt = today();
    const endsAt = offer === 'annual' ? oneYearFromToday() : null;

    const { data: existing } = await supabase
      .from('entitlements')
      .select('id, tier, status, planner_purchased_at, planner_product_id, planner_price_id, planner_order_id')
      .eq('email', email)
      .maybeSingle();

    // Preserve existing Mastermind tier/status when the row already exists.
    const record: Record<string, unknown> = {
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      ghl_contact_id: ghlContactId || null,
      tier: existing?.tier ?? 'planner',
      status: existing?.status ?? 'active',
      planner_tier: offer,
      planner_status: 'active',
      planner_starts_at: startsAt,
      planner_ends_at: endsAt,
      planner_product_id: productId || existing?.planner_product_id || null,
      planner_price_id: priceId || existing?.planner_price_id || null,
      planner_order_id: orderId || existing?.planner_order_id || null,
      planner_purchased_at: existing?.planner_purchased_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('entitlements')
      .upsert(record, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      console.error(`[${FN}] database error:`, error.message);
      return json({ success: false, error: 'Failed to grant planner access', details: error.message }, 500);
    }

    // Mirror into member_access, which is what gates the app at runtime.
    const { error: accessError } = await supabase.from('member_access').upsert(
      {
        email,
        access_level: offer === 'lifetime' ? 'lifetime' : 'annual',
        access_expires_at: endsAt ? new Date(`${endsAt}T23:59:59Z`).toISOString() : null,
        status: 'active',
        source: 'ghl',
        ghl_contact_id: ghlContactId || null,
        revoked_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    );

    if (accessError) {
      console.error(`[${FN}] member_access error:`, accessError.message);
      return json(
        { success: false, error: 'Entitlement saved but access grant failed', details: accessError.message },
        500,
      );
    }

    console.log(`[${FN}] planner ${offer} access granted for`, email);
    return json({
      success: true,
      action: existing ? 'updated' : 'created',
      message: `Planner ${offer} access granted for ${email}`,
      entitlement: data,
    });
  }),
);
