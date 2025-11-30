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

    const { id, name, color } = await req.json();

    console.log('[save-category] Saving category for user:', user.id, { id, name, color });

    if (id) {
      // Update existing category
      const { data, error } = await supabase
        .from('ideas_categories')
        .update({ name, color })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[save-category] Error updating category:', error);
        throw error;
      }

      console.log('[save-category] Successfully updated category:', id);
      return new Response(
        JSON.stringify({ category: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Insert new category
      const { data, error } = await supabase
        .from('ideas_categories')
        .insert({
          user_id: user.id,
          name,
          color: color || '#3A3A3A',
        })
        .select()
        .single();

      if (error) {
        console.error('[save-category] Error inserting category:', error);
        throw error;
      }

      console.log('[save-category] Successfully created category:', data.id);
      return new Response(
        JSON.stringify({ category: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('[save-category] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
