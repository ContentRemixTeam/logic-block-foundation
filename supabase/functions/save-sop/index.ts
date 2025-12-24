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

    console.log('[save-sop] Called');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const body = await req.json();
    const {
      sop_id,
      sop_name,
      description,
      checklist_items,
      links,
      notes,
    } = body;

    if (!sop_name || sop_name.trim() === '') {
      throw new Error('SOP name is required');
    }

    console.log('[save-sop] Saving SOP for user:', user.id, 'sop_id:', sop_id || 'new');

    if (sop_id) {
      // Update existing SOP
      const { data: sop, error: updateError } = await supabase
        .from('sops')
        .update({
          sop_name: sop_name.trim(),
          description: description?.trim() || null,
          checklist_items: checklist_items || [],
          links: links || [],
          notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('sop_id', sop_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('[save-sop] Error updating SOP:', updateError);
        throw new Error('Failed to update SOP');
      }

      console.log('[save-sop] SOP updated successfully:', sop_id);

      return new Response(
        JSON.stringify({ sop }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create new SOP
      const { data: sop, error: insertError } = await supabase
        .from('sops')
        .insert({
          user_id: user.id,
          sop_name: sop_name.trim(),
          description: description?.trim() || null,
          checklist_items: checklist_items || [],
          links: links || [],
          notes: notes?.trim() || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[save-sop] Error inserting SOP:', insertError);
        throw new Error('Failed to create SOP');
      }

      console.log('[save-sop] SOP created successfully:', sop.sop_id);

      return new Response(
        JSON.stringify({ sop }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('[save-sop] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
