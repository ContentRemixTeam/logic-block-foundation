import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserIdFromJWT(authHeader: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.substring(7);
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.sub;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const userId = getUserIdFromJWT(authHeader || '');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const beliefId = url.searchParams.get('belief_id');

    if (!beliefId) {
      return new Response(
        JSON.stringify({ error: 'belief_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get belief with evidence logs
    const { data: belief, error: beliefError } = await supabase
      .from('beliefs')
      .select('*')
      .eq('belief_id', beliefId)
      .eq('user_id', userId)
      .single();

    if (beliefError) {
      console.error('Error fetching belief:', beliefError);
      throw beliefError;
    }

    // Get evidence logs for this belief
    const { data: evidenceLogs, error: evidenceError } = await supabase
      .from('belief_evidence_logs')
      .select('*')
      .eq('belief_id', beliefId)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (evidenceError) {
      console.error('Error fetching evidence logs:', evidenceError);
    }

    return new Response(
      JSON.stringify({
        ...belief,
        evidence_logs: evidenceLogs || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-belief:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
