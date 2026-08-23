import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let expectedIdentity: { logical_plan_key?: string; request_id?: string } = {};
    if (req.method !== 'DELETE' || req.headers.get('content-length') !== '0') {
      try {
        expectedIdentity = await req.json();
      } catch {
        expectedIdentity = {};
      }
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if ((expectedIdentity.logical_plan_key && !uuidPattern.test(expectedIdentity.logical_plan_key))
      || (expectedIdentity.request_id && !uuidPattern.test(expectedIdentity.request_id))) {
      return new Response(JSON.stringify({ error: 'Invalid reconciliation identity' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Deleting owned draft for user:', user.id);

    let deleteQuery = supabase
      .from('cycle_drafts')
      .delete()
      .eq('user_id', user.id);
    if (expectedIdentity.logical_plan_key) {
      deleteQuery = deleteQuery.eq('logical_plan_key', expectedIdentity.logical_plan_key);
    }
    if (expectedIdentity.request_id) {
      deleteQuery = deleteQuery.eq('reconciliation_request_id', expectedIdentity.request_id);
    }
    const { data, error } = await deleteQuery.select('id');

    if (error) {
      console.error('Error deleting draft:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((expectedIdentity.logical_plan_key || expectedIdentity.request_id) && data?.length !== 1) {
      return new Response(JSON.stringify({ error: 'Draft changed after this Planner receipt; newer recovery state was preserved.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Draft deleted successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
