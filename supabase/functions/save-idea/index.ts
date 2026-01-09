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

    const { id, content, category_id } = await req.json();

    // Input validation
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Content cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trimmedContent.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Content must be less than 10000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-idea] Saving idea for user:', user.id, { id, contentLength: trimmedContent.length, category_id });

    if (id) {
      // Update existing idea
      const { data, error } = await supabase
        .from('ideas')
        .update({
          content: trimmedContent,
          category_id: category_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[save-idea] Error updating idea:', error);
        throw error;
      }

      console.log('[save-idea] Successfully updated idea:', id);
      return new Response(
        JSON.stringify({ idea: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Insert new idea
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          user_id: user.id,
          content: trimmedContent,
          category_id: category_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[save-idea] Error inserting idea:', error);
        throw error;
      }

      console.log('[save-idea] Successfully created idea:', data.id);
      return new Response(
        JSON.stringify({ idea: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('[save-idea] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
