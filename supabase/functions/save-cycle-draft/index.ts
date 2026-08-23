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

    const {
      draft_data,
      current_step,
      logical_plan_key,
      request_id,
      draft_revision,
      expected_draft_id,
      expected_updated_at,
      expected_draft_revision,
      expect_absent,
    } = await req.json();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if ((logical_plan_key && !uuidPattern.test(logical_plan_key))
      || (request_id && !uuidPattern.test(request_id))
      || !draft_revision || !uuidPattern.test(draft_revision)
      || (expected_draft_id && !uuidPattern.test(expected_draft_id))
      || (expected_draft_revision && !uuidPattern.test(expected_draft_revision))
      || (expected_updated_at && !Number.isFinite(Date.parse(expected_updated_at)))
      || typeof expect_absent !== 'boolean'
      || (expect_absent && (expected_draft_id || expected_updated_at || expected_draft_revision))
      || (!expect_absent && (!expected_draft_id
        || (!expected_draft_revision && !expected_updated_at)))) {
      return new Response(JSON.stringify({ error: 'Invalid reconciliation identity' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Saving draft for user:', user.id, 'step:', current_step);

    const { data, error } = await supabase
      .rpc('save_cycle_draft_v2', {
        p_draft_data: draft_data,
        p_current_step: current_step || 1,
        p_logical_plan_key: logical_plan_key || null,
        p_request_id: request_id || null,
        p_draft_revision: draft_revision,
        p_expected_draft_id: expected_draft_id || null,
        p_expected_updated_at: expected_updated_at || null,
        p_expected_draft_revision: expected_draft_revision || null,
        p_expect_absent: expect_absent,
      });

    if (error) {
      console.error('Error saving draft:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data?.success || data?.conflict) {
      return new Response(JSON.stringify(data), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Draft saved successfully:', data?.id);
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
