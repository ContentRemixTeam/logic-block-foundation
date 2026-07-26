// Grants Becoming Boss Mastermind access to the planner app.
import { withWebhook, json, serviceClient, today } from '../_shared/ghl_webhook.ts';

const FN = 'ghl-webhook-add-member';

Deno.serve((req) =>
  withWebhook(FN, req, async (contact) => {
    const supabase = serviceClient();
    const { email, firstName, lastName, ghlContactId } = contact;

    // Idempotent upsert keyed on normalized email.
    const { data: existing } = await supabase
      .from('entitlements')
      .select('starts_at')
      .eq('email', email)
      .maybeSingle();

    const { data, error } = await supabase
      .from('entitlements')
      .upsert(
        {
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          ghl_contact_id: ghlContactId || null,
          tier: 'mastermind',
          status: 'active',
          starts_at: existing?.starts_at ?? today(),
          ends_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      )
      .select()
      .single();

    if (error) {
      console.error(`[${FN}] database error:`, error.message);
      return json({ success: false, error: 'Failed to add member', details: error.message }, 500);
    }

    // Upgrade an existing profile if the person already signed up.
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        membership_tier: 'mastermind',
        membership_status: 'active',
        user_type: 'member',
      })
      .eq('email', email);

    if (profileError) {
      console.log(`[${FN}] profile not updated (user may not exist yet):`, profileError.message);
    }

    console.log(`[${FN}] mastermind access activated`);
    return json({
      success: true,
      action: existing ? 'updated' : 'created',
      message: `Mastermind access active for ${email}`,
      entitlement: data,
    });
  }),
);
