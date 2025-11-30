import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserIdFromJWT(authHeader: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.substring(7);
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.sub;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const userId = getUserIdFromJWT(authHeader || '');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('mindset_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw categoriesError;
    }

    // Get thoughts with category info
    const { data: thoughts, error: thoughtsError } = await supabase
      .from('useful_thoughts')
      .select(`
        id,
        text,
        category_id,
        is_favorite,
        created_at,
        mindset_categories (
          id,
          name,
          color
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (thoughtsError) {
      console.error('Error fetching thoughts:', thoughtsError);
      throw thoughtsError;
    }

    return new Response(
      JSON.stringify({
        categories: categories || [],
        thoughts: thoughts || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-thoughts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});