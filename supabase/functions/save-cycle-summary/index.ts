import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.sub || null;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  console.log('EDGE FUNC: save-cycle-summary called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      cycle_id,
      identity_shifts,
      final_results,
      next_cycle_focus,
      cycle_score,
    } = body;

    if (!cycle_id) {
      return new Response(
        JSON.stringify({ error: 'Missing cycle_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Normalize arrays
    const normalizedShifts = (identity_shifts ?? []).map(String).filter(Boolean);
    const normalizedResults = (final_results ?? []).map(String).filter(Boolean);
    const normalizedFocus = (next_cycle_focus ?? []).map(String).filter(Boolean);

    // Store cycle summary in supporting_projects field as JSONB
    const summaryData = {
      identity_shifts: normalizedShifts,
      final_results: normalizedResults,
      next_cycle_focus: normalizedFocus,
      cycle_score: Number(cycle_score ?? 5),
      completed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseClient
      .from('cycles_90_day')
      .update({
        supporting_projects: summaryData,
        updated_at: new Date().toISOString(),
      })
      .eq('cycle_id', cycle_id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error saving cycle summary:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save cycle summary' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in save-cycle-summary:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
