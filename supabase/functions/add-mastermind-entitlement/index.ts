import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddMemberRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  entitlementId?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate the caller — must be a signed-in user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerEmail = userData.user.email.toLowerCase();

    // Service-role client to bypass RLS for the actual write
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, firstName, lastName, entitlementId }: AddMemberRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: caller must either be an admin OR be granting/activating
    // an entitlement for their OWN email (i.e. self-claiming a pre-provisioned membership).
    const { data: isAdminRow } = await supabase
      .from('admin_users')
      .select('id')
      .or(`user_id.eq.${userData.user.id},email.ilike.${callerEmail}`)
      .maybeSingle();

    const isAdmin = !!isAdminRow;
    const isSelf = email.toLowerCase() === callerEmail;

    if (!isAdmin && !isSelf) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Non-admins (self-claim) may ONLY activate an existing pre-provisioned
    // mastermind entitlement for their own email — not create a brand new one.
    console.log(`[add-mastermind-entitlement] Caller: ${callerEmail}, target: ${email}, admin: ${isAdmin}`);

    if (entitlementId) {
      // Verify ownership of the entitlement when not admin
      if (!isAdmin) {
        const { data: ent } = await supabase
          .from('entitlements')
          .select('id, email')
          .eq('id', entitlementId)
          .maybeSingle();
        if (!ent || ent.email?.toLowerCase() !== callerEmail) {
          return new Response(
            JSON.stringify({ error: 'Forbidden' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { error: updateError } = await supabase
        .from('entitlements')
        .update({
          status: 'active',
          tier: 'mastermind',
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entitlementId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Entitlement activated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existing } = await supabase
      .from('entitlements')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('entitlements')
        .update({
          status: 'active',
          tier: 'mastermind',
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Entitlement updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Creating a brand-new entitlement requires admin
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'No pre-provisioned membership found for this email. Contact support.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: insertError } = await supabase
      .from('entitlements')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName || null,
        last_name: lastName || null,
        tier: 'mastermind',
        status: 'active',
        starts_at: new Date().toISOString().split('T')[0],
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Entitlement created' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[add-mastermind-entitlement] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
