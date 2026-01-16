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

    // Parse pagination params from URL or body
    const url = new URL(req.url);
    let limit = parseInt(url.searchParams.get('limit') || '0', 10);
    let offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Also check request body for POST requests
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.limit) limit = parseInt(body.limit, 10);
        if (body.offset) offset = parseInt(body.offset, 10);
      } catch {
        // No body or invalid JSON, use URL params
      }
    }

    // If no limit specified, return all (backwards compatible)
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

    // Build query with pagination
    let query = supabase
      .from('tasks')
      .select(`
        *,
        sop:sops(sop_id, sop_name, description, checklist_items, links, notes),
        project:projects(id, name, color)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

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
