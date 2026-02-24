import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate token by getting user with anon key client
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('[get-ideas] Invalid token:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for pagination and search
    let limit = 0;
    let offset = 0;
    let search = '';
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        limit = parseInt(body.limit || '0', 10);
        offset = parseInt(body.offset || '0', 10);
        search = (body.search || '').trim();
      } catch {
        // fallback to query params
      }
    }
    
    if (!limit) {
      const url = new URL(req.url);
      limit = parseInt(url.searchParams.get('limit') || '0', 10);
      offset = parseInt(url.searchParams.get('offset') || '0', 10);
    }
    
    const isPaginated = limit > 0;

    console.log('[get-ideas] Fetching ideas for user:', userId, { limit, offset, isPaginated, search });

    // Fetch categories (always return all)
    const { data: categories, error: categoriesError } = await supabase
      .from('ideas_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error('[get-ideas] Error fetching categories:', categoriesError);
      throw categoriesError;
    }

    // Get total count of ideas (with search filter if provided)
    let countQuery = supabase
      .from('ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (search) {
      countQuery = countQuery.ilike('content', `%${search}%`);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('[get-ideas] Error counting ideas:', countError);
      throw countError;
    }

    // Fetch ideas with optional pagination and search
    let ideasQuery = supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (search) {
      ideasQuery = ideasQuery.ilike('content', `%${search}%`);
    }

    if (isPaginated) {
      ideasQuery = ideasQuery.range(offset, offset + limit - 1);
    }

    const { data: ideas, error: ideasError } = await ideasQuery;

    if (ideasError) {
      console.error('[get-ideas] Error fetching ideas:', ideasError);
      throw ideasError;
    }

    const fetchedCount = ideas?.length || 0;
    const hasMore = isPaginated ? (offset + fetchedCount) < (totalCount || 0) : false;

    console.log('[get-ideas] Successfully fetched:', {
      categoriesCount: categories?.length || 0,
      ideasCount: fetchedCount,
      totalCount,
      hasMore,
    });

    return new Response(
      JSON.stringify({
        categories: categories || [],
        ideas: ideas || [],
        totalCount: totalCount || 0,
        hasMore,
        offset,
        limit: isPaginated ? limit : (totalCount || 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[get-ideas] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
