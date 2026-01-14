import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyEmailRequest {
  email: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: VerifyEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-member-email] Checking email: ${email}`);

    // Check if email exists in entitlements table with mastermind tier
    const { data: entitlement, error } = await supabase
      .from('entitlements')
      .select('id, first_name, last_name, tier, status')
      .ilike('email', email)
      .eq('tier', 'mastermind')
      .maybeSingle();

    if (error) {
      console.error('[verify-member-email] Query error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!entitlement) {
      console.log(`[verify-member-email] Email not found: ${email}`);
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-member-email] Email found: ${email}, status: ${entitlement.status}`);

    return new Response(
      JSON.stringify({ 
        found: true, 
        firstName: entitlement.first_name || '',
        lastName: entitlement.last_name || '',
        entitlementId: entitlement.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[verify-member-email] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Couldn\'t verify your membership. Please try again or contact support.',
        code: 'VERIFICATION_ERROR',
        technical: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
