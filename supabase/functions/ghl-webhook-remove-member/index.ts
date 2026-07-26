// Revokes Mastermind access. Never deletes users or planner data.
import { withWebhook, json, serviceClient, today } from '../_shared/ghl_webhook.ts';

const FN = 'ghl-webhook-remove-member';

Deno.serve((req) =>
  withWebhook(FN, req, async (contact) => {
    const supabase = serviceClient();
    const { email, ghlContactId, reason } = contact;

    const { data: existing } = await supabase
      .from('entitlements')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    if (!existing) {
      console.log(`[${FN}] no entitlement found for`, email);
      return json({
        success: true,
        action: 'noop',
        message: `No Mastermind entitlement found for ${email} (already removed)`,
      });
    }

    if (existing.status === 'cancelled') {
      console.log(`[${FN}] already cancelled for`, email);
      return json({
        success: true,
        action: 'noop',
        message: `Mastermind access already cancelled for ${email}`,
      });
    }

    const { data, error } = await supabase
      .from('entitlements')
      .update({
        status: 'cancelled',
        ends_at: today(),
        ghl_contact_id: ghlContactId || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error(`[${FN}] database error:`, error.message);
      return json({ success: false, error: 'Failed to remove member', details: error.message }, 500);
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ membership_status: 'expired' })
      .eq('email', email);

    if (profileError) {
      console.log(`[${FN}] profile not updated:`, profileError.message);
    }

    console.log(`[${FN}] mastermind access cancelled for`, email, reason ? `(reason: ${reason})` : '');
    return json({
      success: true,
      action: 'cancelled',
      message: `Mastermind access cancelled for ${email}`,
      reason: reason || null,
      entitlement: data,
    });
  }),
);
