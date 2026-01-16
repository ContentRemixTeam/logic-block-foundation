import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

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
    console.error('[debug-mindset-data] JWT validation failed:', error);
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
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[debug-mindset-data] Starting debug for user:', userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all categories
    const { data: ideasCategories, error: catError } = await supabase
      .from('ideas_categories')
      .select('*')
      .eq('user_id', userId);

    if (catError) {
      console.error('[debug-mindset-data] Error fetching ideas_categories:', catError);
    }

    // Fetch all mindset categories
    const { data: mindsetCategories, error: mindsetCatError } = await supabase
      .from('mindset_categories')
      .select('*')
      .eq('user_id', userId);

    if (mindsetCatError) {
      console.error('[debug-mindset-data] Error fetching mindset_categories:', mindsetCatError);
    }

    // Fetch all useful thoughts
    const { data: usefulThoughts, error: thoughtsError } = await supabase
      .from('useful_thoughts')
      .select('*')
      .eq('user_id', userId);

    if (thoughtsError) {
      console.error('[debug-mindset-data] Error fetching useful_thoughts:', thoughtsError);
    }

    // Fetch thoughts with categories joined
    const { data: thoughtsWithCategories, error: joinError } = await supabase
      .from('useful_thoughts')
      .select('*, mindset_categories(*)')
      .eq('user_id', userId);

    if (joinError) {
      console.error('[debug-mindset-data] Error fetching joined data:', joinError);
    }

    // Identify problematic rows
    const nullOrEmptyCategories = (mindsetCategories || []).filter(
      (c: any) => !c.name || c.name.trim() === ''
    );

    const nullOrEmptyThoughts = (usefulThoughts || []).filter(
      (t: any) => !t.text || t.text.trim() === ''
    );

    const orphanedThoughts = (usefulThoughts || []).filter((t: any) => {
      if (!t.category_id) return false;
      return !(mindsetCategories || []).some((c: any) => c.id === t.category_id);
    });

    // Find duplicate categories (case-insensitive)
    const categoryNames = new Map<string, any[]>();
    (mindsetCategories || []).forEach((cat: any) => {
      if (!cat.name) return;
      const lowerName = cat.name.toLowerCase().trim();
      if (!categoryNames.has(lowerName)) {
        categoryNames.set(lowerName, []);
      }
      categoryNames.get(lowerName)!.push(cat);
    });

    const duplicates = Array.from(categoryNames.entries())
      .filter(([_, cats]) => cats.length > 1)
      .map(([name, cats]) => ({ name, categories: cats }));

    const result = {
      ok: true,
      data: {
        ideas_categories: ideasCategories || [],
        mindset_categories: mindsetCategories || [],
        useful_thoughts: usefulThoughts || [],
        thoughts_with_categories: thoughtsWithCategories || [],
        issues: {
          null_or_empty_categories: nullOrEmptyCategories,
          null_or_empty_thoughts: nullOrEmptyThoughts,
          orphaned_thoughts: orphanedThoughts,
          duplicate_categories: duplicates,
        },
        summary: {
          total_mindset_categories: (mindsetCategories || []).length,
          total_ideas_categories: (ideasCategories || []).length,
          total_useful_thoughts: (usefulThoughts || []).length,
          issues_found: {
            empty_categories: nullOrEmptyCategories.length,
            empty_thoughts: nullOrEmptyThoughts.length,
            orphaned_thoughts: orphanedThoughts.length,
            duplicate_sets: duplicates.length,
          },
        },
      },
    };

    console.log('[debug-mindset-data] Summary:', result.data.summary);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[debug-mindset-data] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
