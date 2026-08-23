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

    let expectedIdentity: {
      draft_id?: string;
      expected_updated_at?: string;
      draft_revision?: string | null;
      logical_plan_key?: string | null;
      request_id?: string | null;
      expect_absent?: boolean;
    } = {};
    try {
      expectedIdentity = await req.json();
    } catch {
      expectedIdentity = {};
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validTimestamp = typeof expectedIdentity.expected_updated_at === 'string'
      && Number.isFinite(Date.parse(expectedIdentity.expected_updated_at));
    const expectsAbsent = expectedIdentity.expect_absent === true;
    if ((!expectsAbsent && (!expectedIdentity.draft_id || !uuidPattern.test(expectedIdentity.draft_id)
      || !validTimestamp))
      || (expectedIdentity.logical_plan_key && !uuidPattern.test(expectedIdentity.logical_plan_key))
      || (expectedIdentity.request_id && !uuidPattern.test(expectedIdentity.request_id))
      || (expectedIdentity.draft_revision && !uuidPattern.test(expectedIdentity.draft_revision))) {
      return new Response(JSON.stringify({ error: 'An exact draft deletion receipt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Deleting owned draft for user:', user.id);

    const { data, error } = await supabase.rpc('delete_cycle_draft_conditionally_v2', {
      p_draft_id: expectedIdentity.draft_id || null,
      p_expected_updated_at: expectedIdentity.expected_updated_at || null,
      p_draft_revision: expectedIdentity.draft_revision || null,
      p_logical_plan_key: expectedIdentity.logical_plan_key || null,
      p_request_id: expectedIdentity.request_id || null,
      p_expect_absent: expectsAbsent,
    });

    if (error) {
      console.error('Error deleting draft:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data?.success) {
      return new Response(JSON.stringify({ error: 'Draft changed after this Planner receipt; newer recovery state was preserved.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Draft deleted successfully');
    return new Response(JSON.stringify(data), {
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
