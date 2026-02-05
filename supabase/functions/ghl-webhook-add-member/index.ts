import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify webhook request using API key authentication
function verifyWebhookAuth(req: Request): boolean {
  const GHL_WEBHOOK_SECRET = Deno.env.get('GHL_WEBHOOK_SECRET');
  
  // If no secret is configured, reject all requests (fail secure)
  if (!GHL_WEBHOOK_SECRET) {
    console.error('GHL_WEBHOOK_SECRET not configured - rejecting request');
    return false;
  }
  
  // Check for API key in headers (GoHighLevel custom header or Authorization)
  const apiKey = req.headers.get('X-GHL-Api-Key') || 
                 req.headers.get('X-Webhook-Secret') ||
                 req.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    console.error('No API key provided in request headers');
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  if (apiKey.length !== GHL_WEBHOOK_SECRET.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ GHL_WEBHOOK_SECRET.charCodeAt(i);
  }
  
  return result === 0;
}

Deno.serve(async (req) => {
  console.log('GHL Webhook: Add Member called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Verify webhook authentication
  if (!verifyWebhookAuth(req)) {
    console.error('Webhook authentication failed');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid or missing API key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    console.log('Received payload:', JSON.stringify(body));

    // Extract email from various possible GHL payload structures
    const email = body.email || body.contact?.email || body.data?.email || body.data?.contact?.email;
    const firstName = body.first_name || body.firstName || body.contact?.first_name || body.data?.first_name || '';
    const lastName = body.last_name || body.lastName || body.contact?.last_name || body.data?.last_name || '';

    if (!email) {
      console.error('No email found in payload');
      return new Response(
        JSON.stringify({ error: 'Email is required', received: body }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upsert into entitlements table
    const { data, error } = await supabase
      .from('entitlements')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          first_name: firstName,
          last_name: lastName,
          tier: 'mastermind',
          status: 'active',
          starts_at: new Date().toISOString().split('T')[0],
          ends_at: null, // Active until cancelled
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false 
        }
      )
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to add member', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also update user_profiles if user already exists (for trial-to-member upgrades)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        membership_tier: 'mastermind',
        membership_status: 'active',
        user_type: 'member'
      })
      .eq('email', email.toLowerCase().trim());

    if (profileError) {
      console.log('Profile update (user may not exist yet):', profileError.message);
      // Not fatal - profile will be updated on next login via useMembership hook
    } else {
      console.log('User profile upgraded to member:', email);
    }

    console.log('Member added successfully:', email);
    return new Response(
      JSON.stringify({ success: true, message: `Member ${email} added`, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ghl-webhook-add-member:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
