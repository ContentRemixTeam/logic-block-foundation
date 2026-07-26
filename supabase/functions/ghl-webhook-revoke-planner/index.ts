// Revokes paid Low Battery Planner access. Never deletes planner data.
import { withWebhook, json, serviceClient, today } from '../_shared/ghl_webhook.ts';

const FN = 'ghl-webhook-revoke-planner';

Deno.serve((req) =>
  withWebhook(FN, req, async (contact) => {
    const supabase = serviceClient();
    const { email, ghlContactId, reason } = contact;

    const { data: existing } = await supabase
      .from('entitlements')
      .select('id, planner_status, planner_tier, planner_ends_at')
      .eq('email', email)
      .maybeSingle();

    const alreadyRevoked =
      !existing?.planner_status || existing.planner_status === 'cancelled';

    let entitlement = existing;

    if (existing && !alreadyRevoked) {
      // Only planner_* fields change — Mastermind tier/status untouched.
      const endsAt =
        existing.planner_tier === 'lifetime' || !existing.planner_ends_at
          ? today()
          : existing.planner_ends_at < today()
            ? existing.planner_ends_at
            : today();

      const { data, error } = await supabase
        .from('entitlements')
        .update({
          planner_status: 'cancelled',
          planner_ends_at: endsAt,
          ghl_contact_id: ghlContactId || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select()
        .single();

      if (error) {
        console.error(`[${FN}] database error:`, error.message);
        return json(
          { success: false, error: 'Failed to revoke planner access', details: error.message },
          500,
        );
      }
      entitlement = data;
    }

    // Mirror the revocation into member_access (runtime gate), if a row exists.
    const { data: access } = await supabase
      .from('member_access')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    if (access && access.status !== 'revoked') {
      const { error: accessError } = await supabase
        .from('member_access')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (accessError) {
        console.error(`[${FN}] member_access error:`, accessError.message);
        return json({ success: false, error: 'Failed to revoke access', details: accessError.message }, 500);
      }
    }

    const noChange = alreadyRevoked && (!access || access.status === 'revoked');
    console.log(
      `[${FN}] planner access ${noChange ? 'already revoked' : 'revoked'}`,
      reason ? '(reason provided)' : '',
    );

    return json({
      success: true,
      action: noChange ? 'noop' : 'revoked',
      message: noChange
        ? `Planner access already revoked for ${email}`
        : `Planner access revoked for ${email}`,
      reason: reason || null,
      entitlement: entitlement ?? null,
    });
  }),
);
