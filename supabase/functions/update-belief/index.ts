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

    const { 
      belief_id,
      limiting_belief, 
      upgraded_belief, 
      evidence_for_new_belief,
      action_commitments,
      confidence_score
    } = await req.json();

    if (!belief_id) {
      return new Response(
        JSON.stringify({ error: 'belief_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const updateData: any = {};
    if (limiting_belief !== undefined) updateData.limiting_belief = limiting_belief.trim();
    if (upgraded_belief !== undefined) updateData.upgraded_belief = upgraded_belief.trim();
    if (evidence_for_new_belief !== undefined) updateData.evidence_for_new_belief = evidence_for_new_belief;
    if (action_commitments !== undefined) updateData.action_commitments = action_commitments;
    if (confidence_score !== undefined) updateData.confidence_score = confidence_score;

    const { data, error } = await supabase
      .from('beliefs')
      .update(updateData)
      .eq('belief_id', belief_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating belief:', error);
      throw error;
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-belief:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
