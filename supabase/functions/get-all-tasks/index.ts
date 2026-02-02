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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    let limit = parseInt(url.searchParams.get('limit') || '0', 10);
    let offset = parseInt(url.searchParams.get('offset') || '0', 10);
    let dateFrom: string | null = url.searchParams.get('date_from');
    let dateTo: string | null = url.searchParams.get('date_to');
    let includeIncomplete = url.searchParams.get('include_incomplete') === 'true';
    let loadAll = url.searchParams.get('load_all') === 'true';

    // Also check request body for POST requests
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.limit) limit = parseInt(body.limit, 10);
        if (body.offset) offset = parseInt(body.offset, 10);
        if (body.date_from) dateFrom = body.date_from;
        if (body.date_to) dateTo = body.date_to;
        if (body.include_incomplete !== undefined) includeIncomplete = body.include_incomplete;
        if (body.load_all !== undefined) loadAll = body.load_all;
      } catch {
        // No body or invalid JSON, use URL params
      }
    }

    // Smart filtering mode: last 90 days + incomplete if no explicit params
    const useSmartFilter = !loadAll && !dateFrom && !dateTo && limit === 0;
    
    // Calculate smart filter dates
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const smartDateFrom = ninetyDaysAgo.toISOString().split('T')[0];

    // If no limit specified, return all (backwards compatible) or use smart limit
    const isPaginated = limit > 0;

    // First, get total count
    const { count, error: countError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting tasks:', countError);
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalCount = count || 0;

    // Build query with pagination and filtering
    let query = supabase
      .from('tasks')
      .select(`
        *,
        sop:sops(sop_id, sop_name, description, checklist_items, links, notes),
        project:projects(id, name, color, is_launch, launch_start_date, launch_end_date)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null); // Exclude soft-deleted tasks

    // Apply smart filtering: get tasks from last 90 days + all incomplete tasks
    if (useSmartFilter) {
      // Use OR: (created recently) OR (not completed)
      query = query.or(`created_at.gte.${smartDateFrom},is_completed.eq.false`);
    } else if (dateFrom || dateTo) {
      // Apply explicit date filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
      if (includeIncomplete) {
        // This is more complex - we'd need to restructure
        // For now, just apply the date filter
      }
    }

    query = query.order('created_at', { ascending: false });

    if (isPaginated) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fetchedCount = tasks?.length || 0;
    const hasMore = isPaginated ? (offset + fetchedCount) < totalCount : false;

    return new Response(JSON.stringify({ 
      data: tasks || [],
      totalCount,
      hasMore,
      offset,
      limit: isPaginated ? limit : totalCount,
      useSmartFilter,
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
