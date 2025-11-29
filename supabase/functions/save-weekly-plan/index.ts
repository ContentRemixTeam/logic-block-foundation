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
    // Create authenticated client to get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { week_id, top_3_priorities, weekly_thought, weekly_feeling, challenges, adjustments } = body;

    console.log('Saving weekly plan for user:', user.id, 'week:', week_id);

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Validate and normalize priorities
    let priorities = [];
    if (Array.isArray(top_3_priorities)) {
      priorities = top_3_priorities.filter((p) => typeof p === 'string' && p.trim()).slice(0, 3);
    }

    // Update weekly plan
    const { data, error: updateError } = await supabaseClient
      .from('weekly_plans')
      .update({
        top_3_priorities: priorities,
        weekly_thought: weekly_thought || null,
        weekly_feeling: weekly_feeling || null,
        challenges: challenges || null,
        adjustments: adjustments || null,
        updated_at: new Date().toISOString(),
      })
      .eq('week_id', week_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating weekly plan:', updateError);
      throw updateError;
    }

    console.log('Weekly plan updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          week_id: data.week_id,
          top_3_priorities: data.top_3_priorities,
          weekly_thought: data.weekly_thought,
          weekly_feeling: data.weekly_feeling,
          challenges: data.challenges,
          adjustments: data.adjustments,
        }
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in save-weekly-plan function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
