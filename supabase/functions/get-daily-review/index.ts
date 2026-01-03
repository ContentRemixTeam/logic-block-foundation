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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const { date } = await req.json();
    console.log(`Fetching daily review for user ${user.id}, date: ${date}`);

    // Get the daily plan for this date first
    const { data: dailyPlan, error: planError } = await supabase
      .from('daily_plans')
      .select('day_id')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();

    if (planError) {
      console.error('Error fetching daily plan:', planError);
      throw planError;
    }

    if (!dailyPlan) {
      console.log('No daily plan found for this date');
      return new Response(
        JSON.stringify({ review: null, hasPlan: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the review for this day
    const { data: review, error: reviewError } = await supabase
      .from('daily_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('day_id', dailyPlan.day_id)
      .maybeSingle();

    if (reviewError) {
      console.error('Error fetching review:', reviewError);
      throw reviewError;
    }

    console.log('Review found:', review ? 'yes' : 'no');

    return new Response(
      JSON.stringify({ review, hasPlan: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-daily-review:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
