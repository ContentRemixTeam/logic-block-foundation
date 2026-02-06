import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== SECURE AUTH HELPER ====================

async function getAuthenticatedUserId(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create a client with anon key to validate the JWT
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  // Validate the JWT and get claims
  const { data, error } = await authClient.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  const userId = data.claims.sub;
  if (!userId) {
    return { userId: null, error: 'No user ID in token' };
  }

  return { userId, error: null };
}

// Pagination defaults
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // SECURE: Validate JWT with Supabase Auth
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    if (authError || !userId) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ error: authError || 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse pagination and filter params from URL or body
    const url = new URL(req.url);
    let pageSize = parseInt(url.searchParams.get('page_size') || '0', 10);
    let cursor: string | null = url.searchParams.get('cursor');
    let loadAll = url.searchParams.get('load_all') === 'true';
    let filters: { status?: string; project_id?: string; section_id?: string } = {};

    // Also check request body for POST requests
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.page_size) pageSize = parseInt(body.page_size, 10);
        if (body.cursor) cursor = body.cursor;
        if (body.load_all !== undefined) loadAll = body.load_all;
        if (body.filters) filters = body.filters;
        // Legacy support for 'limit' parameter
        if (body.limit && !body.page_size) pageSize = parseInt(body.limit, 10);
      } catch {
        // No body or invalid JSON, use URL params
      }
    }

    // Enforce page size limits
    if (pageSize <= 0) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    // Smart filtering mode: last 90 days + incomplete if load_all is false
    const useSmartFilter = !loadAll;
    
    // Calculate smart filter dates
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const smartDateFrom = ninetyDaysAgo.toISOString().split('T')[0];

    // First, get total count for the filtered query
    let countQuery = supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    // Apply smart filtering to count query too
    if (useSmartFilter) {
      countQuery = countQuery.or(`created_at.gte.${smartDateFrom},is_completed.eq.false`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting tasks:', countError);
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalCount = count || 0;

    // Build main query with cursor-based pagination
    let query = supabase
      .from('tasks')
      .select(`
        *,
        sop:sops(sop_id, sop_name, description, checklist_items, links, notes),
        project:projects!fk_tasks_project(id, name, color, is_launch, launch_start_date, launch_end_date)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null); // Exclude soft-deleted tasks

    // Apply smart filtering: get tasks from last 90 days + all incomplete tasks
    if (useSmartFilter) {
      query = query.or(`created_at.gte.${smartDateFrom},is_completed.eq.false`);
    }

    // Apply optional filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.section_id) {
      query = query.eq('section_id', filters.section_id);
    }

    // Cursor-based pagination: fetch tasks with created_at < cursor
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Order by created_at descending (newest first) for consistent cursor pagination
    query = query.order('created_at', { ascending: false });

    // Limit to page_size
    query = query.limit(pageSize);

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fetchedCount = tasks?.length || 0;
    
    // hasMore = we fetched exactly pageSize items (more might exist)
    const hasMore = fetchedCount === pageSize;
    
    // nextCursor = created_at of the last task if there are more
    const nextCursor = hasMore && tasks && tasks.length > 0 
      ? tasks[tasks.length - 1].created_at 
      : null;

    // Calculate query time and log performance
    const queryTime = Date.now() - startTime;
    console.log(`[get-all-tasks] Query completed in ${queryTime}ms`, {
      userId,
      pageSize,
      resultCount: fetchedCount,
      hasMore,
      cursor: cursor ? 'set' : 'none',
    });

    // Warn if query is slow
    if (queryTime > 1000) {
      console.warn(`[get-all-tasks] SLOW QUERY: ${queryTime}ms`);
    }

    return new Response(JSON.stringify({ 
      data: tasks || [],
      metadata: {
        count: fetchedCount,
        totalCount,
        hasMore,
        nextCursor,
        pageSize,
        filters,
        useSmartFilter,
        queryTime, // Include for client-side monitoring
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error('Unexpected error:', error, `(after ${queryTime}ms)`);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
