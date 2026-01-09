import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Try to get user ID from auth header if present
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await authClient.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    const body = await req.json();
    const { error_type, error_message, error_stack, component, route, metadata } = body;

    if (!error_type || !error_message) {
      return new Response(
        JSON.stringify({ error: 'error_type and error_message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to insert error log
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabaseClient
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type,
        error_message,
        error_stack: error_stack || null,
        component: component || null,
        route: route || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Error logged:', data.id, '-', error_type, '-', error_message);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in log-error function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});