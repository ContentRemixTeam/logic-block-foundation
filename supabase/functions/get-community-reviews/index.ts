import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch shared weekly reviews (only shared ones)
    const { data: reviews, error } = await supabase
      .from('weekly_reviews')
      .select(`
        review_id,
        wins,
        challenges,
        adjustments,
        created_at,
        week_id
      `)
      .eq('share_to_community', true)
      .not('wins', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching community reviews:', error);
      throw error;
    }

    console.log(`Fetched ${reviews?.length || 0} community reviews`);

    return new Response(JSON.stringify({ reviews: reviews || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-community-reviews:', error);
    const technicalMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Couldn\'t load community reviews. Please try again.',
      code: 'LOAD_ERROR',
      technical: technicalMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
