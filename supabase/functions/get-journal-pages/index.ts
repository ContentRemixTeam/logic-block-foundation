import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAuthenticatedUserId(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await authClient.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('[get-journal-pages] JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    
    if (authError || !userId) {
      return new Response(JSON.stringify({ error: authError || 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const projectId = url.searchParams.get('project_id');
    const tag = url.searchParams.get('tag');
    
    // Pagination params
    let limit = parseInt(url.searchParams.get('limit') || '0', 10);
    let offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const isPaginated = limit > 0;

    // Build count query
    let countQuery = supabase
      .from('journal_pages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!includeArchived) {
      countQuery = countQuery.eq('is_archived', false);
    }

    if (projectId) {
      countQuery = countQuery.eq('project_id', projectId);
    }

    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting journal pages:', countError);
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build main query
    let query = supabase
      .from('journal_pages')
      .select(`
        *,
        project:projects(id, name, color)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (isPaginated) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching journal pages:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter by tag if specified (tags are stored as JSON array)
    let filteredData = data || [];
    if (tag) {
      filteredData = filteredData.filter(page => {
        const pageTags = Array.isArray(page.tags) ? page.tags : [];
        return pageTags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
      });
    }

    // Get all unique tags across ALL pages for the filter UI (not just current page)
    const { data: allPagesForTags } = await supabase
      .from('journal_pages')
      .select('tags')
      .eq('user_id', userId)
      .eq('is_archived', false);

    const allTags: string[] = [];
    (allPagesForTags || []).forEach(page => {
      const pageTags = Array.isArray(page.tags) ? page.tags : [];
      pageTags.forEach((t: string) => {
        if (!allTags.includes(t)) {
          allTags.push(t);
        }
      });
    });

    const fetchedCount = filteredData.length;
    const hasMore = isPaginated ? (offset + fetchedCount) < (totalCount || 0) : false;

    return new Response(JSON.stringify({ 
      pages: filteredData,
      allTags: allTags.sort(),
      totalCount: totalCount || 0,
      hasMore,
      offset,
      limit: isPaginated ? limit : (totalCount || 0),
    }), {
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
