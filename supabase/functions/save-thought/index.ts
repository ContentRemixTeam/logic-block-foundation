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

    const { id, text, category_id } = await req.json();

    // Input validation
    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Thought text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Thought text must be less than 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;

    if (id) {
      // Update existing thought
      const { data, error } = await supabase
        .from('useful_thoughts')
        .update({
          text: trimmedText,
          category_id: category_id || null,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new thought
      const { data, error } = await supabase
        .from('useful_thoughts')
        .insert({
          user_id: userId,
          text: trimmedText,
          category_id: category_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in save-thought:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});