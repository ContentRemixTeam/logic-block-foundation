import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('EDGE FUNC: save-user-settings called');

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's auth token for proper JWT validation
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT using Supabase's getUser - this verifies the token cryptographically
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('JWT validation error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    const body = await req.json();
    const {
      daily_review_questions,
      weekly_review_questions,
      monthly_review_questions,
      cycle_summary_questions,
      theme_preference,
      works_weekends,
      has_seen_tour,
    } = body;

    // Use service role client for database operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build update data object - only include fields that are provided
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Handle review questions arrays if provided
    if (daily_review_questions !== undefined) {
      const normalizedDaily = (daily_review_questions ?? []).map(String).filter(Boolean);
      updateData.daily_review_questions = JSON.stringify(normalizedDaily);
    }
    
    if (weekly_review_questions !== undefined) {
      const normalizedWeekly = (weekly_review_questions ?? []).map(String).filter(Boolean);
      updateData.weekly_review_questions = JSON.stringify(normalizedWeekly);
    }
    
    if (monthly_review_questions !== undefined) {
      const normalizedMonthly = (monthly_review_questions ?? []).map(String).filter(Boolean);
      updateData.monthly_review_questions = JSON.stringify(normalizedMonthly);
    }
    
    if (cycle_summary_questions !== undefined) {
      const normalizedCycleSummary = (cycle_summary_questions ?? []).map(String).filter(Boolean);
      updateData.cycle_summary_questions = JSON.stringify(normalizedCycleSummary);
    }

    if (theme_preference !== undefined) {
      updateData.theme_preference = theme_preference;
    }

    if (works_weekends !== undefined) {
      updateData.works_weekends = works_weekends;
    }

    // Handle tour state
    if (has_seen_tour !== undefined) {
      updateData.has_seen_tour = has_seen_tour === true;
      console.log('Saving has_seen_tour:', has_seen_tour);
    }

    const { error } = await supabaseClient
      .from('user_settings')
      .upsert(updateData, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving settings:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save settings' }),
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in save-user-settings:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
