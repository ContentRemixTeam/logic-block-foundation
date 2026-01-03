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

    const { date, what_worked, what_didnt, wins } = await req.json();
    console.log(`Saving daily review for user ${user.id}, date: ${date}`);

    // Get the daily plan for this date
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

    // If no daily plan exists for this date, create one
    let dayId = dailyPlan?.day_id;
    if (!dayId) {
      console.log('Creating daily plan for date:', date);
      const { data: newPlan, error: createError } = await supabase
        .from('daily_plans')
        .insert({
          user_id: user.id,
          date: date,
          top_3_today: [],
        })
        .select('day_id')
        .single();

      if (createError) {
        console.error('Error creating daily plan:', createError);
        throw createError;
      }
      dayId = newPlan.day_id;
    }

    // Check if review already exists
    const { data: existingReview, error: checkError } = await supabase
      .from('daily_reviews')
      .select('review_id')
      .eq('user_id', user.id)
      .eq('day_id', dayId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing review:', checkError);
      throw checkError;
    }

    let result;
    if (existingReview) {
      // Update existing review
      const { data, error } = await supabase
        .from('daily_reviews')
        .update({
          what_worked,
          what_didnt,
          wins,
          updated_at: new Date().toISOString(),
        })
        .eq('review_id', existingReview.review_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Updated existing review');
    } else {
      // Create new review
      const { data, error } = await supabase
        .from('daily_reviews')
        .insert({
          user_id: user.id,
          day_id: dayId,
          what_worked,
          what_didnt,
          wins,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Created new review');
    }

    return new Response(
      JSON.stringify({ success: true, review: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in save-daily-review:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
