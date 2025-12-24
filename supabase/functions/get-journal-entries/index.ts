import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode JWT to get user ID
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
  console.log('EDGE FUNC: get-journal-entries called');

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching journal entries for user:', userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse query params
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('daily_plans')
      .select('day_id, date, scratch_pad_content, scratch_pad_title, scratch_pad_processed_at, thought, feeling, top_3_today, created_at, updated_at')
      .eq('user_id', userId)
      .not('scratch_pad_content', 'is', null)
      .neq('scratch_pad_content', '')
      .order('date', { ascending: false });

    // If specific date requested
    if (date) {
      query = query.eq('date', date);
    }

    // If search term provided - search in both content and title
    if (search) {
      query = query.or(`scratch_pad_content.ilike.%${search}%,scratch_pad_title.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: entries, error } = await query;

    if (error) {
      console.error('Error fetching journal entries:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also get all dates with entries for calendar highlighting
    const { data: allDates, error: datesError } = await supabase
      .from('daily_plans')
      .select('date')
      .eq('user_id', userId)
      .not('scratch_pad_content', 'is', null)
      .neq('scratch_pad_content', '')
      .order('date', { ascending: false });

    if (datesError) {
      console.error('Error fetching dates:', datesError);
    }

    const datesWithEntries = (allDates || []).map((d: { date: string }) => d.date);

    console.log(`Found ${entries?.length || 0} journal entries`);

    return new Response(JSON.stringify({ 
      data: entries || [],
      datesWithEntries,
      total: datesWithEntries.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
