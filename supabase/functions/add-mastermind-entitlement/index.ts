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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, firstName, lastName, userId, entitlementId }: AddMemberRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[add-mastermind-entitlement] Processing for: ${email}, userId: ${userId}`);

    // If we have an entitlementId, update that specific record
    if (entitlementId) {
      console.log(`[add-mastermind-entitlement] Updating existing entitlement: ${entitlementId}`);
      
      const { error: updateError } = await supabase
        .from('entitlements')
        .update({ 
          status: 'active', 
          tier: 'mastermind',
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', entitlementId);

      if (updateError) {
        console.error('[add-mastermind-entitlement] Update error:', updateError);
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

    // Check if entitlement already exists by email
    const { data: existing } = await supabase
      .from('entitlements')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      console.log(`[add-mastermind-entitlement] Entitlement already exists for: ${email}`);
      
      // Update to active if not already
      await supabase
        .from('entitlements')
        .update({ 
          status: 'active', 
          tier: 'mastermind',
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Entitlement updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new entitlement (fallback, shouldn't happen with verified flow)
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
      console.error('[add-mastermind-entitlement] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[add-mastermind-entitlement] Successfully added entitlement for: ${email}`);

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
