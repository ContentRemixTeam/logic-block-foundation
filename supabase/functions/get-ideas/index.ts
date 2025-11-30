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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('[get-ideas] Fetching ideas for user:', user.id);

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('ideas_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error('[get-ideas] Error fetching categories:', categoriesError);
      throw categoriesError;
    }

    // Fetch ideas
    const { data: ideas, error: ideasError } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ideasError) {
      console.error('[get-ideas] Error fetching ideas:', ideasError);
      throw ideasError;
    }

    console.log('[get-ideas] Successfully fetched:', {
      categoriesCount: categories?.length || 0,
      ideasCount: ideas?.length || 0,
    });

    return new Response(
      JSON.stringify({
        categories: categories || [],
        ideas: ideas || [],
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
