import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('EDGE FUNC: get-current-cycle-or-create called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth header to validate the token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the user's token by calling getUser
    const { data: userData, error: userError } = await authClient.auth.getUser();
    
    if (userError || !userData?.user?.id) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try to get current cycle
    const { data: cycleData } = await supabaseClient.rpc('get_current_cycle', {
      p_user_id: userId,
    });

    if (cycleData && cycleData.length > 0) {
      // Fetch full cycle data including diagnostic fields
      const { data: fullCycle } = await supabaseClient
        .from('cycles_90_day')
        .select('*')
        .eq('cycle_id', cycleData[0].cycle_id)
        .single();

      return new Response(
        JSON.stringify({
          cycle: {
            ...cycleData[0],
            discover_score: fullCycle?.discover_score || null,
            nurture_score: fullCycle?.nurture_score || null,
            convert_score: fullCycle?.convert_score || null,
            focus_area: fullCycle?.focus_area || null,
            metric_1_name: fullCycle?.metric_1_name || null,
            metric_1_start: fullCycle?.metric_1_start || null,
            metric_2_name: fullCycle?.metric_2_name || null,
            metric_2_start: fullCycle?.metric_2_start || null,
            metric_3_name: fullCycle?.metric_3_name || null,
            metric_3_start: fullCycle?.metric_3_start || null,
          },
          auto_created: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // No active cycle - auto-create one
    console.log('No active cycle found - auto-creating one');

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);

    const { data: newCycle, error: cycleError } = await supabaseClient
      .from('cycles_90_day')
      .insert({
        user_id: userId,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        goal: 'My 90-Day Goal',
        why: '',
        identity: '',
        target_feeling: '',
        supporting_projects: [],
        discover_score: 5,
        nurture_score: 5,
        convert_score: 5,
        focus_area: null,
      })
      .select()
      .single();

    if (cycleError) {
      console.error('Error auto-creating cycle:', cycleError);
      return new Response(
        JSON.stringify({ error: 'Failed to create cycle' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Cycle auto-created successfully:', newCycle.cycle_id);

    // Return cycle data in same format as RPC
    return new Response(
      JSON.stringify({
        cycle: {
          cycle_id: newCycle.cycle_id,
          goal: newCycle.goal,
          why: newCycle.why,
          identity: newCycle.identity,
          target_feeling: newCycle.target_feeling,
          start_date: newCycle.start_date,
          end_date: newCycle.end_date,
          days_remaining: 90,
          discover_score: newCycle.discover_score,
          nurture_score: newCycle.nurture_score,
          convert_score: newCycle.convert_score,
          focus_area: newCycle.focus_area,
        },
        auto_created: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in get-current-cycle-or-create:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});