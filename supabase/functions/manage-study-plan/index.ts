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

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, course_id, plan_id, client_op_id, weeks = 6, ...data } = body;

    // Verify course ownership
    if (course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', course_id)
        .eq('user_id', userId)
        .single();

      if (!course) {
        return new Response(JSON.stringify({ error: 'Course not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    switch (action) {
      case 'save': {
        if (!course_id) {
          return new Response(JSON.stringify({ error: 'course_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Upsert study plan
        const { data: plan, error } = await supabase
          .from('course_study_plans')
          .upsert(
            {
              user_id: userId,
              course_id: course_id,
              sessions_per_week: data.sessions_per_week || 3,
              session_minutes: data.session_minutes || 45,
              preferred_days: data.preferred_days || [1, 3, 5],
              start_date: data.start_date,
              target_finish_date: data.target_finish_date || null,
            },
            { onConflict: 'user_id,course_id' }
          )
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ plan }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate_sessions': {
        if (!course_id || !plan_id || !client_op_id) {
          return new Response(JSON.stringify({ error: 'course_id, plan_id, and client_op_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Call the RPC function
        const { data: result, error } = await supabase.rpc('generate_course_study_sessions', {
          p_course_id: course_id,
          p_plan_id: plan_id,
          p_client_op_id: client_op_id,
          p_from_date: new Date().toISOString().split('T')[0],
          p_weeks: weeks,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'regenerate_future': {
        if (!course_id || !plan_id || !client_op_id) {
          return new Response(JSON.stringify({ error: 'course_id, plan_id, and client_op_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const today = new Date().toISOString().split('T')[0];

        // Delete incomplete future sessions
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('user_id', userId)
          .eq('course_id', course_id)
          .eq('task_type', 'course_session')
          .eq('is_system_generated', true)
          .neq('status', 'done')
          .gte('scheduled_date', today);

        if (deleteError) throw deleteError;

        // Generate new sessions
        const { data: result, error } = await supabase.rpc('generate_course_study_sessions', {
          p_course_id: course_id,
          p_plan_id: plan_id,
          p_client_op_id: client_op_id,
          p_from_date: today,
          p_weeks: weeks,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Error in manage-study-plan:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
