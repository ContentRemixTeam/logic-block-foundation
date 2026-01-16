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
    console.error('[cleanup-mindset-data] JWT validation failed:', error);
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

    console.log('[cleanup-mindset-data] Starting cleanup for user:', userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const summary = {
      deleted_categories: 0,
      deleted_thoughts: 0,
      remapped_thoughts: 0,
      cleaned_category_names: 0,
      cleaned_thoughts: 0,
      merged_duplicates: 0,
    };

    // Step 1: Delete empty/null categories
    const { data: emptyCategories } = await supabase
      .from('mindset_categories')
      .select('id')
      .eq('user_id', userId)
      .or('name.is.null,name.eq.');

    if (emptyCategories && emptyCategories.length > 0) {
      const emptyIds = emptyCategories.map((c: any) => c.id);
      
      // Delete orphaned thoughts first
      await supabase
        .from('useful_thoughts')
        .delete()
        .eq('user_id', userId)
        .in('category_id', emptyIds);

      // Delete empty categories
      const { error: deleteError } = await supabase
        .from('mindset_categories')
        .delete()
        .eq('user_id', userId)
        .in('id', emptyIds);

      if (!deleteError) {
        summary.deleted_categories += emptyCategories.length;
        console.log('[cleanup-mindset-data] Deleted empty categories:', emptyCategories.length);
      }
    }

    // Step 2: Fetch remaining categories to find duplicates
    const { data: allCategories } = await supabase
      .from('mindset_categories')
      .select('*')
      .eq('user_id', userId);

    if (allCategories && allCategories.length > 0) {
      // Group by lowercase name
      const categoryGroups = new Map<string, any[]>();
      allCategories.forEach((cat: any) => {
        if (!cat.name) return;
        const lowerName = cat.name.toLowerCase().trim();
        if (!categoryGroups.has(lowerName)) {
          categoryGroups.set(lowerName, []);
        }
        categoryGroups.get(lowerName)!.push(cat);
      });

      // Merge duplicates
      for (const [_, cats] of categoryGroups.entries()) {
        if (cats.length > 1) {
          // Keep the first one (oldest), delete others
          const keepId = cats[0].id;
          const deleteIds = cats.slice(1).map((c: any) => c.id);

          // Remap thoughts to the kept category
          const { data: remappedThoughts } = await supabase
            .from('useful_thoughts')
            .update({ category_id: keepId })
            .eq('user_id', userId)
            .in('category_id', deleteIds)
            .select('id');

          if (remappedThoughts) {
            summary.remapped_thoughts += remappedThoughts.length;
          }

          // Delete duplicate categories
          await supabase
            .from('mindset_categories')
            .delete()
            .eq('user_id', userId)
            .in('id', deleteIds);

          summary.merged_duplicates += deleteIds.length;
          console.log('[cleanup-mindset-data] Merged duplicates:', cats.length, '→ 1');
        }
      }

      // Trim whitespace in category names
      for (const cat of allCategories) {
        if (cat.name && cat.name !== cat.name.trim()) {
          await supabase
            .from('mindset_categories')
            .update({ name: cat.name.trim() })
            .eq('id', cat.id);
          summary.cleaned_category_names++;
        }
      }
    }

    // Step 3: Delete empty thoughts
    const { data: emptyThoughts } = await supabase
      .from('useful_thoughts')
      .delete()
      .eq('user_id', userId)
      .or('text.is.null,text.eq.')
      .select('id');

    if (emptyThoughts) {
      summary.deleted_thoughts += emptyThoughts.length;
      console.log('[cleanup-mindset-data] Deleted empty thoughts:', emptyThoughts.length);
    }

    // Step 4: Delete orphaned thoughts (category_id doesn't exist)
    const { data: validCategories } = await supabase
      .from('mindset_categories')
      .select('id')
      .eq('user_id', userId);

    const validCategoryIds = (validCategories || []).map((c: any) => c.id);

    const { data: allThoughts } = await supabase
      .from('useful_thoughts')
      .select('*')
      .eq('user_id', userId)
      .not('category_id', 'is', null);

    if (allThoughts) {
      const orphanedIds = allThoughts
        .filter((t: any) => !validCategoryIds.includes(t.category_id))
        .map((t: any) => t.id);

      if (orphanedIds.length > 0) {
        await supabase
          .from('useful_thoughts')
          .delete()
          .eq('user_id', userId)
          .in('id', orphanedIds);

        summary.deleted_thoughts += orphanedIds.length;
        console.log('[cleanup-mindset-data] Deleted orphaned thoughts:', orphanedIds.length);
      }
    }

    // Step 5: Trim whitespace in thoughts
    const { data: thoughtsToClean } = await supabase
      .from('useful_thoughts')
      .select('*')
      .eq('user_id', userId);

    if (thoughtsToClean) {
      for (const thought of thoughtsToClean) {
        if (thought.text && thought.text !== thought.text.trim()) {
          await supabase
            .from('useful_thoughts')
            .update({ text: thought.text.trim() })
            .eq('id', thought.id);
          summary.cleaned_thoughts++;
        }
      }
    }

    console.log('[cleanup-mindset-data] Cleanup complete:', summary);

    return new Response(
      JSON.stringify({ ok: true, ...summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[cleanup-mindset-data] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
