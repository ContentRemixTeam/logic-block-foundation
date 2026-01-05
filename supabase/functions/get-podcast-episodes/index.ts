import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = Deno.env.get('CAPTIVATE_USER_ID');
    const apiToken = Deno.env.get('CAPTIVATE_API_TOKEN');
    const showId = Deno.env.get('CAPTIVATE_SHOW_ID');

    if (!userId || !apiToken || !showId) {
      console.error('Missing Captivate credentials');
      return new Response(
        JSON.stringify({ error: 'Captivate credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Authenticate with Captivate to get bearer token
    console.log('Authenticating with Captivate...');
    const formData = new FormData();
    formData.append('username', userId);
    formData.append('token', apiToken);

    const authResponse = await fetch('https://api.captivate.fm/authenticate/token', {
      method: 'POST',
      body: formData,
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Captivate auth failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Captivate' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json();
    const bearerToken = authData.user?.token;

    if (!bearerToken) {
      console.error('No bearer token in response:', authData);
      return new Response(
        JSON.stringify({ error: 'No token received from Captivate' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully authenticated with Captivate');

    // Step 2: Fetch episodes from the show
    console.log(`Fetching episodes for show: ${showId}`);
    const episodesResponse = await fetch(
      `https://api.captivate.fm/shows/${showId}/episodes`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      }
    );

    if (!episodesResponse.ok) {
      const errorText = await episodesResponse.text();
      console.error('Failed to fetch episodes:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch episodes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const episodesData = await episodesResponse.json();
    console.log(`Found ${episodesData.episodes?.length || 0} episodes`);

    // Get published episodes only, sorted by publish date
    const episodes = (episodesData.episodes || [])
      .filter((ep: any) => ep.status === 'published')
      .sort((a: any, b: any) => 
        new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
      );

    // Get the latest episode
    const latestEpisode = episodes[0] || null;

    // Check if episode is "new" (published within last 7 days)
    let isNew = false;
    if (latestEpisode) {
      const publishDate = new Date(latestEpisode.published_date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      isNew = publishDate > sevenDaysAgo;
    }

    const listenUrl = Deno.env.get('CAPTIVATE_LISTEN_URL') || null;

    return new Response(
      JSON.stringify({
        latestEpisode: latestEpisode ? {
          id: latestEpisode.id,
          title: latestEpisode.title,
          episodeNumber: latestEpisode.episode_number,
          publishedDate: latestEpisode.published_date,
          artwork: latestEpisode.episode_art || episodesData.show?.artwork_url,
          duration: latestEpisode.duration,
          isNew,
        } : null,
        listenUrl,
        totalEpisodes: episodes.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-podcast-episodes:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
